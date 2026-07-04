import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environments';

export interface DocumentBody {
  id?: string;
  candidate?: string;
  document_name: string;
  document_type: string;
  document_type_display?: string;
  file_url: string;
  file_size?: number | null;
  mime_type?: string | null;
  folder_path?: string | null;
  version: number;
  is_public: boolean;
  accessible_to?: string[] | string;
  uploaded_by?: string;
  download_count?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

@Injectable({ providedIn: 'root' })
export class DocumentsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/documents/`; // adjust to your actual endpoint

  getDocumentsList() {
    return this.http.get<any>(this.base);
  }

  addDocumentApi(payload: Partial<DocumentBody>) {
    return this.http.post<DocumentBody>(this.base, payload);
  }

  updateDocument(id: string, payload: Partial<DocumentBody>) {
    return this.http.patch<DocumentBody>(`${this.base}${id}/`, payload);
  }

  deleteDocument(id: string) {
    return this.http.delete(`${this.base}${id}/`);
  }
}