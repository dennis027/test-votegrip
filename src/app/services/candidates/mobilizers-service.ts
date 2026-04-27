import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environments';
import { AuthService } from '../auth/auth';

@Injectable({
  providedIn: 'root',
})
export class MobilizersService {
  
      private mobilizersUrl  = `${environment.apiUrl}/${environment.apiVersion}/mobilizers/`;

    constructor(
    private http: HttpClient,
     private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  addMobilizerApi(payload: any): Observable<any> {
    const url = `${this.mobilizersUrl}`;
    const headers = this.authService.getAccessToken()
      ? new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authService.getAccessToken()}`
        })
      : new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<any>(url, payload, { headers });
  }
  getMobilizersList(): Observable<any> {
    const url = `${this.mobilizersUrl}`;
    const headers = this.authService.getAccessToken()
      ? new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authService.getAccessToken()}`
        })
      : new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.get<any>(url, { headers });
  }

  getSingleMobilizer(mobilizerId: number): Observable<any> {
    const url = `${this.mobilizersUrl}${mobilizerId}/`;
    const headers = this.authService.getAccessToken()
      ? new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authService.getAccessToken()}`
        })
      : new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.get<any>(url, { headers });
  }       

  updateMobilizer(mobilizerId: number, payload: any): Observable<any> {
    const url = `${this.mobilizersUrl}${mobilizerId}/`;
    const headers = this.authService.getAccessToken()
      ? new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authService.getAccessToken()}`
        })
      : new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.patch<any>(url, payload, { headers });
  }

  deleteMobilizer(mobilizerId: number): Observable<any> {
    const url = `${this.mobilizersUrl}${mobilizerId}/`;
    const headers = this.authService.getAccessToken()
      ? new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authService.getAccessToken()}`
        })
      : new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.delete<any>(url, { headers });
  }   


}
