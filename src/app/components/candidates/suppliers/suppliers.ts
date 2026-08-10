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
import { SupplierBody, SuppliersService } from '../../../services/suppliers-service';

@Component({
  selector: 'app-suppliers',
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
  templateUrl: './suppliers.html',
  styleUrl: './suppliers.css',
})
export class Suppliers implements OnInit, AfterViewInit {
  userForm!: FormGroup;
  candidateId: any;
  editingCandidateId: any = null;
  isEditing = false;
  currentSupplierId: string | null = null;

  categories = [
    { value: 'apparel', label: 'Apparel' },
    { value: 'printing', label: 'Printing' },
    { value: 'transport', label: 'Transport' },
    { value: 'catering', label: 'Catering' },
    { value: 'equipment', label: 'Media & Marketing' },
    { value: 'others', label: 'Venue & Events' },
  ];

  statuses = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' },
  ];

  displayedColumns: string[] = [
    'name',
    'category_display',
    'contact_person',
    'phone',
    'email',
    'status',
    'created_at',
    'actions',
  ];
  dataSource = new MatTableDataSource<SupplierBody>([]);

  private route = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private snackBar = inject(MatSnackBar);
  private suppliersService = inject(SuppliersService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('addUpdateSupplierDialog') addUpdateSupplierDialog!: TemplateRef<any>;
  @ViewChild('deleteSupplierDialog') deleteSupplierDialog!: TemplateRef<any>;

  closeDialog(): void {
    this.dialog.closeAll();
  }

  ngOnInit() {
    this.initForm();
    if (isPlatformBrowser(this.platformId)) {
      this.getProfile();
    }

    this.dataSource.filterPredicate = (data: SupplierBody, filter: string) => {
      const f = filter.trim().toLowerCase();
      const name = (data.name || '').toString().toLowerCase();
      const category = (data.category_display || data.category || '').toString().toLowerCase();
      const contact = (data.contact_person || '').toString().toLowerCase();
      const phone = (data.phone || '').toString().toLowerCase();
      const email = (data.email || '').toString().toLowerCase();
      return name.includes(f) || category.includes(f) || contact.includes(f) || phone.includes(f) || email.includes(f);
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
      name: ['', [Validators.required, Validators.minLength(2)]],
      category: ['apparel', Validators.required],
      contact_person: [''],
      phone: [''],
      email: ['', [Validators.email]],
      address: [''],
      notes: [''],
      status: ['active', Validators.required],
      is_active: [true],
    });
  }

  getProfile() {
    this.authService.getProfile().subscribe({
      next: (profile: any) => {
        this.candidateId =
          profile?.data?.candidate_id ||
          profile?.data?.candidate?.id ||
          profile?.data?.id;
        this.getSuppliers();
      },
      error: () => {
        this.showError('Session expired. Please login again.');
        this.route.navigate(['login']);
      },
    });
  }

  getSuppliers() {
    this.suppliersService.getSuppliersList().subscribe({
      next: (response: any) => {
        this.dataSource.data = response.results || [];
      },
      error: () => this.showError('Failed to load suppliers.'),
    });
  }

  addUpdateDialC() {
    const dialogRef = this.dialog.open(this.addUpdateSupplierDialog, {
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

    const raw = this.userForm.value;
    const payload: Partial<SupplierBody> = {
      ...raw,
      candidate: this.isEditing ? this.editingCandidateId : this.candidateId,
    };

    const handleResponse = {
      next: () => {
        this.showSuccess(this.isEditing ? 'Supplier updated!' : 'Supplier added!');
        this.getSuppliers();
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

    if (this.isEditing && this.currentSupplierId) {
      this.suppliersService.updateSupplier(this.currentSupplierId, payload).subscribe(handleResponse);
    } else {
      this.suppliersService.addSupplierApi(payload).subscribe(handleResponse);
    }
  }

  onEdit(supplier: SupplierBody) {
    this.isEditing = true;
    this.currentSupplierId = supplier.id || null;
    this.editingCandidateId = supplier.candidate || this.candidateId;

    this.userForm.patchValue({
      name: supplier.name,
      category: supplier.category,
      contact_person: supplier.contact_person,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      notes: supplier.notes,
      status: supplier.status,
      is_active: supplier.is_active,
    });
    this.addUpdateDialC();
  }

  onDelete(id: string) {
    const dialogRef = this.dialog.open(this.deleteSupplierDialog);
    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'yes') {
        this.suppliersService.deleteSupplier(id).subscribe({
          next: () => {
            this.showSuccess('Deleted successfully');
            this.getSuppliers();
          },
          error: () => this.showError('Delete failed.'),
        });
      }
    });
  }

  resetFormState() {
    this.isEditing = false;
    this.currentSupplierId = null;
    this.editingCandidateId = null;
    this.userForm.reset({ category: 'apparel', status: 'active', is_active: true });
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