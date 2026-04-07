import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environments';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private loginAPI = `${environment.apiUrl}/${environment.apiVersion}/auth/login/`;
  private verify2Fa = `${environment.apiUrl}/${environment.apiVersion}/auth/mfa/verify/`;
  private resend2Fa = `${environment.apiUrl}/${environment.apiVersion}/auth/mfa/resend/`;
  private refreshTokenUrl = `${environment.apiUrl}/${environment.apiVersion}/auth/token/refresh/`;
  private profileUrl = `${environment.apiUrl}/${environment.apiVersion}/auth/me/`;
  private changePasswordUrlInHouse = `${environment.apiUrl}/${environment.apiVersion}/auth/password/change/`;
  private passwordResetRequesEmail = `${environment.apiUrl}/${environment.apiVersion}/auth/password/reset/request/`;
  private passwordResetConfirm = `${environment.apiUrl}/${environment.apiVersion}/auth/password/reset/confirm/`;
  private logoutUrl = `${environment.apiUrl}/${environment.apiVersion}/auth/logout/`;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  login(payload: { email: string; password: string; channel: string }): Observable<any> {
    return this.http.post<any>(this.loginAPI, payload, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    }).pipe(
      tap((response) => {
        const pendingToken = response?.data?.pending_token;

        if (pendingToken) {
          localStorage.setItem('pending_token', pendingToken);
        }
      })
    );
  }

  getAccessToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('access_token');
    }
    return null;
  }

  logout(): Observable<any> {
    const accessToken = this.getAccessToken();
    const refreshToken = isPlatformBrowser(this.platformId)
      ? localStorage.getItem('refresh_token')
      : null;

    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    if (accessToken) {
      headers = headers.set('Authorization', `Bearer ${accessToken}`);
    }

    const body = { refresh: refreshToken };

    return this.http.post<any>(this.logoutUrl, body, { headers }).pipe(
      tap({
        next: () => {
          if (isPlatformBrowser(this.platformId)) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
          }
        },
        error: () => {
          if (isPlatformBrowser(this.platformId)) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
          }
        }
      })
    );
  }
}