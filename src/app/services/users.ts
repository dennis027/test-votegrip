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
    const url = `${this.usersApi}type=${type}&candidate_id=${candidate_id}`;
    const headers = this.authService.getAccessToken()
      ? new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authService.getAccessToken()}`
        })
      : new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.get<any>(url, { headers });
  }

  approveCandidate(candidateId: number): Observable<any> {
    const url = `${this.approveCandidateUrl}${candidateId}/verify/approve/`;
    const headers = this.authService.getAccessToken()
      ? new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authService.getAccessToken()}`
        })
      : new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.post<any>(url, {}, { headers });
  }

  rejectCandidate(candidateId: number): Observable<any> {
    const url = `${this.rejectCandidateUrl}${candidateId}/verify/reject/`;
    const headers = this.authService.getAccessToken()
      ? new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authService.getAccessToken()}`
        })
      : new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.post<any>(url, {}, { headers });
  }   


  
}
