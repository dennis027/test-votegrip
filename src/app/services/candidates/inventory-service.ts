import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environments';

export interface InventoryBody {
  id?: string;
  candidate?: string;
  item_name: string;
  item_type: string;
  item_type_display?: string;
  quantity_total: number;
  quantity_distributed?: number;
  quantity_remaining?: number;
  is_active: boolean;
  created_at?: string;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/inventory/`; // adjust to your actual endpoint

  getInventoryList() {
    return this.http.get<any>(this.base);
  }

  addInventoryApi(payload: Partial<InventoryBody>) {
    return this.http.post<InventoryBody>(this.base, payload);
  }

  updateInventory(id: string, payload: Partial<InventoryBody>) {
    return this.http.patch<InventoryBody>(`${this.base}${id}/`, payload);
  }

  deleteInventory(id: string) {
    return this.http.delete(`${this.base}${id}/`);
  }
}