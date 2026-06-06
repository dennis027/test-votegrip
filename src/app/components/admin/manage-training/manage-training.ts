// pages/manage-training/manage-training.ts
import {
  Component, OnInit, inject, signal,
  ViewChild, PLATFORM_ID, TemplateRef,
  DestroyRef, HostBinding, Pipe, PipeTransform
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

// Material
import { MatSnackBar, MatSnackBarModule }           from '@angular/material/snack-bar';
import { MatPaginator, MatPaginatorModule }          from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule }        from '@angular/material/table';
import { MatButtonModule }                           from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef }  from '@angular/material/dialog';
import { MatFormFieldModule }                        from '@angular/material/form-field';
import { MatInputModule }                            from '@angular/material/input';
import { MatSelectModule }                           from '@angular/material/select';
import { MatProgressSpinnerModule }                  from '@angular/material/progress-spinner';
import { MatIconModule }                             from '@angular/material/icon';

// Services
import { TrainingService } from '../../../services/training-service';
import { takeUntilDestroyed }  from '@angular/core/rxjs-interop';
import { finalize }            from 'rxjs';
import { Router } from '@angular/router';

@Pipe({
  name: 'safe',
  standalone: true
})
export class SafePipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}
  transform(url: string | undefined): SafeResourceUrl {
    if (!url) return this.sanitizer.bypassSecurityTrustResourceUrl('');
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}

export interface TrainingModule {
  id:                   string;
  // election_type:        string;
  election_type_name:   string;
  title:                string;
  description:          string;
  content_type:         string;
  content_type_display: string;
  content_url:          string;
  duration_minutes:     number;
  is_mandatory:         boolean;
  order_index:          number;
  is_active:            boolean;
  created_at:           string;
}

export interface ProgressSummary {
  not_started: number;
  in_progress: number;
  completed:   number;
  failed:      number;
  total:       number;
}

@Component({
  selector: 'app-manage-training',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatSnackBarModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatIconModule,
    SafePipe,
  ],
  templateUrl: './manage-training.html',
  styleUrl:    './manage-training.css',
})
export class ManageTraining implements OnInit {
  @HostBinding('attr.ngSkipHydration') skipHydration = true;

  // Services
  private trainingService = inject(TrainingService);
  private platformId      = inject(PLATFORM_ID);
  private snackBar        = inject(MatSnackBar);
  private fb              = inject(FormBuilder);
  private dialog          = inject(MatDialog);
  private destroyRef      = inject(DestroyRef);
  private router          = inject(Router)

  // Signals
  isLoading    = signal(false);
  isSubmitting = signal(false);
  isDeleting   = signal<string | null>(null); // holds id of module being deleted

  // Table
  displayedColumns: string[] = [
    'order_index', 'title', 'content_type',
    'duration_minutes', 'is_mandatory', 'is_active', 'actions'
  ];
  dataSource = new MatTableDataSource<TrainingModule>([]);

  @ViewChild(MatPaginator) set paginator(p: MatPaginator) {
    if (p) this.dataSource.paginator = p;
  }

  @ViewChild('moduleFormTemp') moduleFormTemp!: TemplateRef<any>;
  @ViewChild('deleteConfirmTemp') deleteConfirmTemp!: TemplateRef<any>;
  @ViewChild('previewDialogTemp') previewDialogTemp!: TemplateRef<any>;

  activeDialog:   MatDialogRef<any> | null = null;
  editingModule:  TrainingModule | null    = null;
  deletingModule: TrainingModule | null    = null;
  previewingModule: TrainingModule | null  = null;

  // Summary stats
  summary: ProgressSummary = {
    not_started: 0, in_progress: 0,
    completed: 0,   failed: 0, total: 0
  };

  // Form
  form: FormGroup = this.fb.group({
    title:            ['', [Validators.required, Validators.maxLength(200)]],
    description:      ['', [Validators.required]],
    content_type:     ['pdf', [Validators.required]],
    content_url:      ['', [Validators.required]],
    duration_minutes: [30, [Validators.required, Validators.min(1)]],
    is_mandatory:     [true],
    order_index:      [0, [Validators.required, Validators.min(0)]],
    // election_type:    ['', [Validators.required]],
  });

