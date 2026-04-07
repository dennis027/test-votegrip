import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip auth for requests that explicitly ask to skip it
    if (req.headers.has('X-Skip-Auth')) {
      const cleanReq = req.clone({
        headers: req.headers.delete('X-Skip-Auth')
      });
      return next.handle(cleanReq);
    }

    // Only attach token in browser
    const token = isPlatformBrowser(this.platformId)
      ? localStorage.getItem('access_token')
      : null;

    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(req);
  }
}