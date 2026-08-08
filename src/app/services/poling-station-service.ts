import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environments';
import { AuthService } from './auth/auth';


@Injectable({
  providedIn: 'root',
})
export class PolingStationService {
  private baseUrl = `${environment.apiUrl}/${environment.apiVersion}`;
  private candidatePollingStations   = `${this.baseUrl}/campaign/polling-stations-agents/`;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  private get headers(): HttpHeaders {
    const token = this.authService.getAccessToken();
    return token
      ? new HttpHeaders({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` })
      : new HttpHeaders({ 'Content-Type': 'application/json' });
  }

  /** Get polling stations for a candidate */
  getCandidatePollingStations(): Observable<any> {
    return this.http.get<any>(`${this.candidatePollingStations}`, { headers: this.headers });
  }

}
