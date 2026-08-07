import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth/auth';


@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private authService = inject(AuthService);
  private router = inject(Router);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const unauthenticatedPaths = [
      '/auth/candidates/register',
      '/election/currenttypes'
    ];

    const shouldSkipAuth = unauthenticatedPaths.some(p => req.url.includes(p));

    let cloned = req;

    if (shouldSkipAuth) {
      // Explicitly strip Authorization in case another interceptor already added it
      cloned = req.clone({ headers: req.headers.delete('Authorization') });
    } else {
      const token = this.authService.getAccessToken();
      if (token) {
        cloned = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
      }
    }

    return next.handle(cloned).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !shouldSkipAuth) {
          this.authService.logout();
          this.router.navigateByUrl('login', { replaceUrl: true });
        }
        return throwError(() => error);
      })
    );
  }
}