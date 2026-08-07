import { Component, OnInit, inject, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'; // The new optimized dep
import { finalize } from 'rxjs/operators';
import { UsersService } from '../../services/users';
import { ElectionTypesService } from '../../services/election-types-service';

@Component({
  selector: 'app-request-credentials',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './request-credentials.html',
  styleUrl: './request-credentials.css',
})
export class RequestCredentials implements OnInit {
  // Form and State
  form!: FormGroup;
  loading = false;
  submitted = false;
  done = false;
  submittedEmail: string | null = null;

  electionTypes: any[] = []; // Store fetched election types

  // UI Focus tracking
  firstFoc = false;
  lastFoc = false;
  emailFoc = false;
  phoneFoc = false;

  // Services
  private fb = inject(FormBuilder);
  private usersService = inject(UsersService);
  private snackBar = inject(MatSnackBar);
  private electionTypesService = inject(ElectionTypesService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef); // Required for clean cleanup

  // Desired positions for the dropdown
  desiredPositions = [
    { label: 'President', value: 'president' },
    { label: 'Governor', value: 'governor' },
    { label: 'Senator', value: 'senator' },
    { label: 'Women Representative', value: 'womenrep' },
    { label: 'Member of Parliament', value: 'mp' },
    { label: 'Member of County Asembly', value: 'mca' }
  ];

  ngOnInit(): void {
    this.form = this.fb.group({
      first_name: ['', [Validators.required, Validators.minLength(2)]],
      last_name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[+\d\s\-()]{7,20}$/)]],
      desired_position: ['', [Validators.required]]
    });

    this.getElectionTypes(); // Fetch election types on init
  }

  

  // ── UI Helpers ──────────────────────────────────────────────────────────
  showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }

  showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      panelClass: ['error-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }

  // ── Logic ────────────────────────────────────────────────────────────────

  getElectionTypes(): void {
    this.electionTypesService.getElectionTypes().subscribe({
          next: (res: any) => {
            this.electionTypes = res || [];
          },
          error: (err) => {
            this.showError('Failed to fetch election types. Please try again later.');
          }
        });
  }


  requestCredentials(): void {
  this.submitted = true;

  if (this.form.invalid) {
    this.showError('Please fill in all fields correctly.');
    return;
  }

  this.loading = true;

  this.usersService
    .requestLoginCred(this.form.value)
    .pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      })
    )
    .subscribe({
      next: (res: any) => {

        if (res?.success === false) {
          const msg = this.extractFirstErrorMessage(res) || res?.message || 'Request failed.';
          this.showError(msg);
          return; // loading=false + detectChanges handled by finalize
        }

        this.submittedEmail = this.form.value?.email ?? null;
        this.form.reset();
        this.submitted = false;
        this.done = true;
        this.showSuccess('Credentials request submitted! Check your email after some time.');
        // no manual loading/detectChanges here — finalize() handles it
      },
      error: (err) => {
        this.submitted = false;
        const msg = this.extractFirstErrorMessage(err) || 'Request failed. Please try again.';
        this.showError(msg);
        // no manual loading/detectChanges here — finalize() handles it
      },
    });
}
  private extractFirstErrorMessage(err: any): string | null {
    let e = err?.error;
    if (!e) return err?.message ?? null;

    // Some backends wrap validation details under `errors`.
    if (e?.errors && typeof e.errors === 'object') {
      e = e.errors;
    }

    // Direct string or detail
    if (typeof e === 'string') return e;
    if (e?.detail && typeof e.detail === 'string') return e.detail;

    // Common field checks in preferred order
    const preferredFields = ['email', 'phone', 'desired_position', 'non_field_errors', 'detail', 'message'];
    for (const field of preferredFields) {
      const val = (e as any)[field];
      if (Array.isArray(val) && val.length) return String(val[0]);
      if (typeof val === 'string' && val) return val;
    }

    // If backend returned an array of messages
    if (Array.isArray(e) && e.length) return typeof e[0] === 'string' ? e[0] : JSON.stringify(e[0]);

    // Generic object traversal: return the first string found
    if (typeof e === 'object') {
      for (const key of Object.keys(e)) {
        const val = (e as any)[key];
        if (Array.isArray(val) && val.length) return String(val[0]);
        if (typeof val === 'string' && val) return val;
      }
    }

    return err?.message ?? null;
  }

  reset(): void {
    this.done = false;
    this.submitted = false;  
    this.form.reset();
    this.submittedEmail = null;
  }
}