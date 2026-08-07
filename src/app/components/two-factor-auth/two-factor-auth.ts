import { Component, signal, viewChildren, ElementRef, computed, inject, OnDestroy, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DeviceService } from '../../services/device/device-service';

@Component({
  selector: 'app-two-factor-auth',
  standalone: true,
  imports: [CommonModule], 
  templateUrl: './two-factor-auth.html',
  styleUrl: './two-factor-auth.css',
})
export class TwoFactorAuth implements OnInit, OnDestroy {
  otp = signal<string[]>(['', '', '', '', '', '']);
  isSubmitting = signal(false);
  errorMessage = signal('');

  destroyed = false;

  private authService = inject(AuthService);
  private deviceService = inject(DeviceService);
  private route = inject(Router);
  private snackBar = inject(MatSnackBar);
  @Inject(PLATFORM_ID) private platformId = inject(PLATFORM_ID);

  showSuccess(message: string) {
    if (!this.destroyed) {
      this.snackBar.open(message, 'Close', {
        duration: 3000,
        panelClass: ['success-snackbar'],
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
  }

  showError(message: string) {
    if (!this.destroyed) {
      this.snackBar.open(message, 'Close', {
        duration: 4000,
        panelClass: ['error-snackbar'],
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      const pendingKey = localStorage.getItem('pending_token');
      if (!pendingKey?.trim()) {
        this.route.navigate(['login']);
      }
    }
  }

  ngOnDestroy() {
    this.destroyed = true;
  }

  inputs = viewChildren<ElementRef<HTMLInputElement>>('otpInput');
  code = computed(() => this.otp().join(''));

  onInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    const val = input.value.replace(/\D/g, ''); 

    if (val) {
      const char = val.substring(val.length - 1);
      
      this.otp.update(prev => {
        const next = [...prev];
        next[index] = char;
        return next;
      });

      input.value = char;

      if (index < 5) {
        const allInputs = this.inputs();
        if (allInputs[index + 1]) {
          allInputs[index + 1].nativeElement.focus();
        }
      }
    } else {
      this.otp.update(prev => {
        const next = [...prev];
        next[index] = '';
        return next;
      });
    }
    this.errorMessage.set('');
  }

  onKeyDown(event: KeyboardEvent, index: number) {
    if (event.key === 'Backspace') {
      if (!this.otp()[index] && index > 0) {
        this.otp.update(prev => {
          const next = [...prev];
          next[index - 1] = '';
          return next;
        });
        
        const prevInput = this.inputs()[index - 1].nativeElement;
        prevInput.value = '';
        prevInput.focus();
      } else {
        this.otp.update(prev => {
          const next = [...prev];
          next[index] = '';
          return next;
        });
      }
    }
  }

  onPaste(event: ClipboardEvent) {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text') || '';
    const digits = pastedData.replace(/\D/g, '').split('').slice(0, 6);

    this.otp.update(prev => {
      const next = [...prev];
      digits.forEach((d, i) => next[i] = d);
      return next;
    });

    this.inputs().forEach((input, i) => {
      input.nativeElement.value = this.otp()[i];
    });

    const focusIdx = Math.min(digits.length, 5);
    this.inputs()[focusIdx].nativeElement.focus();
  }

  resendCode() {
    this.authService.resend2FA().subscribe({
      next: () => {
        this.showSuccess('A new 2FA code has been sent to your email.');
      },
      error: (err) => {
        this.showError('Failed to resend code. Please try again later.');
      }
    });
  }

  post2FAVerification() {
    if (!this.code() || this.code().length !== 6) {
      this.errorMessage.set('Please enter the 6-digit verification code.');
      return;
    }

    this.errorMessage.set('');
    this.isSubmitting.set(true);

    this.authService.twoFactorVerify(this.code()).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        const role = res.data.user.role.name;
        const dashboardRoute = role === 'admin' ? 'admin-menu/admin-dashboard' : 'main-menu/dashboard';
        this.route.navigate([dashboardRoute]);
        this.showSuccess('2FA verification successful! Welcome to the dashboard.');
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(
          err?.error?.message || 'Invalid code. Please try again.'
        );
        this.showError('2FA verification failed. Please check the code and try again.');
      }
    });
  }
}