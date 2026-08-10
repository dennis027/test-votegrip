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
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../services/auth/auth';
import { InventoryService, InventoryBody } from '../../../services/candidates/inventory-service';
import { SupplierBody, SuppliersService } from '../../../services/suppliers-service';

@Component({
  selector: 'app-inventory',
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
  templateUrl: './inventory.html',
  styleUrl: './inventory.css',
})
export class Inventory implements OnInit, AfterViewInit {
  userForm!: FormGroup;
  supplierForm!: FormGroup;

  candidateId: any;
  isEditing = false;
  currentItemId: string | null = null;
  suppliersList: SupplierBody[] = [];

  itemTypes = [
    { value: 'material', label: 'Material' },
    { value: 'document', label: 'Document' },
    { value: 'equipment', label: 'Equipment' },
    { value: 'apparel', label: 'Apparel' },
    { value: 'other', label: 'Other' },
  ];

  supplierCategories = [
    { value: 'apparel', label: 'Apparel' },
    { value: 'printing', label: 'Printing' },
    { value: 'transport', label: 'Transport' },
    { value: 'catering', label: 'Catering' },
    { value: 'media', label: 'Media & Marketing' },
    { value: 'venue', label: 'Venue & Events' },
    { value: 'logistics', label: 'Logistics' },
    { value: 'other', label: 'Other' },
  ];

