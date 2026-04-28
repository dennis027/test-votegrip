import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef,
  Inject,
  PLATFORM_ID
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../../services/auth/auth';

// Custom validator: new_password === confirm_new_password
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('new_password')?.value;
  const cpw = group.get('confirm_new_password')?.value;
  return pw && cpw && pw !== cpw ? { passwordsMismatch: true } : null;
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword implements OnInit {
  form!: FormGroup;
  isLoading = false;
  submitted = false;
  formError = '';
  resetDone = false;

  showNew = false;
  showConfirm = false;

  otpFocused = false;
  newFocused = false;
  confirmFocused = false;

  // OTP digits for the 6-box input
  otpDigits: string[] = ['', '', '', '', '', ''];

  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    const savedEmail = this.getStorageItem('reset_email') ?? '';

    this.form = this.fb.group(
      {
        email: ['', [Validators.required, Validators.email]],
        otp_code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
        new_password: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            Validators.pattern(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9])/)
          ]
        ],
        confirm_new_password: ['', [Validators.required]],
      },
      { validators: passwordsMatch }
    );

    if (savedEmail) {
      this.form.patchValue({ email: savedEmail });
    }
  }

  // ── Browser-safe storage helpers ───────────────────────────────────────────
  private getStorageItem(key: string): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(key);
    }
    return null;
  }

  private removeStorageItem(key: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(key);
    }
  }

  private focusOtpInput(index: number): void {
    if (isPlatformBrowser(this.platformId)) {
      const el = document.getElementById(`otp-${index}`) as HTMLInputElement | null;
      el?.focus();
    }
  }

  clearError(): void {
    this.formError = '';
  }

  toggleNew(): void {
    this.showNew = !this.showNew;
  }

  toggleConfirm(): void {
    this.showConfirm = !this.showConfirm;
  }

  // ── OTP box input handler ──────────────────────────────────────────────────
  onOtpInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const val = input.value.replace(/\D/g, '').slice(-1); // digits only, 1 char

    this.otpDigits[index] = val;
    this.form.patchValue({ otp_code: this.otpDigits.join('') });

    // Auto-focus next box
    if (val && index < 5) {
      this.focusOtpInput(index + 1);
    }
  }

  onOtpKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && !this.otpDigits[index] && index > 0) {
      this.focusOtpInput(index - 1);
    }
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();

    const text = event.clipboardData?.getData('text') ?? '';
    const digits = text.replace(/\D/g, '').slice(0, 6).split('');

    this.otpDigits = ['', '', '', '', '', ''];
    digits.forEach((d, i) => {
      if (i < 6) this.otpDigits[i] = d;
    });

    this.form.patchValue({ otp_code: this.otpDigits.join('') });

    if (digits.length > 0) {
      this.focusOtpInput(Math.min(digits.length, 5));
    }
  }

  // ── Password strength ──────────────────────────────────────────────────────
  get passwordValue(): string {
    return this.form?.get('new_password')?.value ?? '';
  }

  get strength(): number {
    const pw = this.passwordValue;
    if (!pw) return 0;

    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^a-zA-Z0-9]/.test(pw)) s++;

    return s;
  }

  get strengthLabel(): string {
    return ['', 'Weak', 'Fair', 'Good', 'Strong'][this.strength];
  }

  get strengthColor(): string {
    return ['#E2E8F0', '#EF4444', '#F59E0B', '#3B82F6', '#16A34A'][this.strength];
  }

  get hasMinLength(): boolean {
    return this.passwordValue.length >= 8;
  }

  get hasUppercase(): boolean {
    return /[A-Z]/.test(this.passwordValue);
  }

  get hasNumber(): boolean {
    return /[0-9]/.test(this.passwordValue);
  }

  get hasSpecialChar(): boolean {
    return /[^a-zA-Z0-9]/.test(this.passwordValue);
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  onSubmit(): void {
    this.submitted = true;
    this.formError = '';

    if (this.form.invalid) return;

    this.isLoading = true;

    const payload = {
      email: this.form.value.email,
      otp_code: this.form.value.otp_code,
      new_password: this.form.value.new_password,
      confirm_new_password: this.form.value.confirm_new_password,
    };

    this.authService
      .confirmPasswordReset(payload)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.removeStorageItem('reset_email');
          this.resetDone = true;
          this.cdr.detectChanges();
        },
        error: (err) => {
          if (err.status === 400) {
            this.formError = err?.error?.message || 'Invalid or expired OTP code.';
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

  // ── Navigation ─────────────────────────────────────────────────────────────
  goToLogin(): void {
    this.router.navigate(['login']);
  }

  backToRequest(): void {
    this.router.navigate(['/request-reset-password']);
  }
}