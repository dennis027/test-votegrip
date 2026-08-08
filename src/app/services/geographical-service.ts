import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environments';

@Injectable({
  providedIn: 'root',
})
export class GeographicalService {
  
  private readonly baseUrl = environment.apiUrl.replace(/\/$/, '');
  private  countyAPI                   = `${this.baseUrl}/${environment.apiVersion}/election/counties/`;
  private  constituenciesAPI           = `${this.baseUrl}/${environment.apiVersion}/election/constituencies/?`;
  private  wardsAPI                    = `${this.baseUrl}/${environment.apiVersion}/election/wards/?`;
  private  politicalPartiesAPI         = `${this.baseUrl}/${environment.apiVersion}/election/parties/`;


    constructor(private http: HttpClient) {}
  
    
    getCounties(): Observable<any[]> {
      return this.http.get<any[]>(this.countyAPI);
    }

    getConstituencies(county:any): Observable<any[]> {
      return this.http.get<any[]>(this.constituenciesAPI+'county_name='+county);
    }

    getWards(constituency:any): Observable<any[]> {
      return this.http.get<any[]>(this.wardsAPI+'constituency_name='+constituency);
    }

    getPoliticalParties(): Observable<any[]> {
      return this.http.get<any[]>(this.politicalPartiesAPI);
    }
}
