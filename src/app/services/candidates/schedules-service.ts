import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environments';

export interface ScheduleBody {
  id?: string;
  candidate?: string;
  activity_name: string;
  activity_type: string;
  activity_type_display?: string;
  description?: string;
  start_time: string; // ISO datetime
  end_time: string;   // ISO datetime
  location?: string | null;
  assigned_to?: string[] | string;
  reminder_sent?: boolean;
  status: string;
  status_display?: string;
  created_by_user?: string;
  created_at?: string;
  updated_at?: string;
}

@Injectable({ providedIn: 'root' })
export class SchedulesService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/schedules/`; // adjust to your actual endpoint

  getSchedulesList() {
    return this.http.get<any>(this.base);
  }

  addScheduleApi(payload: Partial<ScheduleBody>) {
    return this.http.post<ScheduleBody>(this.base, payload);
  }

  updateSchedule(id: string, payload: Partial<ScheduleBody>) {
    return this.http.patch<ScheduleBody>(`${this.base}${id}/`, payload);
  }

  deleteSchedule(id: string) {
    return this.http.delete(`${this.base}${id}/`);
  }
}