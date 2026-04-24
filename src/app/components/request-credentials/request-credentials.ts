import { Component, OnInit, inject, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'; // The new optimized dep
import { finalize } from 'rxjs/operators';
import { Users } from '../../services/users';

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

  // UI Focus tracking
  firstFoc = false;
  lastFoc = false;
  emailFoc = false;
  phoneFoc = false;

  // Services
  private fb = inject(FormBuilder);
  private usersService = inject(Users);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef); // Required for clean cleanup

  ngOnInit(): void {
    this.form = this.fb.group({
      first_name: ['', [Validators.required, Validators.minLength(2)]],
      last_name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[+\d\s\-()]{7,20}$/)]],
    });
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
        /**
         * takeUntilDestroyed(this.destroyRef) is the key fix. 
         * If Vite forces a reload while this request is pending, 
         * this pipe will cancel the subscription immediately.
         */
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.done = true;
          this.showSuccess('Credentials request submitted! Check your email.');
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.submitted = false;
          const msg = err?.error?.message || 'Request failed. Please try again.';
          this.showError(msg);
          this.cdr.detectChanges();
        },
      });
  }

  reset(): void {
    this.done = false;
    this.submitted = false;  
    this.form.reset();
  }
}