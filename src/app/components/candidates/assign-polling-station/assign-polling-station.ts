import { ChangeDetectorRef, Component, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../services/auth/auth';
import { ElectionTypesService } from '../../../services/election-types-service';
import { PolingStationService } from '../../../services/poling-station-service';
import { PollingStationTable } from './polling-station-table/polling-station-table';
import { AgentsService } from '../../../services/candidates/agents-service';
import { UsersService } from '../../../services/users';

export interface polingStationObj {
  id?: string;
  polling_station_code: string;
  polling_station_name: string;
  ward_name: string;
  constituency_name: string;
  county_name: string;
  region_name?: string;
  assigned_to: string | null;
  assigned_by?: string | null;
  assigned_date?: string | null;
  station_type: string;
  station_type_display?: string;
  expected_voters?: number | null;
}

type GeographyScope = 'national' | 'county' | 'constituency' | 'ward' | 'none' | null;
type AssignedFilter = 'all' | 'unassigned' | 'assigned';

export interface PollingStationGroupNode {
  label: string;
  levelKey: 'county' | 'constituency' | 'ward';
  stations: polingStationObj[];
  children: PollingStationGroupNode[];
  isLeaf: boolean;
  totalCount: number;
  unassignedCount: number;
}

@Component({
  selector: 'app-assign-polling-station',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatExpansionModule,
    MatButtonToggleModule,
    MatIconModule,
    PollingStationTable,
  ],
  templateUrl: './assign-polling-station.html',
  styleUrl: './assign-polling-station.css',
})
export class AssignPollingStation {

  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  private router = inject(Router);
  private electionTypesService = inject(ElectionTypesService);
  private pollingStationService = inject(PolingStationService);
  private userService = inject(UsersService);
  private platformId = inject(PLATFORM_ID);

  // ── Raw data ────────────────────────────────────────────────────────
  candidatePolingStations: polingStationObj[] = [];
  electionTypes: any[] = [];
  profileDesiredPosition: string | null = null;
  matchedPositionType: any = null;
  geographyScope: GeographyScope = null;

  // ── Loading guards (avoid the race condition covered earlier) ────────
  stationsLoaded = false;
  electionTypesLoaded = false;
  profileLoaded = false;

  get isLoading(): boolean {
    return !(this.stationsLoaded && this.electionTypesLoaded && this.profileLoaded);
  }

  // ── Filters ─────────────────────────────────────────────────────────
  searchTerm = '';
  assignedFilter: AssignedFilter = 'all';

  // ── Derived state ───────────────────────────────────────────────────
  groupLevels: Array<'county_name' | 'constituency_name' | 'ward_name'> = [];
  groupTree: PollingStationGroupNode[] = [];
  flatStations: polingStationObj[] = [];

