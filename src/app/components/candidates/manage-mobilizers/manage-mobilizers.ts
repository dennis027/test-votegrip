import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID, ViewChild, OnInit, AfterViewInit, TemplateRef } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { UsersService } from '../../../services/users';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MobilizersService } from '../../../services/candidates/mobilizers-service';
import { AuthService } from '../../../services/auth/auth';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';


export interface mobilizersBody {
  name: string;
  phone: string; // Changed to string to handle leading zeros (e.g., 0711...)
  action?: number;
}

@Component({
  selector: 'app-manage-mobilizers',
  standalone: true,
  imports: [
    CommonModule, 
    MatTableModule, 
    MatPaginatorModule, 
    MatButtonModule, 
    ReactiveFormsModule,
    MatDialogModule
  ],
  templateUrl: './manage-mobilizers.html',
  styleUrl: './manage-mobilizers.css',
})
export class ManageMobilizers implements OnInit, AfterViewInit {
userForm!: FormGroup;
  candidateId: any;
  isEditing = false;
  currentMobilizerId: number | null = null;
  
  displayedColumns: string[] = ['name', 'phone', 'actions'];
  dataSource = new MatTableDataSource<mobilizersBody>([]);

  private route = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private snackBar = inject(MatSnackBar);
  private mobilizersService = inject(MobilizersService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog)

  @ViewChild(MatPaginator) paginator!: MatPaginator;

   @ViewChild('deleteMobilizerDail') deleteMobilizerDail!: TemplateRef<any>;
   @ViewChild('addUpdateMobilizers') addUpdateMobilizers!: TemplateRef<any>;

  ngOnInit() {
    this.initForm();
    if (isPlatformBrowser(this.platformId)) {
      this.getProfile();
    }
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  initForm() {
    this.userForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      phone: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]]
    });
  }

  getProfile() {
    this.authService.getProfile().subscribe({
      next: (profile: any) => {
        this.candidateId = profile?.data.id;
        this.getMobilizers();
      },
      error: () => {
        this.showError('Session expired. Please login again.');
        this.route.navigate(['/login']);
      }
    });
  }

  getMobilizers() {
    this.mobilizersService.getMobilizersList().subscribe({
      next: (response) => {
        this.dataSource.data = response.data;
      },
      error: () => this.showError('Failed to load mobilizers.')
    });
  }

addUpdateDialC() {
    let dialogRef = this.dialog.open(this.addUpdateMobilizers,{
      width: '400px',
      panelClass: 'custom-dialog-container',
    });
    dialogRef.afterClosed().subscribe(result => {
        // Note: If the user clicks outside the dialog or presses the escape key, there'll be no result
        if (result !== undefined) {
            if (result === 'yes') {
             
            } else if (result === 'no') {
         
            }
        }
    })
}


  // Handle both Add and Update

  onSubmit() {
  if (this.userForm.invalid) {
    this.userForm.markAllAsTouched();
    return;
  }

  const payload = { ...this.userForm.value, candidate: this.candidateId };

  const handleResponse = {
    next: () => {
      this.showSuccess(this.isEditing ? 'Updated!' : 'Added!');
      this.getMobilizers();
      this.dialog.closeAll();
      this.resetFormState();
    },
    error: (err: any) => {
      // 1. Check if the error matches the structure you provided
      const backendErrors = err.error?.errors;

      if (backendErrors) {
        // 2. Loop through fields (e.g., 'phone')
        Object.keys(backendErrors).forEach((key) => {
          const formControl = this.userForm.get(key);
          if (formControl) {
            // 3. Pass the actual message string from the array to the form control
            formControl.setErrors({ serverError: backendErrors[key][0] });
          }
        });
      } else {
        this.showError(err.error?.message || 'An unexpected error occurred.');
      }
    }
  };

  if (this.isEditing && this.currentMobilizerId) {
    this.mobilizersService.updateMobilizer(this.currentMobilizerId, payload).subscribe(handleResponse);
  } else {
    this.mobilizersService.addMobilizerApi(payload).subscribe(handleResponse);
  }
}


  onEdit(mobilizer: any) {
    this.isEditing = true;
    console.log('Editing mobilizer:', mobilizer);
    this.currentMobilizerId = mobilizer.id || null;
    // Populate form with existing data
    this.userForm.patchValue({
      name: mobilizer.name,
      phone: mobilizer.phone
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onDelete(id: number) {
     let dialogRef = this.dialog.open(this.deleteMobilizerDail);
        dialogRef.afterClosed().subscribe(result => {
            // Note: If the user clicks outside the dialog or presses the escape key, there'll be no result
            if (result !== undefined) {
                if (result === 'yes') {
                  this.mobilizersService.deleteMobilizer(id).subscribe({
                    next: () => {
                      this.showSuccess('Deleted successfully');
                      this.getMobilizers();
                    },
                   
                  });
                } else if (result === 'no') {
                   error: () => this.showError('Delete failed.')
                }
            }
        })
  }

  resetFormState() {
    this.isEditing = false;
    this.currentMobilizerId = null;
    this.userForm.reset();
  }

  showSuccess(msg: string) {
    this.snackBar.open(msg, 'OK', { duration: 3000, panelClass: ['success-snackbar'] });
  }

  showError(msg: string) {
    this.snackBar.open(msg, 'Close', { duration: 4000, panelClass: ['error-snackbar'] });
  }
}