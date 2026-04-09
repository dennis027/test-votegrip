// login.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth/auth';
import { finalize } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule   
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login implements OnInit {

  loginForm!: FormGroup;
  selectedRole: 'candidate' | 'agent' | 'coordinator' = 'candidate';
  showPassword = false;
  isLoading = false;
  submitted = false;
  loginError = '';

  emailFocused = false;
  passwordFocused = false;
  private snackBar = inject(MatSnackBar);

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    
    
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email:    ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

   showSuccess(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  showError(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      panelClass: ['error-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  setRole(role: 'candidate' | 'agent' | 'coordinator'): void {
    this.selectedRole = role;
    this.loginError = '';
    document.querySelectorAll('.role-btn').forEach(btn => btn.classList.remove('active'));
    const roleMap: Record<string, number> = { candidate: 0, agent: 1, coordinator: 2 };
    document.querySelectorAll('.role-btn')[roleMap[role]]?.classList.add('active');
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }


  onSubmit(): void {
  this.submitted = true;
  this.loginError = '';

  if (this.loginForm.invalid) {
    this.isLoading = false;
    return;
  }

  this.isLoading = true;

  this.authService.login({
    email: this.loginForm.value.email,
    password: this.loginForm.value.password,
    channel: 'email'
  })
  .pipe(
    finalize(() => {
      this.isLoading = false;
    })
  )
  .subscribe({
    next: () => {
      
      this.router.navigate(['two-factor-auth']);
      console.log('Login successful');
   
      this.showSuccess('Login successful! Please enter the 2FA code sent to your email.');
    },
    error: (err) => {
      console.error('Login error:', err);
      this.loginError = 'Invalid credentials. Please try again.';
      console.error('Login failed:', err);
      this.showError('Login failed. Please check your credentials and try again.');

    }
  });
}

 
}