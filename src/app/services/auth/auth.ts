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
  private logoutUrl = `${environment.apiUrl}/${environment.apiVersion}/auth/logout/`;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  /**
   * LOGIN
   * No Authorization header
   * No custom headers
   */
  login(payload: { email: string; password: string; channel: string }): Observable<any> {
    return this.http.post<any>(this.loginAPI, payload, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    });
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