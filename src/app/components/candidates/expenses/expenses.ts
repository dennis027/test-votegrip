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
import { ExpensesService, ExpenseBody } from '../../../services/candidates/expenses-service';

@Component({
  selector: 'app-expenses',
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
  templateUrl: './expenses.html',
  styleUrl: './expenses.css',
})
export class Expenses implements OnInit, AfterViewInit {
  userForm!: FormGroup;
  candidateId: any;
  editingCandidateId: any = null;
  isEditing = false;
  currentExpenseId: string | null = null;

  categories = [
    { value: 'transport', label: 'Transport' },
    { value: 'logistics', label: 'Logistics' },
    { value: 'catering', label: 'Catering' },
    { value: 'printing', label: 'Printing' },
    { value: 'venue', label: 'Venue' },
    { value: 'media', label: 'Media' },
    { value: 'other', label: 'Other' },
  ];

  statuses = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  displayedColumns: string[] = [
    'expense_category_display',
    'description',
    'amount',
    'status',
    'created_at',
    'actions',
  ];
  dataSource = new MatTableDataSource<ExpenseBody>([]);

  totalAmount = 0;
  approvedAmount = 0;
  pendingAmount = 0;

  private route = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private snackBar = inject(MatSnackBar);
  private expensesService = inject(ExpensesService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('addUpdateExpenseDialog') addUpdateExpenseDialog!: TemplateRef<any>;
  @ViewChild('deleteExpenseDialog') deleteExpenseDialog!: TemplateRef<any>;

  closeDialog(): void {
    this.dialog.closeAll();
  }

  ngOnInit() {
    this.initForm();
    if (isPlatformBrowser(this.platformId)) {
      this.getProfile();
    }

    this.dataSource.filterPredicate = (data: ExpenseBody, filter: string) => {
      const f = filter.trim().toLowerCase();
      const category = (data.expense_category_display || '').toString().toLowerCase();
      const desc = (data.description || '').toString().toLowerCase();
      const status = (data.status_display || '').toString().toLowerCase();
      return category.includes(f) || desc.includes(f) || status.includes(f);
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
      expense_category: ['transport', Validators.required],
      description: ['', Validators.required],
      amount: ['', [Validators.required, Validators.pattern('^[0-9]+(\\.[0-9]{1,2})?$')]],
      receipt_url: [''],
      status: ['pending', Validators.required],
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
        this.getExpenses();
      },
      error: () => {
        this.showError('Session expired. Please login again.');
        this.route.navigate(['login']);
      },
    });
  }

  getExpenses() {
    this.expensesService.getExpensesList().subscribe({
      next: (response: any) => {
        const results = response.results || [];
        this.dataSource.data = results;
        this.computeTotals(results);
      },
      error: () => this.showError('Failed to load expenses.'),
    });
  }

  computeTotals(items: ExpenseBody[]) {
    this.totalAmount = items.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    this.approvedAmount = items
      .filter((e) => e.status === 'approved')
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    this.pendingAmount = items
      .filter((e) => e.status === 'pending')
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  }

  addUpdateDialC() {
    const dialogRef = this.dialog.open(this.addUpdateExpenseDialog, {
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

    const targetCandidateId = this.isEditing ? this.editingCandidateId : this.candidateId;
    const payload = {
      ...this.userForm.value,
      candidate: targetCandidateId,
      incurred_by: targetCandidateId,
    };

    const handleResponse = {
      next: () => {
        this.showSuccess(this.isEditing ? 'Expense updated!' : 'Expense recorded!');
        this.getExpenses();
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

    if (this.isEditing && this.currentExpenseId) {
      this.expensesService.updateExpense(this.currentExpenseId, payload).subscribe(handleResponse);
    } else {
      this.expensesService.addExpenseApi(payload).subscribe(handleResponse);
    }
  }

  onEdit(expense: ExpenseBody) {
    this.isEditing = true;
    this.currentExpenseId = expense.id || null;
    this.editingCandidateId = expense.candidate || this.candidateId;
    this.userForm.patchValue({
      expense_category: expense.expense_category,
      description: expense.description,
      amount: expense.amount,
      receipt_url: expense.receipt_url,
      status: expense.status,
      is_active: expense.is_active,
    });
    this.addUpdateDialC();
  }

  onDelete(id: string) {
    const dialogRef = this.dialog.open(this.deleteExpenseDialog);
    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'yes') {
        this.expensesService.deleteExpense(id).subscribe({
          next: () => {
            this.showSuccess('Deleted successfully');
            this.getExpenses();
          },
          error: () => this.showError('Delete failed.'),
        });
      }
    });
  }

  resetFormState() {
    this.isEditing = false;
    this.currentExpenseId = null;
    this.editingCandidateId = null;
    this.userForm.reset({ expense_category: 'transport', status: 'pending', is_active: true });
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