import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID, ViewChild, OnInit, AfterViewInit, TemplateRef } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../services/auth/auth';
import { FieldIntelService, FieldIntelBody } from '../../../services/candidates/field-intel-service';

@Component({
  selector: 'app-field-intel',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatIconModule,
  ],
  templateUrl: './field-intel.html',
  styleUrl: './field-intel.css',
})
export class FieldIntel implements OnInit, AfterViewInit {
  userForm!: FormGroup;
  candidateId: any;
  editingCandidateId: any = null;
  isEditing = false;
  currentIntelId: string | null = null;

  // Adjust these to match your backend's actual choice values
  classifications = [
    { value: 'stronghold', label: 'Stronghold' },
    { value: 'swing_area', label: 'Swing Area' },
    { value: 'opposition', label: 'Opposition' },
    { value: 'contested', label: 'Contested' },
  ];

  riskLevels = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
  ];

  displayedColumns: string[] = [
    'polling_station',
    'classification_display',
    'risk_level_display',
    'notes',
    'is_active',
    'created_at',
    'actions',
  ];
  dataSource = new MatTableDataSource<FieldIntelBody>([]);

  private route = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private snackBar = inject(MatSnackBar);
  private fieldIntelService = inject(FieldIntelService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('addUpdateIntelDialog') addUpdateIntelDialog!: TemplateRef<any>;
  @ViewChild('deleteIntelDialog') deleteIntelDialog!: TemplateRef<any>;

  closeDialog(): void {
    this.dialog.closeAll();
  }

  ngOnInit() {
    this.initForm();
    if (isPlatformBrowser(this.platformId)) {
      this.getProfile();
    }

    this.dataSource.filterPredicate = (data: FieldIntelBody, filter: string) => {
      const f = filter.trim().toLowerCase();
      const classification = (data.classification_display || '').toString().toLowerCase();
      const risk = (data.risk_level_display || '').toString().toLowerCase();
      const notes = (data.notes || '').toString().toLowerCase();
      return classification.includes(f) || risk.includes(f) || notes.includes(f);
    };

    setTimeout(() => {
      this.dataSource.paginator = this.paginator;
    }, 500);
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
      polling_station: ['', [Validators.required]],
      classification: ['stronghold', Validators.required],
      risk_level: ['low', Validators.required],
      notes: [''],
      is_active: [true],
    });
  }

  getProfile() {
    this.authService.getProfile().subscribe({
      next: (profile: any) => {
        // Fallbacks check candidate-specific properties first before profile id
        this.candidateId =
          profile?.data?.candidate_id ||
          profile?.data?.candidate?.id ||
          profile?.data?.id;
        this.getFieldIntel();
      },
      error: () => {
        this.showError('Session expired. Please login again.');
        this.route.navigate(['login']);
      },
    });
  }

  getFieldIntel() {
    this.fieldIntelService.getFieldIntelList().subscribe({
      next: (response: any) => {
        this.dataSource.data = response.results || [];
      },
      error: () => this.showError('Failed to load field intel.'),
    });
  }

  addUpdateDialC() {
    const dialogRef = this.dialog.open(this.addUpdateIntelDialog, {
      minWidth: '480px',
      panelClass: 'custom-dialog-container',
    });
    dialogRef.afterClosed().subscribe(() => {
      this.resetFormState();
    });
  }

  onSubmit() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const payload = {
      ...this.userForm.value,
      candidate: this.isEditing ? this.editingCandidateId : this.candidateId,
    };

    const handleResponse = {
      next: () => {
        this.showSuccess(this.isEditing ? 'Updated successfully!' : 'Added successfully!');
        this.getFieldIntel();
        this.dialog.closeAll();
        this.resetFormState();
      },
      error: (err: any) => {
        const backendErrors = err.error?.errors;
        if (backendErrors) {
          Object.keys(backendErrors).forEach((key) => {
            const formControl = this.userForm.get(key);
            if (formControl) {
              formControl.setErrors({ serverError: backendErrors[key][0] });
            }
          });
        } else {
          this.showError(err.error?.message || 'An unexpected error occurred.');
        }
      },
    };

    if (this.isEditing && this.currentIntelId) {
      this.fieldIntelService.updateFieldIntel(this.currentIntelId, payload).subscribe(handleResponse);
    } else {
      this.fieldIntelService.addFieldIntelApi(payload).subscribe(handleResponse);
    }
  }

  onEdit(intel: FieldIntelBody) {
    this.isEditing = true;
    this.currentIntelId = intel.id || null;
    // Preserves candidate ID attached to the existing intel record
    this.editingCandidateId = intel.candidate || this.candidateId;

    this.userForm.patchValue({
      polling_station: intel.polling_station,
      classification: intel.classification,
      risk_level: intel.risk_level,
      notes: intel.notes,
      is_active: intel.is_active,
    });
    this.addUpdateDialC();
  }

  onDelete(id: string) {
    const dialogRef = this.dialog.open(this.deleteIntelDialog);
    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'yes') {
        this.fieldIntelService.deleteFieldIntel(id).subscribe({
          next: () => {
            this.showSuccess('Deleted successfully');
            this.getFieldIntel();
          },
          error: () => this.showError('Delete failed.'),
        });
      }
    });
  }

  resetFormState() {
    this.isEditing = false;
    this.currentIntelId = null;
    this.editingCandidateId = null;
    this.userForm.reset({ classification: 'stronghold', risk_level: 'low', is_active: true });
  }

  showSuccess(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }

  showError(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      panelClass: ['error-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }
}