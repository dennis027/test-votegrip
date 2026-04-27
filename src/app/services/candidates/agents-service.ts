import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environments';
import { AuthService } from '../auth/auth';

@Injectable({
  providedIn: 'root',
})
export class AgentsService {
    private addAgentUrl              = `${environment.apiUrl}/${environment.apiVersion}/auth/users/agents/`;

    constructor(
    private http: HttpClient,
     private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

    addAgentApi(payload: any): Observable<any> {
    const url = `${this.addAgentUrl}`;
    const headers = this.authService.getAccessToken()
      ? new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authService.getAccessToken()}`
        })
      : new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<any>(url, payload, { headers });
  }
}
