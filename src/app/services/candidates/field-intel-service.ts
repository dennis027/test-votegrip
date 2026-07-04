import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environments';

export interface FieldIntelBody {
  id?: string;
  candidate?: string;
  polling_station: string;
  classification: string;
  classification_display?: string;
  risk_level: string;
  risk_level_display?: string;
  notes?: string;
  classified_by?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

@Injectable({ providedIn: 'root' })
export class FieldIntelService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/field-intel/`; // adjust to your actual endpoint

  getFieldIntelList() {
    return this.http.get<any>(this.base);
  }

  addFieldIntelApi(payload: Partial<FieldIntelBody>) {
    return this.http.post<FieldIntelBody>(this.base, payload);
  }

  updateFieldIntel(id: string, payload: Partial<FieldIntelBody>) {
    return this.http.patch<FieldIntelBody>(`${this.base}${id}/`, payload);
  }

  deleteFieldIntel(id: string) {
    return this.http.delete(`${this.base}${id}/`);
  }
}