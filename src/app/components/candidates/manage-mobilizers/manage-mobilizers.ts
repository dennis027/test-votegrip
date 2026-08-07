import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID, ViewChild, OnInit, AfterViewInit, TemplateRef } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { UsersService } from '../../../services/users';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MobilizersService } from '../../../services/candidates/mobilizers-service';
import { AuthService } from '../../../services/auth/auth';
import { MatButtonModule, MatIconButton } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';


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
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatIconModule
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

  closeDialog(): void {
    this.dialog.closeAll();
  }

   @ViewChild('deleteMobilizerDail') deleteMobilizerDail!: TemplateRef<any>;
   @ViewChild('addUpdateMobilizers') addUpdateMobilizers!: TemplateRef<any>;

  ngOnInit() {
    this.initForm();
    if (isPlatformBrowser(this.platformId)) {
      this.getProfile();
      

    }
    // configure filtering to allow searching by name or phone
    this.dataSource.filterPredicate = (data: mobilizersBody, filter: string) => {
      const f = filter.trim().toLowerCase();
      const name = (data.name || '').toString().toLowerCase();
      const phone = (data.phone || '').toString().toLowerCase();
      return name.includes(f) || phone.includes(f);
    };

    setTimeout(() => {
      this.dataSource.paginator = this.paginator;
    },500);
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  applyFilter(value: string) {
    const filterValue = (value || '').trim().toLowerCase();
    this.dataSource.filter = filterValue;
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
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
        this.route.navigate(['login']);
      }
    });
  }

  getMobilizers() {
    this.mobilizersService.getMobilizersList().subscribe({
      next: (response: any) => {
        // Change 'response.data' to 'response.results'
        this.dataSource.data = response.results || []; 
      },
      error: () => this.showError('Failed to load mobilizers.')
    });
  }

  
addUpdateDialC() {
    let dialogRef = this.dialog.open(this.addUpdateMobilizers,{
      minWidth: '400px',
      panelClass: 'custom-dialog-container',
    });
    dialogRef.afterClosed().subscribe(result => {
      this.isEditing =false
      this.userForm.reset()
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
      this.showSuccess(this.isEditing ? 'Updated Successfully!' : 'Added Successfully!');
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