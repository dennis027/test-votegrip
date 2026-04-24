import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, tap, finalize } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environments';

@Injectable({
  providedIn: 'root',
})
export class Users {

    private requestLoginCredentials  = `${environment.apiUrl}/${environment.apiVersion}/auth/candidates/register/`;

    constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}


    requestLoginCred(payload: {
    first_name: string;
    last_name: string;
    email: string;
    phone:string;
  }): Observable<any> {
    return this.http.post<any>(this.requestLoginCredentials, payload);
  }
  
}
