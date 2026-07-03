import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, tap, finalize } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environments';
import { DeviceService } from '../device/device-service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private loginAPI              = `${environment.apiUrl}/${environment.apiVersion}/auth/login/`;
  private verify2FaUrl          = `${environment.apiUrl}/${environment.apiVersion}/auth/mfa/verify/`;
  private resend2FaUrl          = `${environment.apiUrl}/${environment.apiVersion}/auth/mfa/resend/`;
  private refreshTokenUrl       = `${environment.apiUrl}/${environment.apiVersion}/auth/token/refresh/`;
  private profileUrl            = `${environment.apiUrl}/${environment.apiVersion}/auth/me/`;
  private changePasswordUrl     = `${environment.apiUrl}/${environment.apiVersion}/auth/password/change/`;
  private passwordResetRequest  = `${environment.apiUrl}/${environment.apiVersion}/auth/password/reset/request/`;
  private passwordResetConfirm  = `${environment.apiUrl}/${environment.apiVersion}/auth/password/reset/confirm/`;
  private logoutUrl             = `${environment.apiUrl}/${environment.apiVersion}/auth/logout/`;

  constructor(
    private http: HttpClient,
    private deviceService: DeviceService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private setItem(key: string, value: string): void {
    if (this.isBrowser()) {
      localStorage.setItem(key, value);
      console.log(`✅ Stored ${key}`);
    }
  }

  private getItem(key: string): string | null {
    return this.isBrowser() ? localStorage.getItem(key) : null;
  }

  private removeItem(key: string): void {
    if (this.isBrowser()) localStorage.removeItem(key);
  }

  getAccessToken(): string | null  { return this.getItem('access_token'); }
  getRefreshToken(): string | null { return this.getItem('refresh_token'); }
  getPendingToken(): string | null { return this.getItem('pending_token'); }
  isLoggedIn(): boolean            { return !!this.getAccessToken(); }

  private jsonHeaders(): HttpHeaders {
    return new HttpHeaders({ 'Content-Type': 'application/json' });
  }

  private authHeaders(): HttpHeaders {
    const token = this.getAccessToken();
    let headers = this.jsonHeaders();
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }

  clearSession(): void {
    if (this.isBrowser()) {
      this.removeItem('access_token');
      this.removeItem('refresh_token');
      this.removeItem('pending_token');
      console.log('🗑️ Session cleared');
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LOGIN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  login(payload: { email: string; password: string; channel?: string }): Observable<any> {
    this.clearSession();

    const deviceId = this.deviceService.getDeviceId();

    const loginPayload = {
      email: payload.email,
      password: payload.password,
      device_id: deviceId,
      channel: payload.channel || 'email'
    };

    console.log('📤 Sending login with device_id:', deviceId);

    return this.http.post<any>(this.loginAPI, loginPayload, {
      headers: this.jsonHeaders()
    }).pipe(
      tap((response) => {
        console.log('📥 Login response received:', response);

        // CASE 1: Known device - verified = true
        if (response?.data?.verified === true) {
          console.log('✅ Device verified = true');
          const accessToken = response?.data?.access;
          const refreshToken = response?.data?.refresh;

          console.log('Access token:', accessToken ? '✅ exists' : '❌ missing');
          console.log('Refresh token:', refreshToken ? '✅ exists' : '❌ missing');

          if (accessToken) this.setItem('access_token', accessToken);
          if (refreshToken) this.setItem('refresh_token', refreshToken);
        }
        // CASE 2: New device - requires OTP
        else if (response?.data?.requires_otp === true || response?.data?.verified === false) {
          console.log('⏳ New device - requires OTP');
          const pendingToken = response?.data?.pending_token;
          if (pendingToken) {
            this.setItem('pending_token', pendingToken);
          }
        }
      })
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2FA VERIFY
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  twoFactorVerify(otpCode: string): Observable<any> {
    const pendingToken = this.getPendingToken();
    const deviceId = this.deviceService.getDeviceId();

    if (!pendingToken) {
      return throwError(() => new Error('No pending token found. Please login first.'));
    }

    const payload = {
      otp_code: otpCode,
      pending_token: pendingToken,
      device_id: deviceId
    };

    console.log('📤 2FA verify with device_id:', deviceId);

    return this.http.post<any>(this.verify2FaUrl, payload, {
      headers: this.jsonHeaders()
    }).pipe(
      tap((response) => {
        console.log('📥 2FA response:', response);
        const accessToken = response?.data?.access;
        const refreshToken = response?.data?.refresh;

        if (accessToken) this.setItem('access_token', accessToken);
        if (refreshToken) this.setItem('refresh_token', refreshToken);
        this.removeItem('pending_token');
      })
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RESEND 2FA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  resend2FA(): Observable<any> {
    const pendingToken = this.getPendingToken();
    const deviceId = this.deviceService.getDeviceId();

    if (!pendingToken) {
      return throwError(() => new Error('No pending token. Please log in first.'));
    }

    return this.http.post<any>(this.resend2FaUrl, {
      pending_token: pendingToken,
      device_id: deviceId,
      channel: 'email'
    }, {
      headers: this.jsonHeaders()
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // REFRESH TOKEN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  refreshToken(): Observable<any> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available.'));
    }

    return this.http.post<any>(
      this.refreshTokenUrl,
      { refresh: refreshToken },
      { headers: this.jsonHeaders() }
    ).pipe(
      tap((response) => {
        const newAccessToken = response?.data?.access_token;
        if (newAccessToken) {
          this.setItem('access_token', newAccessToken);
        }
      })
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GET PROFILE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  getProfile(): Observable<any> {
    return this.http.get<any>(this.profileUrl, {
      headers: this.authHeaders()
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CHANGE PASSWORD
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  changePassword(payload: {
    old_password: string;
    new_password: string;
    confirm_password: string;
  }): Observable<any> {
    return this.http.post<any>(this.changePasswordUrl, payload, {
      headers: this.authHeaders()
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PASSWORD RESET
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  requestPasswordReset(payload: { email: string }): Observable<any> {
    this.clearSession();
    return this.http.post<any>(this.passwordResetRequest, payload, {
      headers: this.jsonHeaders()
    });
  }

  confirmPasswordReset(payload: {
    email: string;
    otp_code: string;
    new_password: string;
    confirm_new_password: string;
  }): Observable<any> {
    this.clearSession();
    return this.http.post<any>(this.passwordResetConfirm, payload, {
      headers: this.jsonHeaders()
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LOGOUT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  logout(): Observable<any> {
    const refreshToken = this.getRefreshToken();

    return this.http.post<any>(
      this.logoutUrl,
      { refresh: refreshToken },
      { headers: this.authHeaders() }
    ).pipe(
      finalize(() => this.clearSession())
    );
  }
}