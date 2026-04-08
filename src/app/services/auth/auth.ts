// auth.service.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, tap } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environments';

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
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  // ── Helpers ────────────────────────────────────────────────────────────────

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private getItem(key: string): string | null {
    return this.isBrowser() ? localStorage.getItem(key) : null;
  }

  private setItem(key: string, value: string): void {
    if (this.isBrowser()) localStorage.setItem(key, value);
  }

  private removeItem(key: string): void {
    if (this.isBrowser()) localStorage.removeItem(key);
  }

  private clearSession(): void {
    this.removeItem('access_token');
    this.removeItem('refresh_token');
    this.removeItem('pending_token');
  }

  // Public token accessors
  getAccessToken(): string | null  { return this.getItem('access_token'); }
  getRefreshToken(): string | null { return this.getItem('refresh_token'); }
  getPendingToken(): string | null { return this.getItem('pending_token'); }
  isLoggedIn(): boolean            { return !!this.getAccessToken(); }

  // ── Standard JSON headers ──────────────────────────────────────────────────

  private jsonHeaders(): HttpHeaders {
    return new HttpHeaders({ 'Content-Type': 'application/json' });
  }

  // ── Auth headers using access token (for authenticated requests) ───────────

  private authHeaders(): HttpHeaders {
    const token = this.getAccessToken();
    let headers = this.jsonHeaders();
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  // Login does NOT need Authorization — server returns pending_token on success

  login(payload: { email: string; password: string; channel: string }): Observable<any> {
    return this.http.post<any>(this.loginAPI, payload, {
      headers: this.jsonHeaders()
    }).pipe(
      tap((response) => {
        const pendingToken = response?.data?.pending_token;
        if (pendingToken) {
          this.setItem('pending_token', pendingToken);
        }
      })
    );
  }

  // ── Two-Factor Verify ──────────────────────────────────────────────────────
  // The pending_token is sent as Authorization: Bearer <pending_token>
  // This is what the API expects to identify the in-progress login session.
  // Fix: use pending_token (not access_token) in the Authorization header.

twoFactorVerify(otpCode: string): Observable<any> {
    const pendingToken = this.getPendingToken();

    if (!pendingToken) {
      throw new Error('No pending token found. Please login first.');
    }

    const payload = {
      pending_token: pendingToken,
      otp_code: otpCode
    };

    return this.http.post<any>(this.verify2FaUrl, payload).pipe(
      tap((response) => {
        const accessToken = response?.data?.access;
        const refreshToken = response?.data?.refresh;

        if (accessToken && refreshToken) {
          localStorage.setItem('access_token', accessToken);
          localStorage.setItem('refresh_token', refreshToken);
          localStorage.removeItem('pending_token');
        }
      })
    );
}

  // ── Resend 2FA Code ────────────────────────────────────────────────────────

  resend2FA(): Observable<any> {
    const pendingToken = this.getPendingToken();

    if (!pendingToken) {
      return throwError(() => new Error('No pending token. Please log in first.'));
    }

    const headers = new HttpHeaders({
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${pendingToken}`
    });

    return this.http.post<any>(this.resend2FaUrl, {}, { headers });
  }

  // ── Refresh Access Token ───────────────────────────────────────────────────

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

  // ── Get Profile ────────────────────────────────────────────────────────────

  getProfile(): Observable<any> {
    return this.http.get<any>(this.profileUrl, {
      headers: this.authHeaders()
    });
  }

  // ── Change Password ────────────────────────────────────────────────────────

  changePassword(payload: {
    old_password: string;
    new_password: string;
    confirm_password: string;
  }): Observable<any> {
    return this.http.post<any>(this.changePasswordUrl, payload, {
      headers: this.authHeaders()
    });
  }

  // ── Password Reset Request (email) ─────────────────────────────────────────

  requestPasswordReset(payload: { email: string }): Observable<any> {
    return this.http.post<any>(this.passwordResetRequest, payload, {
      headers: this.jsonHeaders()
    });
  }

  // ── Password Reset Confirm ─────────────────────────────────────────────────

  confirmPasswordReset(payload: {
    token: string;
    new_password: string;
    confirm_password: string;
  }): Observable<any> {
    return this.http.post<any>(this.passwordResetConfirm, payload, {
      headers: this.jsonHeaders()
    });
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  // Fix: logout uses access_token (not pending_token) for Authorization

  logout(): Observable<any> {
    const refreshToken = this.getRefreshToken();

    return this.http.post<any>(
      this.logoutUrl,
      { refresh: refreshToken },
      { headers: this.authHeaders() }  // uses access_token — correct
    ).pipe(
      tap({
        next:  () => this.clearSession(),
        error: () => this.clearSession()  // clear even if server returns an error
      })
    );
  }
}