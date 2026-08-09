import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environments';

export interface ExpenseBody {
  id?: string;
  candidate?: string;
  expense_category: string;
  expense_category_display?: string;
  description?: string;
  amount: string; // API returns/accepts amount as string
  incurred_by?: string;
  receipt_url?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  status: string;
  status_display?: string;
  is_active: boolean;
  created_at?: string;
}

@Injectable({ providedIn: 'root' })
export class ExpensesService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/${environment.apiVersion}/campaign/expenses/`; // adjust to your actual endpoint

  getExpensesList() {
    return this.http.get<any>(this.base);
  }

  addExpenseApi(payload: Partial<ExpenseBody>) {
    return this.http.post<ExpenseBody>(this.base, payload);
  }

  updateExpense(id: string, payload: Partial<ExpenseBody>) {
    return this.http.patch<ExpenseBody>(`${this.base}${id}/`, payload);
  }

  deleteExpense(id: string) {
    return this.http.delete(`${this.base}${id}/`);
  }
}