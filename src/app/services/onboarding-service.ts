import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environments';
import { AuthService } from './auth/auth';

@Injectable({
  providedIn: 'root',
})
export class OnboardingService {
  
    private baseUrl = `${environment.apiUrl}/${environment.apiVersion}`;
    private onboardingUrl = `${this.baseUrl}/auth/candidates/election/?`;

    constructor(
        private http: HttpClient,
        private authService: AuthService,
        @Inject(PLATFORM_ID) private platformId: Object
    ) {}

    private get headers(): HttpHeaders {
        const token = this.authService.getAccessToken();
        return token
            ? new HttpHeaders({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` })
            : new HttpHeaders({ 'Content-Type': 'application/json' });
    }

    /** Get onboarding status for the current user */
    postOnBoarding(candidate:any, payload: any): Observable<any> {
        const url = `${this.onboardingUrl}candidate=${candidate}`;
        return this.http.post<any>(url, payload, { headers: this.headers });  
    }
}
