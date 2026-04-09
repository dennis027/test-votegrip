// login.ts
import { Component, OnInit, NgZone, inject, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth/auth';
import { finalize } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login implements OnInit {

  loginForm!: FormGroup;
  showPassword = false;
  isLoading    = false;
  submitted    = false;
  loginError   = '';

  emailFocused    = false;
  passwordFocused = false;

  private snackBar = inject(MatSnackBar);
  private cdr      = inject(ChangeDetectorRef);

  constructor(
    private fb:          FormBuilder,
    private router:      Router,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email:    ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  // ── Clear error when user starts typing again ─────────────────────────────
  clearError(): void {
    this.loginError = '';
  }

  // ── Snack helpers ─────────────────────────────────────────────────────────
  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      panelClass: ['error-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  onSubmit(): void {
    this.submitted   = true;
    this.loginError  = '';   // clear previous error immediately

    if (this.loginForm.invalid) return;

    this.isLoading = true;

    this.authService.login({
      email:    this.loginForm.value.email,
      password: this.loginForm.value.password,
      channel:  'email',
    })
    .pipe(
      finalize(() => {
        // ── FIX 1: ExpressionChangedAfterChecked ─────────────────────────
        // finalize() runs outside Angular's change detection zone.
        // We must call detectChanges() so Angular picks up isLoading = false
        // in the same cycle — without this, the spinner never disappears and
        // you get the NG0100 error.
        this.isLoading = false;
        this.cdr.detectChanges();
      })
    )
    .subscribe({
      next: () => {
        this.showSuccess('Login successful! Please enter the 2FA code sent to your email.');
        this.router.navigate(['/two-factor-auth']);
      },
      error: (err) => {
        // ── FIX 2: 401 → show correct message, reset button state ─────────
        // The button stays as a spinner forever because isLoading was only
        // reset in finalize() after the error handler already ran in some
        // versions. We set it explicitly here too so the button resets.
        this.isLoading = false;

        if (err.status === 401) {
          // ── FIX 3: 401 likely means wrong credentials OR wrong payload ──
          // Your API expects { email, password, channel } — confirm the field
          // name matches. If your API uses "username" or "phone" instead of
          // "email", change the key in the login() call above.
          this.loginError = 'Invalid email or password. Please try again.';
        } else if (err.status === 0) {
          this.loginError = 'Cannot reach the server. Check your connection.';
        } else {
          this.loginError = err?.error?.message || 'Login failed. Please try again.';
        }

        // detectChanges() ensures the error banner appears immediately
        // and avoids the NG0100 ExpressionChangedAfterItHasBeenCheckedError
        this.cdr.detectChanges();

        this.showError(this.loginError);

        // ── Reset submitted so field errors clear while user re-types ─────
        this.submitted = false;
      }
    });
  }
}