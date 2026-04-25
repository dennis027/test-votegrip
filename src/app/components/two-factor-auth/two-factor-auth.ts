import { Component, signal, viewChildren, ElementRef, computed, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth';
import { MatSnackBar } from '@angular/material/snack-bar';

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

  private route = inject(Router);

  private snackBar = inject(MatSnackBar);
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
    const pendingKey = localStorage.getItem('pending_token');
    if (!pendingKey?.trim()) {
      this.route.navigate(['login']);
    }
  }

  ngOnDestroy() {
    this.destroyed = true;
  }


  // Use the #otpInput reference from the HTML
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

      // Crucial: Manually set the value to prevent the "double-digit" bug
      input.value = char;

      if (index < 5) {
        // Safe access to the next input via signals
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
      // If current box is empty, move focus back and clear previous
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
        // Just clear current box
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

    // Update physical DOM values
    this.inputs().forEach((input, i) => {
      input.nativeElement.value = this.otp()[i];
    });

    const focusIdx = Math.min(digits.length, 5);
    this.inputs()[focusIdx].nativeElement.focus();
  }

  verifyCode() {
    if (this.code().length !== 6) {
      this.errorMessage.set('Please enter all 6 digits.');
      return;
    }
    this.isSubmitting.set(true);
    // Simulate API call
    setTimeout(() => {
      this.isSubmitting.set(false);
      console.log('Verified:', this.code());
    }, 1500);
  }

  resendCode() {
    this.authService.resend2FA().subscribe({
      next: () => {
        this.showSuccess('A new 2FA code has been sent to your email.');
      },
      error: (err) => {
        console.error('Failed to resend 2FA code:', err);
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

  this.authService.twoFactorVerify(this.code()).subscribe({
    next: (res) => {
      const role = res.data.user.role.name;
      const dashboardRoute = role === 'admin' ? 'admin-menu/admin-dashboard' : 'main-menu/dashboard';
      this.route.navigate([dashboardRoute]);
      this.showSuccess('2FA verification successful! Welcome to the dashboard.');
    },
    error: (err) => {
      console.error('2FA verification failed:', err);
      this.errorMessage.set(
        err?.error?.message || 'Invalid code. Please try again.'
      );
      this.showError('2FA verification failed. Please check the code and try again.');
    }
  });
}
}