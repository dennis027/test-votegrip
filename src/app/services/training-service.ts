// services/training/training-service.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environments';
import { AuthService } from './auth/auth';

@Injectable({
  providedIn: 'root',
})
export class TrainingService {
  private baseUrl = `${environment.apiUrl}/${environment.apiVersion}`;

  private modulesUrl   = `${this.baseUrl}/training/modules/`;
  private progressUrl  = `${this.baseUrl}/training/progress/`;
  private summaryUrl   = `${this.baseUrl}/training/progress/summary/`;
  private checklistUrl = `${this.baseUrl}/training/checklists/`;

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

  // ── Modules ────────────────────────────────────────────────────────────────

  /** List all active training modules */
  getModules(): Observable<any> {
    return this.http.get<any>(this.modulesUrl, { headers: this.headers });
  }

  /** Get a single module */
  getModule(id: string): Observable<any> {
    return this.http.get<any>(`${this.modulesUrl}${id}/`, { headers: this.headers });
  }

  /** Create a new training module (admin only) */
  createModule(payload: any): Observable<any> {
    return this.http.post<any>(this.modulesUrl, payload, { headers: this.headers });
  }

  /** Update a training module (admin only) */
  updateModule(id: string, payload: any): Observable<any> {
    return this.http.patch<any>(`${this.modulesUrl}${id}/`, payload, { headers: this.headers });
  }

  /** Soft-delete a training module (admin only) */
  deleteModule(id: string): Observable<any> {
    return this.http.delete<any>(`${this.modulesUrl}${id}/`, { headers: this.headers });
  }

  // ── Progress ───────────────────────────────────────────────────────────────

  /** List all progress records (agents see own; admins see all) */
  getProgress(): Observable<any> {
    return this.http.get<any>(this.progressUrl, { headers: this.headers });
  }

  /** Get progress summary (not_started / in_progress / completed / failed) */
  getProgressSummary(): Observable<any> {
    return this.http.get<any>(this.summaryUrl, { headers: this.headers });
  }

  /** Create a new progress record */
  createProgress(payload: any): Observable<any> {
    return this.http.post<any>(this.progressUrl, payload, { headers: this.headers });
  }

  /** Mark a progress record as complete */
  completeProgress(id: string): Observable<any> {
    return this.http.post<any>(`${this.progressUrl}${id}/complete/`, {}, { headers: this.headers });
  }

  // ── Checklists ─────────────────────────────────────────────────────────────

  /** List checklists */
  getChecklists(): Observable<any> {
    return this.http.get<any>(this.checklistUrl, { headers: this.headers });
  }

  /** Create a checklist */
  createChecklist(payload: any): Observable<any> {
    return this.http.post<any>(this.checklistUrl, payload, { headers: this.headers });
  }

  /** Get a single checklist */
  getChecklist(id: string): Observable<any> {
    return this.http.get<any>(`${this.checklistUrl}${id}/`, { headers: this.headers });
  }

  /** Verify / mark checklist as complete (admin only) */
  verifyChecklist(id: string): Observable<any> {
    return this.http.post<any>(`${this.checklistUrl}${id}/verify/`, {}, { headers: this.headers });
  }
}