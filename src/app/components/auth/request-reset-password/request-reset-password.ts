// request-reset-password.ts
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { environment } from '../../../../environments/environments';
import { AuthService } from '../../../services/auth/auth';

@Component({
  selector: 'app-request-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './request-reset-password.html',
  styleUrl: './request-reset-password.css',
})
export class RequestResetPassword implements OnInit {

  form!: FormGroup;
  isLoading  = false;
  submitted  = false;
  formError  = '';
  emailSent  = false;
  emailFocused = false;

  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);

  constructor(
    private fb:     FormBuilder,
    private router: Router,
    private http:   HttpClient,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  clearError(): void { this.formError = ''; }

  onSubmit(): void {
    this.submitted = true;
    this.formError = '';

    if (this.form.invalid) return;

    this.isLoading = true;

    const payload = {
      email:   this.form.value.email,
      channel: 'email',
    };

    this.authService.requestPasswordReset(payload).pipe(finalize(() => { this.isLoading = false; this.cdr.detectChanges(); }))
    .subscribe({
      next: () => {
        this.emailSent = true;
        // Store email so reset page can pre-fill it
        localStorage.setItem('reset_email', this.form.value.email);
        this.cdr.detectChanges();
      },
      error: (err) => {
        if (err.status === 404) {
          this.formError = 'No account found with that email address.';
        } else if (err.status === 0) {
          this.formError = 'Cannot reach the server. Check your connection.';
        } else {
          this.formError = err?.error?.message || 'Something went wrong. Please try again.';
        }
        this.submitted = false;
        this.cdr.detectChanges();
      }
    });
  }


  goToReset(): void {
    this.router.navigate(['/reset-password']);
  }

  backToLogin(): void {
    this.router.navigate(['/login']);
  }
}