  readonly contentTypes = [
    { value: 'pdf',   label: 'PDF Document' },
    { value: 'video', label: 'Video'         },
    { value: 'quiz',  label: 'Quiz'          },
    { value: 'text',  label: 'Text Article'  },
  ];

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadModules();
      this.loadSummary();
    }

    this.dataSource.filterPredicate = (data: TrainingModule, filter: string) => {
      const f = filter.trim().toLowerCase();
      return (
        data.title.toLowerCase().includes(f) ||
        data.content_type_display.toLowerCase().includes(f) ||
        data.election_type_name.toLowerCase().includes(f)
      );
    };
  }

  // ── Data loading ───────────────────────────────────────────────────────────
  loadModules() {
    this.isLoading.set(true);
    this.trainingService.getModules()
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res: any) => {
          const list = Array.isArray(res) ? res : (res.results ?? res.data ?? []);
          this.dataSource.data = list;
          if (!this.summary.total) {
            this.summary.total = list.length;
          }
        },
        error: (err) => {
          this.handleError(err, 'Failed to load training modules.');
          if (err?.status === 401) {
            this.router.navigate(['login']);
          }
        }
      });
  }

  loadSummary() {
    this.trainingService.getProgressSummary()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => { this.summary = this.normalizeSummary(res); },
        error: () => {
          // fallback to module count if summary endpoint fails
          this.summary.total = this.dataSource.data.length;
          
        },
      });
  }

  private normalizeSummary(response: any): ProgressSummary {
    const payload = response?.data ?? response?.summary ?? response ?? {};
    const notStarted = Number(payload.not_started ?? payload.notStarted ?? payload.pending ?? 0);
    const inProgress = Number(payload.in_progress ?? payload.inProgress ?? payload.in_progress_count ?? 0);
    const completed = Number(payload.completed ?? payload.completed_count ?? 0);
    const failed = Number(payload.failed ?? payload.failed_count ?? 0);
    const total = Number(payload.total ?? payload.count ?? payload.total_modules ?? (notStarted + inProgress + completed + failed));

    return {
      not_started: notStarted,
      in_progress: inProgress,
      completed,
      failed,
      total: total || (notStarted + inProgress + completed + failed),
    };
  }

  applyFilter(value: string) {
    this.dataSource.filter = (value || '').trim().toLowerCase();
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  // ── Dialog helpers ─────────────────────────────────────────────────────────
  openAddDialog() {
    this.editingModule = null;
    this.form.reset({
      content_type: 'pdf', is_mandatory: true,
      duration_minutes: 30, order_index: 0
    });
    this.activeDialog = this.dialog.open(this.moduleFormTemp, {
      width: '580px', disableClose: true
    });
  }

  openEditDialog(module: TrainingModule) {
    this.editingModule = module;
    this.form.patchValue({
      title:            module.title,
      description:      module.description,
      content_type:     module.content_type,
      content_url:      module.content_url,
      duration_minutes: module.duration_minutes,
      is_mandatory:     module.is_mandatory,
      order_index:      module.order_index,
      // election_type:    module.election_type,
    });
    this.activeDialog = this.dialog.open(this.moduleFormTemp, {
      width: '580px', disableClose: true
    });
  }

  openPreviewDialog(module: TrainingModule) {
    this.previewingModule = module;
    this.activeDialog = this.dialog.open(this.previewDialogTemp, {
      width: '720px', maxHeight: '90vh'
    });
  }

  openDeleteDialog(module: TrainingModule) {
    this.deletingModule = module;
    this.activeDialog = this.dialog.open(this.deleteConfirmTemp, {
      width: '420px', disableClose: false
    });
  }

  closeDialog() { this.activeDialog?.close(); }

  // ── Save (create or update) ────────────────────────────────────────────────
  saveModule() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isSubmitting.set(true);

    const payload = this.form.value;
    const req$ = this.editingModule
      ? this.trainingService.updateModule(this.editingModule.id, payload)
      : this.trainingService.createModule(payload);

    req$
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.showSuccess(this.editingModule
            ? 'Module updated successfully.'
            : 'Module created successfully.');
          this.closeDialog();
          this.loadModules();
        },
        error: (err) => this.handleFormError(err),
      });
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  confirmDelete() {
    if (!this.deletingModule) return;
    const id = this.deletingModule.id;
    this.isDeleting.set(id);

    this.trainingService.deleteModule(id)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.isDeleting.set(null)))
      .subscribe({
        next: () => {
          this.showSuccess('Module deleted successfully.');
          this.closeDialog();
          this.loadModules();
        },
        error: (err) => this.handleError(err, 'Failed to delete module.'),
      });
  }

  // ── Error handling ─────────────────────────────────────────────────────────
  handleFormError(err: any) {
    const errors = err?.error?.errors;
    if (errors) {
      Object.keys(errors).forEach((key) => {
        const ctrl = this.form.get(key);
        if (ctrl) ctrl.setErrors({ serverError: errors[key][0] });
      });
      // Also show first error in snackbar
      const first = Object.values(errors)[0] as string[];
      this.showError(first[0] ?? 'Validation failed.');
    } else {
      this.showError(err?.error?.message ?? 'Something went wrong.');
    }
  }

  handleError(err: any, fallback: string) {
    const msg = err?.error?.message ?? err?.error?.detail ?? fallback;
    this.showError(msg);
  }

  // ── Snackbars ──────────────────────────────────────────────────────────────
  showSuccess(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 3000, panelClass: ['success-snackbar'],
      horizontalPosition: 'right', verticalPosition: 'top',
    });
  }

  showError(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 4000, panelClass: ['error-snackbar'],
      horizontalPosition: 'right', verticalPosition: 'top',
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  contentTypeIcon(type: string): string {
    const map: Record<string, string> = {
      pdf: '📄', video: '🎬', quiz: '📝', text: '📰',
    };
    return map[type] ?? '📁';
  }

  completionPct(): number {
    if (!this.summary.total) return 0;
    return Math.round((this.summary.completed / this.summary.total) * 100);
  }

  // ── Preview helpers ───────────────────────────────────────────────────────
  isYoutubeUrl(url: string | undefined): boolean {
    if (!url) return false;
    return /(?:youtube\.com\/watch\?v=|youtu\.be\/)/.test(url);
  }

  convertYoutubeUrl(url: string | undefined): string {
    if (!url) return '';
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  }
}