// login.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
// import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule   // ← this fixes "Can't bind to formGroup"
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

  phoneFocused = false;
  passwordFocused = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    // private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      phone:    ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]]
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

    if (this.loginForm.invalid) return;

    this.isLoading = true;

    // Replace with your real auth call:
    // this.authService.login(phone, password, this.selectedRole).subscribe(...)
    setTimeout(() => {
      this.isLoading = false;
      const routes: Record<string, string> = {
        candidate:   '/dashboard/candidate',
        agent:       '/dashboard/agent',
        coordinator: '/dashboard/coordinator'
      };
      this.router.navigate([routes[this.selectedRole]]);
      // On error: this.loginError = 'Invalid credentials. Please try again.';
    }, 1500);
  }
}