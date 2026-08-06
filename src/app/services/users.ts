import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, tap, finalize } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environments';
import { AuthService } from './auth/auth';

@Injectable({
  providedIn: 'root',
})
export class UsersService {

    private requestLoginCredentials  = `${environment.apiUrl}/${environment.apiVersion}/auth/candidates/register/`;
    private usersApi                = `${environment.apiUrl}/${environment.apiVersion}/auth/users/?`;
    private approveCandidateUrl         = `${environment.apiUrl}/${environment.apiVersion}/auth/candidates/`;
    private rejectCandidateUrl          = `${environment.apiUrl}/${environment.apiVersion}/auth/candidates/`
    private getOnboardingCandidatesUrl     = `${environment.apiUrl}/${environment.apiVersion}/auth/candidates/registrations/`;

    constructor(
    private http: HttpClient,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}


  requestLoginCred(payload: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  }): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<any>(this.requestLoginCredentials, payload, { headers });
  }


  getUsersList(type:any, candidate_id:any): Observable<any> {
    // build query without candidate_id when it's null/undefined to avoid filtering out results
    const base = `${this.usersApi}type=${encodeURIComponent(type)}`;
    const url = (candidate_id === null || candidate_id === undefined)
      ? base
      : `${base}&candidate_id=${encodeURIComponent(candidate_id)}`;
    const headers = this.authService.getAccessToken()
      ? new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authService.getAccessToken()}`
        })
      : new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.get<any>(url, { headers });
  }

  getOnboardingCandidates(): Observable<any> {
    
    const headers = this.authService.getAccessToken()
      ? new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authService.getAccessToken()}`
        })
      : new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.get<any>(this.getOnboardingCandidatesUrl, { headers });
  }

  approveCandidate(candidateId: string | number): Observable<any> {
    const url = `${this.approveCandidateUrl}${candidateId}/verify/approve/`;
    const headers = this.authService.getAccessToken()
      ? new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authService.getAccessToken()}`
        })
      : new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.post<any>(url, {}, { headers });
  }

  rejectCandidate(candidateId: string | number, rejectionReason?: string): Observable<any> {
    const url = `${this.rejectCandidateUrl}${candidateId}/verify/reject/`;
    const headers = this.authService.getAccessToken()
      ? new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authService.getAccessToken()}`
        })
      : new HttpHeaders({ 'Content-Type': 'application/json' });

    const body = rejectionReason ? { reason: rejectionReason } : {};

    return this.http.post<any>(url, body, { headers });
  }


  
}
