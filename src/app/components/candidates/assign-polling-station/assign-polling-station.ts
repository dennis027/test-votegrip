import { ChangeDetectorRef, Component, inject, PLATFORM_ID, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth/auth';
import { ElectionTypesService } from '../../../services/election-types-service';
import { GeographicalService } from '../../../services/geographical-service';
import { PolingStationService } from '../../../services/poling-station-service';
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
  assignment_status?: 'pending' | 'active' | 'reassigned' | 'withdrawn' | null;
}

type GeographyScope = 'national' | 'county' | 'constituency' | 'ward' | 'none' | null;
type AssignedFilter = 'all' | 'unassigned' | 'assigned';
type DialogMode = 'assign' | 'reassign';

interface TreeNode {
  key: string;
  name: string;
  level: 'county' | 'constituency' | 'ward';
  isLeaf: boolean;
  countyName?: string;
  constituencyName?: string;

  expanded: boolean;
  childrenLoaded: boolean;
  loadingChildren: boolean;
  children: TreeNode[];
  childSearchTerm: string; // filters `children` by name (county → constituencies, constituency → wards)

  // leaf (ward) only
  stationsLoaded: boolean;
  stationsLoading: boolean;
  stations: polingStationObj[];
  totalCount: number;
  unassignedCount: number;

  // per-node UI filters (leaf only)
  searchTerm: string;
  assignedFilter: AssignedFilter;
}

