import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { AuthService } from '../services/auth/auth';

export const AuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // ✅ Always allow navigation on the server
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  // ✅ Check token only in the browser
  const token = authService.getAccessToken();

  if (token) {
    return true;
  }

  // Redirect to login if no token
  return router.createUrlTree(['/login']);
};