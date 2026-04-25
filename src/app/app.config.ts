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
          
          // ✅ Only access localStorage in the browser
          if (isPlatformBrowser(platformId)) {
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