  totalStations = 0;
  totalUnassigned = 0;
  currentCandidateId: string | null = null;
  candidatesAgents: any[] = [];

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.fetchCandidatePollingStations();
    this.getLoggedInUser();
    this.getElectionTypes();

  }

  

  // ── Data loading ────────────────────────────────────────────────────
  fetchCandidatePollingStations(): void {
    this.pollingStationService.getCandidatePollingStations("","","").subscribe({
      next: (res: any) => {
        this.candidatePolingStations = res?.results ?? res ?? [];
        this.stationsLoaded = true;
        this.totalStations = this.candidatePolingStations.length;
        this.totalUnassigned = this.candidatePolingStations.filter(s => !s.assigned_to).length;
        this.rebuildView();
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error fetching candidate polling stations:', err);
        this.snackBar.open('Failed to fetch candidate polling stations.', 'Close', { duration: 3000 });
        this.stationsLoaded = true;

        if (err.status === 401) {
          this.authService.clearSession();
          this.router.navigate(['/login']);
        }
        this.cdr.markForCheck();
      }
    });
  }

  getLoggedInUser(): void {
    this.authService.getProfile().subscribe({
      next: (user: any) => {
        this.profileDesiredPosition = user?.data?.profile?.desired_position ?? null;
        this.currentCandidateId = user?.data?.id ?? null;
        console.log('Logged-in user profile fetched successfully:', this.currentCandidateId);
        this.getUserAgents();
        this.profileLoaded = true;
        this.resolveGeographyScope();
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error fetching logged-in user:', err);
        this.profileLoaded = true;
        this.cdr.markForCheck();
      }
    });
  }

  getElectionTypes(): void {
    this.electionTypesService.getElectionTypes().subscribe({
      next: (res: any) => {
        this.electionTypes = res?.results ?? res ?? [];
        this.electionTypesLoaded = true;
        this.resolveGeographyScope();
        this.cdr.markForCheck();
      },
      error: () => {
        this.showError('Failed to fetch election types. Please try again later.');
        this.electionTypesLoaded = true;
        this.resolveGeographyScope();
        this.cdr.markForCheck();
      }
    });
  }

  // ── Scope resolution → grouping levels ─────────────────────────────
  private resolveGeographyScope(): void {
    if (!this.profileLoaded || !this.electionTypesLoaded) return;
    if (!this.profileDesiredPosition || !this.electionTypes.length) return;

    const match = this.electionTypes.find(
      (et: any) => et.name?.trim().toLowerCase() === this.profileDesiredPosition!.trim().toLowerCase()
    );

    this.matchedPositionType = match ?? null;
    this.geographyScope = this.mapToScope(match);
    this.groupLevels = this.mapScopeToLevels(this.geographyScope);

    this.rebuildView();
  }

  private mapToScope(match: any): GeographyScope {
    if (!match) return null;
    const scope = (match.scope || match.scope_display || '').toString().trim().toLowerCase();

    switch (scope) {
      case 'national': return 'national';
      case 'county': return 'county';
      case 'constituency': return 'constituency';
      case 'ward': return 'ward';
      default: return 'none';
    }
  }

  private mapScopeToLevels(scope: GeographyScope): Array<'county_name' | 'constituency_name' | 'ward_name'> {
    switch (scope) {
      case 'national':
        return ['county_name', 'constituency_name', 'ward_name'];
      case 'county':
        return ['constituency_name', 'ward_name'];
      case 'constituency':
        return ['ward_name'];
      case 'ward':
      case 'none':
      default:
        return []; // flat — no grouping needed
    }
  }

  // ── Filtering + tree building ──────────────────────────────────────
  onSearchChange(term: string): void {
    this.searchTerm = (term || '').toLowerCase().trim();
    this.rebuildView();
  }

  onAssignedFilterChange(filter: AssignedFilter): void {
    this.assignedFilter = filter;
    this.rebuildView();
  }

  private rebuildView(): void {
    if (!this.stationsLoaded) return;

    let filtered = this.candidatePolingStations;

    if (this.assignedFilter === 'unassigned') {
      filtered = filtered.filter(s => !s.assigned_to);
    } else if (this.assignedFilter === 'assigned') {
      filtered = filtered.filter(s => !!s.assigned_to);
    }

    if (this.searchTerm) {
      const term = this.searchTerm;
      filtered = filtered.filter(s =>
        s.polling_station_name?.toLowerCase().includes(term) ||
        s.polling_station_code?.toLowerCase().includes(term) ||
        s.ward_name?.toLowerCase().includes(term) ||
        s.constituency_name?.toLowerCase().includes(term) ||
        s.county_name?.toLowerCase().includes(term)
      );
    }

    this.flatStations = filtered;

    this.groupTree = this.groupLevels.length
      ? this.buildGroupTree(filtered, this.groupLevels, 0)
      : [];

    this.cdr.markForCheck();
  }

  private buildGroupTree(
    stations: polingStationObj[],
    levels: Array<'county_name' | 'constituency_name' | 'ward_name'>,
    idx: number
  ): PollingStationGroupNode[] {
    const levelKeyRaw = levels[idx];
    const map = new Map<string, polingStationObj[]>();

    stations.forEach(s => {
      const key = (s as any)[levelKeyRaw] || 'Unassigned Area';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });

    const isLeaf = idx === levels.length - 1;
    const levelKey = levelKeyRaw.replace('_name', '') as 'county' | 'constituency' | 'ward';

    const nodes: PollingStationGroupNode[] = Array.from(map.entries()).map(([label, subset]) => ({
      label,
      levelKey,
      stations: subset,
      children: isLeaf ? [] : this.buildGroupTree(subset, levels, idx + 1),
      isLeaf,
      totalCount: subset.length,
      unassignedCount: subset.filter(s => !s.assigned_to).length,
    }));

    nodes.sort((a, b) => a.label.localeCompare(b.label));
    return nodes;
  }

  // ── Actions ─────────────────────────────────────────────────────────
  assignPollingStation(station: polingStationObj): void {
    // TODO: replace with real assignment endpoint once confirmed
    console.log('Assigning polling station:', station);
    this.showSuccess(`Polling station ${station.polling_station_name} assigned successfully.`);
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


getUserAgents(): void {
  this.userService
    .getUsersList('agent', this.currentCandidateId)
    .subscribe({
      next: (res: any) => {
        console.log('User agents fetched successfully:', res);

        this.candidatesAgents = res?.data ?? [];

        console.log('Candidates Agents:', this.candidatesAgents);

        // Tell Angular the input value has changed
        this.cdr.detectChanges();
      },

      error: (err) => {
        console.error('Error fetching user agents:', err);
        this.showError(
          'Failed to fetch user agents. Please try again later.'
        );
      }
    });
}


}