@Component({
  selector: 'app-assign-polling-station',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatExpansionModule,
    MatButtonToggleModule,
    MatIconModule,
    MatProgressBarModule,
    MatDialogModule,
    MatRadioModule,
    MatFormFieldModule,
    MatInputModule,
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
  private geographicalService = inject(GeographicalService);
  private pollingStationService = inject(PolingStationService);
  private agentsService = inject(AgentsService);
  private userService = inject(UsersService);
  private platformId = inject(PLATFORM_ID);
  private dialog = inject(MatDialog);

  @ViewChild('agentAssignDialog') agentAssignDialogTpl!: TemplateRef<any>;

  // ── Profile / scope context ────────────────────────────────────────
  currentCandidateId: string | null = null;
  profileDesiredPosition: string | null = null;
  electionTypes: any[] = [];
  matchedPositionType: any = null;
  geographyScope: GeographyScope = null;

  candidateCounty: string | null = null;
  candidateConstituency: string | null = null;
  candidateWard: string | null = null;

  candidatesAgents: any[] = [];

  profileLoaded = false;
  electionTypesLoaded = false;

  get isInitializing(): boolean {
    return !(this.profileLoaded && this.electionTypesLoaded);
  }

  // ── Headline stat: total stations, fetched WITHOUT any filter params ──
  totalStationsOverall: number | null = null;

  // ── Tree ────────────────────────────────────────────────────────────
  rootNodes: TreeNode[] = [];
  rootLoading = false;
  rootSearchTerm = ''; // filters rootNodes by name (counties, or constituencies/wards depending on scope)

  // ── Root-level pagination (national scope: counties list can be 47+ items) ─
  rootPageIndex = 0;
  rootPageSize = 10;
  rootPageSizeOptions = [10, 20, 30, 40, 50];

  get isNationalRoot(): boolean {
    return this.geographyScope === 'national';
  }

  get rootFilteredNodes(): TreeNode[] {
    return this.getVisibleRootNodes();
  }

  get rootTotalPages(): number {
    return Math.max(1, Math.ceil(this.rootFilteredNodes.length / this.rootPageSize));
  }

  get rootPagedNodes(): TreeNode[] {
    if (!this.isNationalRoot) return this.rootFilteredNodes;

    const start = this.rootPageIndex * this.rootPageSize;
    return this.rootFilteredNodes.slice(start, start + this.rootPageSize);
  }

  get rootRangeStart(): number {
    return this.rootFilteredNodes.length === 0 ? 0 : this.rootPageIndex * this.rootPageSize + 1;
  }

  get rootRangeEnd(): number {
    return Math.min(this.rootFilteredNodes.length, (this.rootPageIndex + 1) * this.rootPageSize);
  }

  onRootPageSizeChange(size: number): void {
    this.rootPageSize = Number(size);
    this.rootPageIndex = 0;
  }

  goToRootPage(index: number): void {
    if (index < 0 || index >= this.rootTotalPages) return;
    this.rootPageIndex = index;
  }

  nextRootPage(): void {
    this.goToRootPage(this.rootPageIndex + 1);
  }

  prevRootPage(): void {
    this.goToRootPage(this.rootPageIndex - 1);
  }

  // ── Assign / Reassign dialog state ────────────────────────────────
  dialogMode: DialogMode = 'assign';
  dialogStation: polingStationObj | null = null;
  dialogNode: TreeNode | null = null;
  dialogSelectedAgentId: string | null = null;
  dialogReassignReason = '';

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.fetchTotalStationsOverall();
    this.getLoggedInUser();
    this.getElectionTypes();
  }

  // ── Headline "Total Stations" stat ─────────────────────────────────
  private fetchTotalStationsOverall(): void {
    this.pollingStationService.getCandidatePollingStations('', '', '').subscribe({
      next: (res: any) => {
        this.totalStationsOverall = res?.count ?? (res?.results?.length ?? null);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to fetch total stations count:', err);
      }
    });
  }

  // ── Profile / election-type context ────────────────────────────────
  getLoggedInUser(): void {
    this.authService.getProfile().subscribe({
      next: (user: any) => {
        this.profileDesiredPosition = user?.data?.profile?.desired_position ?? null;
        this.currentCandidateId = user?.data?.id ?? null;

        const election = user?.data?.profile?.elections?.[0] ?? null;
        this.candidateCounty = election?.county ?? null;
        this.candidateConstituency = election?.constituency ?? null;
        this.candidateWard = election?.ward ?? null;

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

  getUserAgents(): void {
    if (!this.currentCandidateId) return;

    this.userService.getUsersList('agent', this.currentCandidateId).subscribe({
      next: (res: any) => {
        this.candidatesAgents = res?.data ?? [];
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error fetching user agents:', err);
        this.showError('Failed to fetch user agents. Please try again later.');
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

  private resolveGeographyScope(): void {
    if (!this.profileLoaded || !this.electionTypesLoaded) return;
    if (!this.profileDesiredPosition || !this.electionTypes.length) return;
    if (this.rootNodes.length || this.rootLoading) return; // already built

    const match = this.electionTypes.find(
      (et: any) => et.name?.trim().toLowerCase() === this.profileDesiredPosition!.trim().toLowerCase()
    );

    this.matchedPositionType = match ?? null;
    this.geographyScope = this.mapToScope(match);
    this.buildRootNodes();
    this.cdr.markForCheck();
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

  // ── Root-node construction, per scope ─────────────────────────────
  private buildRootNodes(): void {
    switch (this.geographyScope) {
      case 'national':
        this.loadCountiesAsRoot();
        break;
      case 'county':
        if (this.candidateCounty) this.loadConstituenciesAsRoot(this.candidateCounty);
        break;
      case 'constituency':
        if (this.candidateConstituency) {
          this.loadWardsAsRoot(this.candidateConstituency, this.candidateCounty ?? undefined);
        }
        break;
      case 'ward':
        if (this.candidateWard) this.loadSingleWardRoot();
        break;
      default:
        // Unresolved / unknown scope — fall back to nationwide browse.
        this.loadCountiesAsRoot();
    }
  }

  private makeNode(name: string, level: TreeNode['level'], isLeaf: boolean, countyName?: string, constituencyName?: string): TreeNode {
    return {
      key: `${level}:${countyName ?? ''}:${constituencyName ?? ''}:${name}`,
      name,
      level,
      isLeaf,
      countyName,
      constituencyName,
      expanded: false,
      childrenLoaded: false,
      loadingChildren: false,
      children: [],
      childSearchTerm: '',
      stationsLoaded: false,
      stationsLoading: false,
      stations: [],
      totalCount: 0,
      unassignedCount: 0,
      searchTerm: '',
      assignedFilter: 'all',
    };
  }

  private loadCountiesAsRoot(): void {
    this.rootLoading = true;
    this.geographicalService.getCounties().subscribe({
      next: (res: any) => {
        const counties = res?.results ?? res ?? [];
        this.rootNodes = counties.map((c: any) => this.makeNode(c.name, 'county', false));
        this.rootPageIndex = 0;
        this.rootLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load counties:', err);
        this.rootLoading = false;
        this.showError('Failed to load counties.');
        this.cdr.markForCheck();
      }
    });
  }

  private loadConstituenciesAsRoot(countyName: string): void {
    this.rootLoading = true;
    this.geographicalService.getConstituencies(countyName).subscribe({
      next: (res: any) => {
        const list = res?.results ?? res ?? [];
        this.rootNodes = list.map((c: any) => this.makeNode(c.name, 'constituency', false, countyName));
        this.rootPageIndex = 0;
        this.rootLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load constituencies:', err);
        this.rootLoading = false;
        this.showError('Failed to load constituencies.');
        this.cdr.markForCheck();
      }
    });
  }

  private loadWardsAsRoot(constituencyName: string, countyName?: string): void {
    this.rootLoading = true;
    this.geographicalService.getWards(constituencyName).subscribe({
      next: (res: any) => {
        const list = res?.results ?? res ?? [];
        this.rootNodes = list.map((w: any) => this.makeNode(w.name, 'ward', true, countyName, constituencyName));
        this.rootPageIndex = 0;
        this.rootLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load wards:', err);
        this.rootLoading = false;
        this.showError('Failed to load wards.');
        this.cdr.markForCheck();
      }
    });
  }

  private loadSingleWardRoot(): void {
    const node = this.makeNode(this.candidateWard!, 'ward', true, this.candidateCounty ?? undefined, this.candidateConstituency ?? undefined);
    this.rootNodes = [node];
    // Only one ward to show — expand and fetch immediately, no click needed.
    this.toggleNode(node);
  }

  // ── Lazy expand / fetch on click ──────────────────────────────────
  toggleNode(node: TreeNode): void {
    node.expanded = !node.expanded;
    if (!node.expanded) return;

    if (node.isLeaf) {
      if (!node.stationsLoaded && !node.stationsLoading) {
        this.fetchStationsForWard(node);
      }
    } else {
      if (!node.childrenLoaded && !node.loadingChildren) {
        this.fetchChildren(node);
      }
    }
  }

  private fetchChildren(node: TreeNode): void {
    node.loadingChildren = true;

    if (node.level === 'county') {
      this.geographicalService.getConstituencies(node.name).subscribe({
        next: (res: any) => {
          const list = res?.results ?? res ?? [];
          node.children = list.map((c: any) => this.makeNode(c.name, 'constituency', false, node.name));
          node.childrenLoaded = true;
          node.loadingChildren = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Failed to load constituencies:', err);
          node.loadingChildren = false;
          this.showError(`Failed to load constituencies for ${node.name}.`);
          this.cdr.markForCheck();
        }
      });
    } else if (node.level === 'constituency') {
      this.geographicalService.getWards(node.name).subscribe({
        next: (res: any) => {
          const list = res?.results ?? res ?? [];
          node.children = list.map((w: any) => this.makeNode(w.name, 'ward', true, node.countyName, node.name));
          node.childrenLoaded = true;
          node.loadingChildren = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Failed to load wards:', err);
          node.loadingChildren = false;
          this.showError(`Failed to load wards for ${node.name}.`);
          this.cdr.markForCheck();
        }
      });
    }
  }

  private fetchStationsForWard(node: TreeNode): void {
    node.stationsLoading = true;

    const county = node.countyName ?? '';
    const constituency = node.constituencyName ?? '';
    const ward = node.name;

    this.pollingStationService.getCandidatePollingStations(county, constituency, ward).subscribe({
      next: (res: any) => {
        const results: polingStationObj[] = res?.results ?? res ?? [];
        node.stations = results;
        node.totalCount = res?.count ?? results.length;
        node.unassignedCount = results.filter(s => !s.assigned_to).length;
        node.stationsLoaded = true;
        node.stationsLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load polling stations for ward:', node.name, err);
        node.stationsLoading = false;
        this.showError(`Failed to load polling stations for ${node.name}.`);
        this.cdr.markForCheck();
      }
    });
  }

  // ── Root-level search (filters county/constituency/ward root nodes by name) ─
  onRootSearchChange(term: string): void {
    this.rootSearchTerm = term || '';
    this.rootPageIndex = 0;
  }

  getVisibleRootNodes(): TreeNode[] {
    if (!this.rootSearchTerm.trim()) return this.rootNodes;
    const term = this.rootSearchTerm.trim().toLowerCase();
    return this.rootNodes.filter(n => n.name?.toLowerCase().includes(term));
  }

  // ── Child-level search (filters a county's constituencies, or a
  //    constituency's wards, by name — scoped per-node so each panel
  //    keeps its own independent search term) ─────────────────────────
  onChildSearchChange(node: TreeNode, term: string): void {
    node.childSearchTerm = term || '';
  }

  getVisibleChildren(node: TreeNode): TreeNode[] {
    if (!node.childSearchTerm.trim()) return node.children;
    const term = node.childSearchTerm.trim().toLowerCase();
    return node.children.filter(c => c.name?.toLowerCase().includes(term));
  }

  // ── Per-ward table filtering (client-side, small already-loaded list) ─
  getVisibleStations(node: TreeNode): polingStationObj[] {
    let list = node.stations;

    if (node.assignedFilter === 'unassigned') list = list.filter(s => !s.assigned_to);
    else if (node.assignedFilter === 'assigned') list = list.filter(s => !!s.assigned_to);

    if (node.searchTerm) {
      const term = node.searchTerm.toLowerCase();
      list = list.filter(s =>
        s.polling_station_name?.toLowerCase().includes(term) ||
        s.polling_station_code?.toLowerCase().includes(term)
      );
    }

    return list;
  }

  onNodeSearchChange(node: TreeNode, term: string): void {
    node.searchTerm = term || '';
  }

  onNodeAssignedFilterChange(node: TreeNode, filter: AssignedFilter): void {
    node.assignedFilter = filter;
  }

  // ── Status helpers ──────────────────────────────────────────────────
  getStatus(station: polingStationObj): polingStationObj['assignment_status'] {
    return station.assignment_status ?? (station.assigned_to ? 'active' : null);
  }

  statusLabel(status: polingStationObj['assignment_status']): string {
    switch (status) {
      case 'pending': return 'Pending';
      case 'active': return 'Active';
      case 'reassigned': return 'Reassigned';
      case 'withdrawn': return 'Withdrawn';
      default: return 'Unassigned';
    }
  }

  statusClass(status: polingStationObj['assignment_status']): string {
    return status ? `status-${status}` : 'status-none';
  }

  // ── Assign / Reassign dialog ────────────────────────────────────────
  openAssignDialog(station: polingStationObj, node: TreeNode, mode: DialogMode): void {
    if (!this.currentCandidateId) {
      this.showError('Missing candidate context — cannot assign.');
      return;
    }

    this.dialogMode = mode;
    this.dialogStation = station;
    this.dialogNode = node;
    this.dialogSelectedAgentId = null;
    this.dialogReassignReason = '';

    this.dialog.open(this.agentAssignDialogTpl, { width: '480px', maxWidth: '95vw' });
  }

  get dialogCanConfirm(): boolean {
    if (!this.dialogSelectedAgentId) return false;
    if (this.dialogMode === 'reassign' && !this.dialogReassignReason.trim()) return false;
    return true;
  }

  confirmAssignDialog(): void {
    if (!this.dialogCanConfirm || !this.dialogStation || !this.dialogNode || !this.currentCandidateId) return;

    const station = this.dialogStation;
    const node = this.dialogNode;

    const payload: Record<string, any> = this.dialogMode === 'assign'
      ? {
          agent: this.dialogSelectedAgentId,
          polling_station: station.id,
          assigned_by: this.currentCandidateId,
          assigned_at: new Date().toISOString(),
          status: 'pending',
          is_active: true,
        }
      : {
          polling_station: station.id,
          assigned_by: this.currentCandidateId,
          assigned_at: new Date().toISOString(),
          status: 'reassigned',
          reassigned_to: this.dialogSelectedAgentId,
          reassignment_reason: this.dialogReassignReason.trim(),
          is_active: true,
        };

    this.agentsService.assignPollingStationToAgent(payload).subscribe({
      next: () => {
        const agent = this.candidatesAgents.find(a => a.id === this.dialogSelectedAgentId);
        const label = agent ? `${agent.first_name} ${agent.last_name}` : this.dialogSelectedAgentId!;

        this.applyStationUpdate(node, station.id!, {
          assigned_to: label,
          assignment_status: this.dialogMode === 'assign' ? 'pending' : 'reassigned',
        });

        this.showSuccess(`Polling station ${station.polling_station_name} ${this.dialogMode === 'assign' ? 'assigned' : 'reassigned'} successfully.`);
        this.dialog.closeAll();
      },
      error: (err) => {
        console.error('Error assigning polling station:', err);
        this.showError('Failed to assign polling station.');
      }
    });
  }

  withdrawStation(station: polingStationObj, node: TreeNode): void {
    if (!this.currentCandidateId || !station.id) return;

    const payload = {
      polling_station: station.id,
      assigned_by: this.currentCandidateId,
      status: 'withdrawn',
      is_active: false,
    };

    this.agentsService.assignPollingStationToAgent(payload).subscribe({
      next: () => {
        this.applyStationUpdate(node, station.id!, { assigned_to: null, assignment_status: 'withdrawn' });
        this.showSuccess(`Assignment withdrawn for ${station.polling_station_name}.`);
      },
      error: (err) => {
        console.error('Error withdrawing polling station assignment:', err);
        this.showError('Failed to withdraw assignment.');
      }
    });
  }

  private applyStationUpdate(node: TreeNode, stationId: string, patch: Partial<polingStationObj>): void {
    const idx = node.stations.findIndex(s => s.id === stationId);
    if (idx !== -1) {
      node.stations[idx] = { ...node.stations[idx], ...patch };
    }
    node.unassignedCount = node.stations.filter(s => !s.assigned_to).length;
    this.cdr.markForCheck();
  }

  // ── Toasts ──────────────────────────────────────────────────────────
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
}