  supplierStatuses = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' },
  ];

  displayedColumns: string[] = [
    'item_name',
    'item_type_display',
    'supplier',
    'quantity_total',
    'quantity_distributed',
    'quantity_remaining',
    'is_active',
    'actions',
  ];
  dataSource = new MatTableDataSource<InventoryBody>([]);

  private route = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private snackBar = inject(MatSnackBar);
  private inventoryService = inject(InventoryService);
  private suppliersService = inject(SuppliersService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);

  private supplierDialogRef?: MatDialogRef<any>;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('addUpdateItemDialog') addUpdateItemDialog!: TemplateRef<any>;
  @ViewChild('deleteItemDialog') deleteItemDialog!: TemplateRef<any>;
  @ViewChild('quickAddSupplierDialog') quickAddSupplierDialog!: TemplateRef<any>;

  closeDialog(): void {
    this.dialog.closeAll();
  }

  ngOnInit() {
    this.initForms();
    if (isPlatformBrowser(this.platformId)) {
      this.getProfile();
    }

    this.dataSource.filterPredicate = (data: InventoryBody, filter: string) => {
      const f = filter.trim().toLowerCase();
      const name = (data.item_name || '').toString().toLowerCase();
      const type = (data.item_type_display || '').toString().toLowerCase();
      const supplierName = (this.getSupplierName(data.supplier) || '').toLowerCase();
      return name.includes(f) || type.includes(f) || supplierName.includes(f);
    };
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

  initForms() {
    this.userForm = this.fb.group({
      item_name: ['', [Validators.required, Validators.minLength(2)]],
      item_type: ['material', Validators.required],
      supplier: ['', Validators.required],
      quantity_total: [0, [Validators.required, Validators.min(0)]],
      quantity_distributed: [0, [Validators.min(0)]],
      is_active: [true],
    });

    this.supplierForm = this.fb.group({
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
        this.getInventory();
      },
      error: () => {
        this.showError('Session expired.');
        this.route.navigate(['login']);
      },
    });
  }

  getSuppliers(autoSelectSupplierId?: string) {
    this.suppliersService.getSuppliersList().subscribe({
      next: (response: any) => {
        this.suppliersList = response.results || [];
        if (autoSelectSupplierId) {
          this.userForm.patchValue({ supplier: autoSelectSupplierId });
        }
      },
      error: () => this.showError('Failed to load suppliers list.'),
    });
  }

  getSupplierName(supplierId: any): string {
    if (!supplierId) return '-';
    if (typeof supplierId === 'object' && supplierId.name) return supplierId.name;
    const found = this.suppliersList.find((s) => s.id === supplierId);
    return found ? found.name : '-';
  }

  getInventory() {
    this.inventoryService.getInventoryList().subscribe({
      next: (response: any) => {
        this.dataSource.data = response.results || [];
      },
      error: () => this.showError('Failed to load inventory.'),
    });
  }

  addUpdateDialC() {
    const dialogRef = this.dialog.open(this.addUpdateItemDialog, {
      minWidth: '480px',
      panelClass: 'custom-dialog-container',
    });
    dialogRef.afterClosed().subscribe(() => {
      this.isEditing = false;
      this.resetFormState();
    });
  }

  openQuickAddSupplier() {
    this.supplierForm.reset({
      category: 'apparel',
      status: 'active',
      is_active: true,
    });
    this.supplierDialogRef = this.dialog.open(this.quickAddSupplierDialog, {
      minWidth: '460px',
      panelClass: 'custom-dialog-container',
    });
  }

  closeQuickAddSupplier() {
    if (this.supplierDialogRef) this.supplierDialogRef.close();
  }

  onQuickAddSupplierSubmit() {
    if (this.supplierForm.invalid) return;
    const payload: Partial<SupplierBody> = {
      ...this.supplierForm.value,
      candidate: this.candidateId,
    };
    this.suppliersService.addSupplierApi(payload).subscribe({
      next: (res: SupplierBody) => {
        this.showSuccess('New supplier added!');
        this.closeQuickAddSupplier();
        if (res?.id) this.getSuppliers(res.id);
        else this.getSuppliers();
      },
      error: (err: any) => this.showError(err.error?.message || 'Failed to add supplier.'),
    });
  }

  onSubmit() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const raw = this.userForm.value;

    // Build payload: Shared fields
    const payload: any = {
      item_name: raw.item_name,
      item_type: raw.item_type,
      supplier: raw.supplier,
      quantity_total: raw.quantity_total,
      is_active: raw.is_active,
    };

    if (this.isEditing) {
      // UPDATING: Do NOT include 'candidate'. 
      // Including it often causes "Invalid pk" errors if the backend 
      // tries to re-validate the existence of the foreign key object.
      payload.quantity_distributed = raw.quantity_distributed;
    } else {
      // ADDING: Must include 'candidate' to link the resource.
      payload.candidate = this.candidateId;
    }

    const handleResponse = {
      next: () => {
        this.showSuccess(this.isEditing ? 'Item updated!' : 'Item added!');
        this.getInventory();
        this.dialog.closeAll();
        this.resetFormState();
      },
      error: (err: any) => {
        const backendErrors = err.error?.errors;
        if (backendErrors) {
          Object.keys(backendErrors).forEach((key) => {
            const formControl = this.userForm.get(key);
            if (formControl) formControl.setErrors({ serverError: backendErrors[key][0] });
          });
        } else {
          this.showError(err.error?.message || 'An error occurred.');
        }
      },
    };

    if (this.isEditing && this.currentItemId) {
      this.inventoryService.updateInventory(this.currentItemId, payload).subscribe(handleResponse);
    } else {
      this.inventoryService.addInventoryApi(payload).subscribe(handleResponse);
    }
  }

  onEdit(item: InventoryBody) {
    this.isEditing = true;
    this.currentItemId = item.id || null;
    const supplierVal = typeof item.supplier === 'object' && item.supplier ? (item.supplier as any).id : item.supplier;

    this.userForm.patchValue({
      item_name: item.item_name,
      item_type: item.item_type,
      supplier: supplierVal || '',
      quantity_total: item.quantity_total,
      quantity_distributed: item.quantity_distributed || 0,
      is_active: item.is_active,
    });
    this.addUpdateDialC();
  }

  onDelete(id: string) {
    const dialogRef = this.dialog.open(this.deleteItemDialog);
    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'yes') {
        this.inventoryService.deleteInventory(id).subscribe({
          next: () => {
            this.showSuccess('Deleted successfully');
            this.getInventory();
          },
          error: () => this.showError('Delete failed.'),
        });
      }
    });
  }

  resetFormState() {
    this.isEditing = false;
    this.currentItemId = null;
    this.userForm.reset({
      item_type: 'material',
      supplier: '',
      quantity_total: 0,
      quantity_distributed: 0,
      is_active: true,
    });
  }

  stockPercent(item: InventoryBody): number {
    if (!item.quantity_total) return 0;
    const remaining = item.quantity_remaining ?? (item.quantity_total - (item.quantity_distributed || 0));
    return Math.max(0, Math.min(100, Math.round((remaining / item.quantity_total) * 100)));
  }

  showSuccess(message: string) {
    this.snackBar.open(message, 'Close', { duration: 3000, panelClass: ['success-snackbar'], horizontalPosition: 'right', verticalPosition: 'top' });
  }

  showError(message: string) {
    this.snackBar.open(message, 'Close', { duration: 4000, panelClass: ['error-snackbar'], horizontalPosition: 'right', verticalPosition: 'top' });
  }
}