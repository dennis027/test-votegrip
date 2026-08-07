// src/app/app.config.ts
import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection, inject, PLATFORM_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { isPlatformBrowser } from '@angular/common';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(
      withFetch(),
      withInterceptors([
        (req, next) => {
          const platformId = inject(PLATFORM_ID);

          // Don't attach Authorization for unauthenticated endpoints
          const unauthenticatedPaths = [
            '/auth/candidates/register',
            '/election/currenttypes'
          ];
          const shouldSkipAuth = unauthenticatedPaths.some(p => req.url.includes(p));

          //  Only access localStorage in the browser
          if (isPlatformBrowser(platformId) && !shouldSkipAuth) {
            const token = localStorage.getItem('access_token');
            if (token) {
              const cloned = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${token}`
                }
              });
              return next(cloned);
            }
          }

          return next(req);
        }
      ])
    )
  ]
};