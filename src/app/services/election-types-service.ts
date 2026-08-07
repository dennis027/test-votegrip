import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environments';
import { HttpHeaders } from '@angular/common/http';

// Define a model for better type safety
export interface ElectionType {
  id: string | number;
  name: string;
  // add other fields returned by API
}

@Injectable({
  providedIn: 'root',
})
export class ElectionTypesService {
  // Trim trailing slash to prevent double-slash issues in API requests
  private readonly baseUrl = environment.apiUrl.replace(/\/$/, '');
  private readonly electionTypesAPI = `${this.baseUrl}/${environment.apiVersion}/election/currenttypes/`;

  constructor(private http: HttpClient) {}

  
  getElectionTypes(): Observable<any[]> {
    const headers = new HttpHeaders().set('X-Bypass-Auth', 'true');
    return this.http.get<ElectionType[]>(this.electionTypesAPI,{ headers });
  }
}