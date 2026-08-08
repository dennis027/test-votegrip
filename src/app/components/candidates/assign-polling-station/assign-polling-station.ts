import { ChangeDetectorRef, Component, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { TemplateRef, ViewChild } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { Observable, map, startWith } from 'rxjs';
import { AuthService } from '../../../services/auth/auth';
import { ElectionTypesService } from '../../../services/election-types-service';
import { GeographicalService } from '../../../services/geographical-service';
import { PolingStationService } from '../../../services/poling-station-service';
import {AfterViewInit} from '@angular/core';
import {MatPaginator} from '@angular/material/paginator';
import {MatTableDataSource, MatTableModule} from '@angular/material/table';

export interface polingStationObj {
  polling_station_code: string;
  polling_station_name: string;
  station_type: string;
  assigned_to: string;
}






@Component({
  selector: 'app-assign-polling-station',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatDialogModule,
    MatPaginator,
    MatTableModule
  ],
  templateUrl: './assign-polling-station.html',
  styleUrl: './assign-polling-station.css',
})
export class AssignPollingStation {

    private snackBar = inject(MatSnackBar);
    private cdr      = inject(ChangeDetectorRef);
    private authService = inject(AuthService);
    private router = inject(Router);
    private geographicalService = inject(GeographicalService);
    private electionTypesService = inject(ElectionTypesService);
    private pollingStationService = inject(PolingStationService);
    private platformId = inject(PLATFORM_ID);
    private dialog = inject(MatDialog);
    private fb = inject(FormBuilder);

    profileDesiredPosition: string | null = null;
    electionTypes: any[] = [];
    candidatePolingStations: polingStationObj[] = [ ];

    displayedColumns: string[] = ['polling_station_code', 'polling_station_name', 'station_type', 'assigned_to', 'actions'];
    dataSource = new MatTableDataSource<polingStationObj>(this.candidatePolingStations);

    ngOnInit(): void {
      if (isPlatformBrowser(this.platformId)) {
        this.fetchCandidatePollingStations();
        this.getLogedInUser();
        this.getElectionTypes();
      }
    }

    fetchCandidatePollingStations(): void {
      this.pollingStationService.getCandidatePollingStations().subscribe({
        next: (stations) => {
          this.candidatePolingStations = stations.results;
          this.dataSource.data = this.candidatePolingStations;
          this.cdr.detectChanges();
          console.log('Fetched candidate polling stations:', stations);
        },
        error: (err) => {
          console.error('Error fetching candidate polling stations:', err);
          this.snackBar.open('Failed to fetch candidate polling stations.', 'Close', { duration: 3000 });

          if (err.status === 401) {
            this.authService.clearSession();
            this.router.navigate(['/login']);
          }
        }
      }); 
    }

    getLogedInUser(): any {
      this.authService.getProfile().subscribe({
        next: (user) => {
          this.profileDesiredPosition = user?.data?.profile?.desired_position ?? null;
          console.log('desired position:', this.profileDesiredPosition);
        },
        error: (err) => {
          console.error('Error fetching logged-in user:', err);
        }
      });
    }

    getElectionTypes(): void {
      this.electionTypesService.getElectionTypes().subscribe({
        next: (res: any) => {
          this.electionTypes = res?.results ?? res ?? [];
          this.cdr.markForCheck();
          console.log('Fetched election types:', this.electionTypes);
        },
        error: () => {
          this.showError('Failed to fetch election types. Please try again later.');
          this.cdr.markForCheck();
        }
      });
    }




  showSuccess(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  showError(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      panelClass: ['error-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }


  


  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }


  assignPollingStation(station: polingStationObj) {
    // Implement the logic to assign the polling station to the candidate
    console.log('Assigning polling station:', station);
    this.showSuccess(`Polling station ${station.polling_station_name} assigned successfully.`);
  }
}
