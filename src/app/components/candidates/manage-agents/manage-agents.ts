import { Component, OnInit, inject, signal, ViewChild, PLATFORM_ID, TemplateRef, DestroyRef, HostBinding } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

// Material
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';


// Services & RxJS
import { UsersService } from '../../../services/users';
import { AgentsService } from '../../../services/candidates/agents-service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AuthService } from '../../../services/auth/auth';

export interface Candidate {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  is_verified: boolean;
}
@Component({
  selector: 'app-manage-agents',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatSnackBarModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './manage-agents.html',
  styleUrl: './manage-agents.css',
})
export class ManageAgents implements OnInit {
  // --- HYDRATION FIX ---
  // This prevents NG0500 by telling Angular this specific component 
  // should use traditional rendering instead of hydration.
  @HostBinding('attr.ngSkipHydration') skipHydration = true;

  // Services
  private route = inject(Router);
  private userService = inject(UsersService);
  private manageAgents = inject(AgentsService);
  private platformId = inject(PLATFORM_ID);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);
  private authService = inject(AuthService);

  agentId:any

  // Signals
  isLoading = signal(false);
  isSubmitting = signal(false); // Renamed from 'loading' for clarity
  activeDialog: MatDialogRef<any> | null = null;

  // Table Data
  displayedColumns: string[] = ['first_name', 'last_name', 'email', 'phone', 'actions'];
  dataSource = new MatTableDataSource<Candidate>([]);
  
  @ViewChild(MatPaginator) set paginator(content: MatPaginator) {
    if (content) {
      this.dataSource.paginator = content;
    }
  }

  @ViewChild('addAgentTemp') addAgentTemp!: TemplateRef<any>;

  form: FormGroup = this.fb.group({
    first_name: ['', [Validators.required]],
    last_name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{9,15}$/)]],
  });

  ngOnInit() {
    // Ensure we only fetch data on the browser to keep SSR lightweight
    if (isPlatformBrowser(this.platformId)) {
      this.loadCandidates();
        this.getProfile()
    }
    // Configure filter to search by full name or phone
    this.dataSource.filterPredicate = (data: Candidate, filter: string) => {
      const f = filter.trim().toLowerCase();
      const name = ((data.first_name || '') + ' ' + (data.last_name || '')).toLowerCase();
      const phone = (data.phone || '').toString().toLowerCase();
      return name.includes(f) || phone.includes(f);
    };
  }

  applyFilter(value: string) {
    const filterValue = (value || '').trim().toLowerCase();
    this.dataSource.filter = filterValue;
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  getProfile() {
    this.authService.getProfile().subscribe({
      next: (profile: any) => {
        this.agentId = profile?.data.id;
        console.log('Profile loaded, agent ID:', this.agentId);
        this. getUserAgents()
      },
      error: () => {
        this.showError('Failed to load profile information. Please login again.');
        this.route.navigate(['login']);
      }
    });
  }

  loadCandidates() {
    this.isLoading.set(true);
    

  }
getUserAgents() {
  this.isLoading.set(true);
  
  this.userService.getUsersList('agent', this.agentId)
    .pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.isLoading.set(false))
    )
    .subscribe({
      next: (response: any) => {
        const candidates = Array.isArray(response) ? response : (response.data || []);
        this.dataSource.data = candidates;
        console.log('Agents loaded:', this.dataSource.data);
      },
      error: (error) => {
        // 1. Check for the nested backend error message
        const backendErrors = error.error?.errors;
        let displayMessage = 'Failed to load candidates.';

        if (backendErrors && backendErrors.email) {
          // Extract: "An agent with this email already exists..."
          displayMessage = backendErrors.email[0];
        } else if (error.error?.message) {
          displayMessage = error.error.message;
        }

        this.showError(displayMessage);

        if (error.status === 401) this.route.navigate(['login']);
      }
    });
}

  openAddAgentDialog() {
    this.form.reset();
    this.activeDialog = this.dialog.open(this.addAgentTemp, {
      width: '520px',
      disableClose: true // Prevents accidental closing during submit
    });
  }

  closeDialog() {
    this.activeDialog?.close();
  }

addAgent() {
  if (this.form.invalid) {
    this.form.markAllAsTouched();
    return;
  }

  this.isSubmitting.set(true);

  this.manageAgents.addAgentApi(this.form.value)
    .pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.isSubmitting.set(false))
    )
    .subscribe({
      next: () => {
        this.showSuccess('Agent added successfully.');
        this.closeDialog();
        this.loadCandidates();
      },
      error: (err) => {
        const backendErrors = err?.error?.errors;

        if (backendErrors) {
          // Dynamic mapping: handles 'phone', 'email', etc.
          Object.keys(backendErrors).forEach((key) => {
            const control = this.form.get(key);
            if (control) {
              // Sets the specific message: "A user with this phone number already exists."
              control.setErrors({ serverError: backendErrors[key][0] });
            }
          });
        } else {
          this.showError(err?.error?.message || 'Failed to add agent.');
        }
      }
    });
}


  showSuccess(message: string) {
    this.snackBar.open(message, 'Close', { 
      duration: 3000, 
      panelClass: ['success-snackbar'],
      horizontalPosition: 'right', 
      verticalPosition: 'top' 
    });
  }

  showError(message: string) {
    this.snackBar.open(message, 'Close', { 
      duration: 4000, 
      panelClass: ['error-snackbar'],
      horizontalPosition: 'right', 
      verticalPosition: 'top' 
    });
  }




}