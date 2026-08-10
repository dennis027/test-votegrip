import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environments';
export interface SupplierBody {
  id?: string;
  candidate?: string;
  category: string;
  category_display?: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  status: string;
  status_display?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

@Injectable({ providedIn: 'root' })
export class SuppliersService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/${environment.apiVersion}/campaign/suppliers/`;

  getSuppliersList() {
    return this.http.get<any>(this.base);
  }

  addSupplierApi(payload: Partial<SupplierBody>) {
    return this.http.post<SupplierBody>(this.base, payload);
  }

  updateSupplier(id: string, payload: Partial<SupplierBody>) {
    return this.http.patch<SupplierBody>(`${this.base}${id}/`, payload);
  }

  deleteSupplier(id: string) {
    return this.http.delete(`${this.base}${id}/`);
  }
}