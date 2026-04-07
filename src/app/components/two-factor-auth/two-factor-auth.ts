import { Component, signal, viewChildren, ElementRef, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-two-factor-auth',
  standalone: true,
  // REMOVE FormsModule from here
  imports: [CommonModule], 
  templateUrl: './two-factor-auth.html',
  styleUrl: './two-factor-auth.css',
})
export class TwoFactorAuth {
  otp = signal<string[]>(['', '', '', '', '', '']);
  isSubmitting = signal(false);
  errorMessage = signal('');

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
    this.otp.set(['', '', '', '', '', '']);
    this.inputs().forEach(i => i.nativeElement.value = '');
    this.inputs()[0].nativeElement.focus();
  }
}