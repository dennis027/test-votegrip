import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../services/auth/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule,
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login implements OnInit {

  loginForm!: FormGroup;
  showPassword = false;
  isLoading    = false;
  submitted    = false;
  loginError   = '';

  private snackBar = inject(MatSnackBar);
  private cdr      = inject(ChangeDetectorRef);
  private route    = inject(Router);
  private authService = inject(AuthService);
  private fb       = inject(FormBuilder);

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email:    ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  clearError(): void {
    this.loginError = '';
  }

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

  onSubmit(): void {
    this.submitted  = true;
    this.loginError = '';

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    this.authService.login({
      email:    this.loginForm.value.email,
      password: this.loginForm.value.password,
      channel:  'email',
    })
    .pipe(
      finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      })
    )
    .subscribe({
      next: (res) => {
        if (res.data.verified) {
          const role = res.data.user.role.name;
          const dashboardRoute = role === 'admin' ? 'admin-menu/admin-dashboard' : 'main-menu/dashboard';
          this.route.navigate([dashboardRoute]);
          this.showSuccess('Login successful! Welcome to the dashboard.');
        } else {
          this.route.navigate(['/two-factor-auth']);
          this.showSuccess('New device detected. Please enter the 2FA code sent to your email.');
        }
      },
      error: (err) => {
        this.isLoading = false;

        if (err.status === 401) {
          this.loginError = 'Invalid email or password. Please try again.';
        } else if (err.status === 0) {
          this.loginError = 'Cannot reach the server. Check your connection.';
        } else {
          this.loginError = err?.error?.message || 'Login failed. Please try again.';
        }

        this.cdr.detectChanges();
        this.showError(this.loginError);
        this.submitted = false;
      }
    });
  }
}