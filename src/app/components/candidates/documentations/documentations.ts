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
import { DocumentsService, DocumentBody } from '../../../services/candidates/documents-service';

@Component({
  selector: 'app-documentations',
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
  templateUrl: './documentations.html',
  styleUrl: './documentations.css',
})
export class Documentations implements OnInit, AfterViewInit {
  userForm!: FormGroup;
  candidateId: any;
  isEditing = false;
  currentDocId: string | null = null;

  documentTypes = [
    { value: 'guideline', label: 'Guideline' },
    { value: 'form', label: 'Form' },
    { value: 'policy', label: 'Policy' },
    { value: 'report', label: 'Report' },
    { value: 'other', label: 'Other' },
  ];

  displayedColumns: string[] = [
    'document_name',
    'document_type_display',
    'version',
    'is_public',
    'download_count',
    'created_at',
    'actions',
  ];
  dataSource = new MatTableDataSource<DocumentBody>([]);

  private route = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private snackBar = inject(MatSnackBar);
  private documentsService = inject(DocumentsService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('addUpdateDocDialog') addUpdateDocDialog!: TemplateRef<any>;
  @ViewChild('deleteDocDialog') deleteDocDialog!: TemplateRef<any>;

  ngOnInit() {
    this.initForm();
    if (isPlatformBrowser(this.platformId)) {
      this.getProfile();
    }

    this.dataSource.filterPredicate = (data: DocumentBody, filter: string) => {
      const f = filter.trim().toLowerCase();
      const name = (data.document_name || '').toString().toLowerCase();
      const type = (data.document_type_display || '').toString().toLowerCase();
      return name.includes(f) || type.includes(f);
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
      document_name: ['', [Validators.required, Validators.minLength(3)]],
      document_type: ['guideline', Validators.required],
      file_url: ['', [Validators.required]],
      file_size: [null],
      mime_type: [''],
      folder_path: [''],
      version: [1, [Validators.required, Validators.min(1)]],
      is_public: [true],
      accessible_to: [''],
      is_active: [true],
    });
  }

  getProfile() {
    this.authService.getProfile().subscribe({
      next: (profile: any) => {
        this.candidateId = profile?.data.id;
        this.getDocuments();
      },
      error: () => {
        this.showError('Session expired. Please login again.');
        this.route.navigate(['login']);
      },
    });
  }

  getDocuments() {
    this.documentsService.getDocumentsList().subscribe({
      next: (response: any) => {
        this.dataSource.data = response.results || [];
      },
      error: () => this.showError('Failed to load documents.'),
    });
  }

  addUpdateDialC() {
    const dialogRef = this.dialog.open(this.addUpdateDocDialog, {
      minWidth: '480px',
      panelClass: 'custom-dialog-container',
    });
    dialogRef.afterClosed().subscribe(() => {
      this.isEditing = false;
      this.resetFormState();
    });
  }

  onSubmit() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const raw = this.userForm.value;
    const payload: Partial<DocumentBody> = {
      ...raw,
      candidate: this.candidateId,
      accessible_to: raw.accessible_to
        ? raw.accessible_to.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [],
    };

    const handleResponse = {
      next: () => {
        this.showSuccess(this.isEditing ? 'Document updated!' : 'Document added!');
        this.getDocuments();
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

    if (this.isEditing && this.currentDocId) {
      this.documentsService.updateDocument(this.currentDocId, payload).subscribe(handleResponse);
    } else {
      this.documentsService.addDocumentApi(payload).subscribe(handleResponse);
    }
  }

  onEdit(doc: DocumentBody) {
    this.isEditing = true;
    this.currentDocId = doc.id || null;
    this.userForm.patchValue({
      document_name: doc.document_name,
      document_type: doc.document_type,
      file_url: doc.file_url,
      file_size: doc.file_size,
      mime_type: doc.mime_type,
      folder_path: doc.folder_path,
      version: doc.version,
      is_public: doc.is_public,
      accessible_to: Array.isArray(doc.accessible_to) ? doc.accessible_to.join(', ') : doc.accessible_to,
      is_active: doc.is_active,
    });
    this.addUpdateDialC();
  }

  onDelete(id: string) {
    const dialogRef = this.dialog.open(this.deleteDocDialog);
    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'yes') {
        this.documentsService.deleteDocument(id).subscribe({
          next: () => {
            this.showSuccess('Deleted successfully');
            this.getDocuments();
          },
          error: () => this.showError('Delete failed.'),
        });
      }
    });
  }

  resetFormState() {
    this.isEditing = false;
    this.currentDocId = null;
    this.userForm.reset({ document_type: 'guideline', version: 1, is_public: true, is_active: true });
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