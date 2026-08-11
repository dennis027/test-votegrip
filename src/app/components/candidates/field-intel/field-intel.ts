import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID, ViewChild, OnInit, AfterViewInit, TemplateRef } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { AuthService } from '../../../services/auth/auth';
import { FieldIntelService, FieldIntelBody } from '../../../services/candidates/field-intel-service';
import { ElectionTypesService } from '../../../services/election-types-service';
import { GeographicalService } from '../../../services/geographical-service';
import { PolingStationService } from '../../../services/poling-station-service';

type GeographyScope = 'national' | 'county' | 'constituency' | 'ward' | 'none' | null;
type ViewMode = 'table' | 'grouped';

/**
 * FieldIntelBody (declared in field-intel-service.ts) doesn't include
 * polling_station_name/polling_station_code, even though the real API
 * response returns them. Extending locally avoids touching the service file.
 */
interface FieldIntelRecord extends FieldIntelBody {
  polling_station_name?: string;
  polling_station_code?: string;
}

interface PollingStationLite {
  id: string;
  polling_station_code: string;
  polling_station_name: string;
}

interface StationLocationInfo {
  county_name?: string;
  constituency_name?: string;
  region_name?: string;
}

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
  childSearchTerm: string;

  stationsLoaded: boolean;
  stationsLoading: boolean;
  stations: PollingStationLite[];
  searchTerm: string;
}

interface RegionGroup {
  regionName: string;
  counties: CountyGroup[];
  totalCount: number;
}

interface CountyGroup {
  countyName: string;
  constituencies: ConstituencyGroup[];
  totalCount: number;
}

interface ConstituencyGroup {
  constituencyName: string;
  intel: FieldIntelRecord[];
}

@Component({
  selector: 'app-field-intel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatIconModule,
    MatExpansionModule,
    MatProgressBarModule,
    MatButtonToggleModule,
  ],
  templateUrl: './field-intel.html',
  styleUrl: './field-intel.css',
})
export class FieldIntel implements OnInit, AfterViewInit {
  userForm!: FormGroup;
  candidateId: any;
  editingCandidateId: any = null;
  isEditing = false;
  currentIntelId: string | null = null;

  classifications = [
    { value: 'stronghold', label: 'Stronghold' },
    { value: 'swing_area', label: 'Swing Area' },
    { value: 'risk_area', label: 'Risk Area' },
    { value: 'priority_zone', label: 'Priority Zone' },
  ];

  riskLevels = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
  ];

  displayedColumns: string[] = [
    'polling_station',
    'classification_display',
    'risk_level_display',
    'notes',
    'is_active',
    'created_at',
    'actions',
  ];
  dataSource = new MatTableDataSource<FieldIntelRecord>([]);
  allIntel: FieldIntelRecord[] = [];

  viewMode: ViewMode = 'table';
  regionGroups: RegionGroup[] = [];
  groupingLoading = false;

  private stationLocationMap = new Map<string, StationLocationInfo>();
  private stationLocationMapLoaded = false;

  private route = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private snackBar = inject(MatSnackBar);
  private fieldIntelService = inject(FieldIntelService);
  private authService = inject(AuthService);
  private electionTypesService = inject(ElectionTypesService);
  private geographicalService = inject(GeographicalService);
  private pollingStationService = inject(PolingStationService);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('addUpdateIntelDialog') addUpdateIntelDialog!: TemplateRef<any>;
  @ViewChild('deleteIntelDialog') deleteIntelDialog!: TemplateRef<any>;

  profileDesiredPosition: string | null = null;
  electionTypes: any[] = [];
  matchedPositionType: any = null;
  geographyScope: GeographyScope = null;

  candidateCounty: string | null = null;
  candidateConstituency: string | null = null;
  candidateWard: string | null = null;

  treeProfileLoaded = false;
  treeElectionTypesLoaded = false;

  get treeInitializing(): boolean {
    return !(this.treeProfileLoaded && this.treeElectionTypesLoaded);
  }

  rootNodes: TreeNode[] = [];
  rootLoading = false;
  rootSearchTerm = '';

  selectedStation: PollingStationLite | null = null;

  closeDialog(): void {
    this.dialog.closeAll();
  }

  ngOnInit() {
    this.initForm();
    if (isPlatformBrowser(this.platformId)) {
      this.getProfile();
      this.getTreeElectionTypes();
    }

    this.dataSource.filterPredicate = (data: FieldIntelRecord, filter: string) => {
      const f = filter.trim().toLowerCase();
      const classification = (data.classification_display || '').toString().toLowerCase();
      const risk = (data.risk_level_display || '').toString().toLowerCase();
      const notes = (data.notes || '').toString().toLowerCase();
      const stationName = (data.polling_station_name || '').toString().toLowerCase();
      const stationCode = (data.polling_station_code || '').toString().toLowerCase();
      return classification.includes(f) || risk.includes(f) || notes.includes(f) || stationName.includes(f) || stationCode.includes(f);
    };

    setTimeout(() => {
      this.dataSource.paginator = this.paginator;
    }, 500);
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  applyFilter(value: string) {
    const filterValue = (value || '').trim().toLowerCase();
    this.dataSource.filter = filterValue;
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  initForm() {
    this.userForm = this.fb.group({
      polling_station: ['', [Validators.required]],
      classification: ['stronghold', Validators.required],
      risk_level: ['low', Validators.required],
      notes: [''],
      is_active: [true],
    });
  }

  getProfile() {
    this.authService.getProfile().subscribe({
      next: (profile: any) => {
        this.candidateId =
          profile?.data?.candidate_id ||
          profile?.data?.candidate?.id ||
          profile?.data?.id;

        this.profileDesiredPosition = profile?.data?.profile?.desired_position ?? null;

        const election = profile?.data?.profile?.elections?.[0] ?? null;
        this.candidateCounty = election?.county ?? null;
        this.candidateConstituency = election?.constituency ?? null;
        this.candidateWard = election?.ward ?? null;

        this.treeProfileLoaded = true;
        this.resolveGeographyScope();

        this.getFieldIntel();
      },
      error: () => {
        this.showError('Session expired. Please login again.');
        this.route.navigate(['login']);
      },
    });
  }

  getFieldIntel() {
    this.fieldIntelService.getFieldIntelList().subscribe({
      next: (response: any) => {
        this.allIntel = response.results || [];
        this.dataSource.data = this.allIntel;

        if (this.viewMode === 'grouped') {
          this.buildRegionGroups();
        }
      },
      error: () => this.showError('Failed to load field intel.'),
    });
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
    if (mode === 'grouped') {
      this.buildRegionGroups();
    }
  }

  private buildRegionGroups(): void {
    if (!this.stationLocationMapLoaded) {
      this.groupingLoading = true;
      this.loadStationLocationMap(() => {
        this.groupingLoading = false;
        this.computeRegionGroups();
      });
      return;
    }
    this.computeRegionGroups();
  }

  private loadStationLocationMap(onLoaded: () => void): void {
    this.pollingStationService.getCandidatePollingStations('', '', '').subscribe({
      next: (res: any) => {
        const results: any[] = res?.results ?? res ?? [];
        results.forEach(s => {
          if (s?.id) {
            this.stationLocationMap.set(s.id, {
              county_name: s.county_name,
              constituency_name: s.constituency_name,
              region_name: s.region_name,
            });
          }
        });
        this.stationLocationMapLoaded = true;
        onLoaded();
      },
      error: () => {
        this.showError('Failed to load location data for grouping.');
        this.stationLocationMapLoaded = true;
        onLoaded();
      }
    });
  }

  private computeRegionGroups(): void {
    const regionMap = new Map<string, Map<string, Map<string, FieldIntelRecord[]>>>();

    this.allIntel.forEach(intel => {
      const loc = this.stationLocationMap.get(intel.polling_station) ?? {};
      const region = loc.region_name || 'Unclassified Region';
      const county = loc.county_name || 'Unclassified County';
      const constituency = loc.constituency_name || 'Unclassified Constituency';

      if (!regionMap.has(region)) regionMap.set(region, new Map());
      const countyMap = regionMap.get(region)!;

      if (!countyMap.has(county)) countyMap.set(county, new Map());
      const constMap = countyMap.get(county)!;

      if (!constMap.has(constituency)) constMap.set(constituency, []);
      constMap.get(constituency)!.push(intel);
    });

    this.regionGroups = Array.from(regionMap.entries())
      .map(([regionName, countyMap]) => {
        const counties: CountyGroup[] = Array.from(countyMap.entries())
          .map(([countyName, constMap]) => {
            const constituencies: ConstituencyGroup[] = Array.from(constMap.entries())
              .map(([constituencyName, intel]) => ({ constituencyName, intel }))
              .sort((a, b) => a.constituencyName.localeCompare(b.constituencyName));

            const totalCount = constituencies.reduce((sum, c) => sum + c.intel.length, 0);
            return { countyName, constituencies, totalCount };
          })
          .sort((a, b) => a.countyName.localeCompare(b.countyName));

        const totalCount = counties.reduce((sum, c) => sum + c.totalCount, 0);
        return { regionName, counties, totalCount };
      })
      .sort((a, b) => a.regionName.localeCompare(b.regionName));
  }

  getTreeElectionTypes(): void {
    this.electionTypesService.getElectionTypes().subscribe({
      next: (res: any) => {
        this.electionTypes = res?.results ?? res ?? [];
        this.treeElectionTypesLoaded = true;
        this.resolveGeographyScope();
      },
      error: () => {
        this.treeElectionTypesLoaded = true;
        this.resolveGeographyScope();
      }
    });
  }

  private resolveGeographyScope(): void {
    if (!this.treeProfileLoaded || !this.treeElectionTypesLoaded) return;
    if (!this.profileDesiredPosition || !this.electionTypes.length) return;
    if (this.rootNodes.length || this.rootLoading) return;

    const match = this.electionTypes.find(
      (et: any) => et.name?.trim().toLowerCase() === this.profileDesiredPosition!.trim().toLowerCase()
    );

    this.matchedPositionType = match ?? null;
    this.geographyScope = this.mapToScope(match);
    this.buildRootNodes();
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
      searchTerm: '',
    };
  }

  private loadCountiesAsRoot(): void {
    this.rootLoading = true;
    this.geographicalService.getCounties().subscribe({
      next: (res: any) => {
        const counties = res?.results ?? res ?? [];
        this.rootNodes = counties.map((c: any) => this.makeNode(c.name, 'county', false));
        this.rootLoading = false;
      },
      error: () => {
        this.rootLoading = false;
        this.showError('Failed to load counties.');
      }
    });
  }

  private loadConstituenciesAsRoot(countyName: string): void {
    this.rootLoading = true;
    this.geographicalService.getConstituencies(countyName).subscribe({
      next: (res: any) => {
        const list = res?.results ?? res ?? [];
        this.rootNodes = list.map((c: any) => this.makeNode(c.name, 'constituency', false, countyName));
        this.rootLoading = false;
      },
      error: () => {
        this.rootLoading = false;
        this.showError('Failed to load constituencies.');
      }
    });
  }

  private loadWardsAsRoot(constituencyName: string, countyName?: string): void {
    this.rootLoading = true;
    this.geographicalService.getWards(constituencyName).subscribe({
      next: (res: any) => {
        const list = res?.results ?? res ?? [];
        this.rootNodes = list.map((w: any) => this.makeNode(w.name, 'ward', true, countyName, constituencyName));
        this.rootLoading = false;
      },
      error: () => {
        this.rootLoading = false;
        this.showError('Failed to load wards.');
      }
    });
  }

  private loadSingleWardRoot(): void {
    const node = this.makeNode(this.candidateWard!, 'ward', true, this.candidateCounty ?? undefined, this.candidateConstituency ?? undefined);
    this.rootNodes = [node];
    this.toggleNode(node);
  }

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
        },
        error: () => {
          node.loadingChildren = false;
          this.showError(`Failed to load constituencies for ${node.name}.`);
        }
      });
    } else if (node.level === 'constituency') {
      this.geographicalService.getWards(node.name).subscribe({
        next: (res: any) => {
          const list = res?.results ?? res ?? [];
          node.children = list.map((w: any) => this.makeNode(w.name, 'ward', true, node.countyName, node.name));
          node.childrenLoaded = true;
          node.loadingChildren = false;
        },
        error: () => {
          node.loadingChildren = false;
          this.showError(`Failed to load wards for ${node.name}.`);
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
        node.stations = res?.results ?? res ?? [];
        node.stationsLoaded = true;
        node.stationsLoading = false;
      },
      error: () => {
        node.stationsLoading = false;
        this.showError(`Failed to load polling stations for ${node.name}.`);
      }
    });
  }

  onRootSearchChange(term: string): void {
    this.rootSearchTerm = term || '';
  }

  getVisibleRootNodes(): TreeNode[] {
    if (!this.rootSearchTerm.trim()) return this.rootNodes;
    const term = this.rootSearchTerm.trim().toLowerCase();
    return this.rootNodes.filter(n => n.name?.toLowerCase().includes(term));
  }

  onChildSearchChange(node: TreeNode, term: string): void {
    node.childSearchTerm = term || '';
  }

  getVisibleChildren(node: TreeNode): TreeNode[] {
    if (!node.childSearchTerm.trim()) return node.children;
    const term = node.childSearchTerm.trim().toLowerCase();
    return node.children.filter(c => c.name?.toLowerCase().includes(term));
  }

  getVisibleStations(node: TreeNode): PollingStationLite[] {
    if (!node.searchTerm.trim()) return node.stations;
    const term = node.searchTerm.trim().toLowerCase();
    return node.stations.filter(s =>
      s.polling_station_name?.toLowerCase().includes(term) ||
      s.polling_station_code?.toLowerCase().includes(term)
    );
  }

  onNodeSearchChange(node: TreeNode, term: string): void {
    node.searchTerm = term || '';
  }

  selectStation(station: PollingStationLite): void {
    this.selectedStation = station;
    this.userForm.patchValue({ polling_station: station.id });
  }

  clearSelectedStation(): void {
    this.selectedStation = null;
    this.userForm.patchValue({ polling_station: '' });
  }

  addUpdateDialC() {
    const dialogRef = this.dialog.open(this.addUpdateIntelDialog, {
      minWidth: '480px',
      maxWidth: '95vw',
      width: '640px',
      maxHeight: '90vh',
      panelClass: 'custom-dialog-container',
      autoFocus: false,
    });
    dialogRef.afterClosed().subscribe(() => {
      this.resetFormState();
    });
  }

  onSubmit() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const payload = {
      ...this.userForm.value,
      candidate: this.isEditing ? this.editingCandidateId : this.candidateId,
    };

    const handleResponse = {
      next: () => {
        this.showSuccess(this.isEditing ? 'Updated successfully!' : 'Added successfully!');
        this.getFieldIntel();
        this.dialog.closeAll();
        this.resetFormState();
      },
      error: (err: any) => {
        const backendErrors = err.error?.errors;
        if (backendErrors) {
          Object.keys(backendErrors).forEach((key) => {
            const formControl = this.userForm.get(key);
            if (formControl) {
              formControl.setErrors({ serverError: backendErrors[key][0] });
            }
          });
        } else {
          this.showError(err.error?.message || 'An unexpected error occurred.');
        }
      },
    };

    if (this.isEditing && this.currentIntelId) {
      this.fieldIntelService.updateFieldIntel(this.currentIntelId, payload).subscribe(handleResponse);
    } else {
      this.fieldIntelService.addFieldIntelApi(payload).subscribe(handleResponse);
    }
  }

  onEdit(intel: FieldIntelRecord) {
    this.isEditing = true;
    this.currentIntelId = intel.id || null;
    this.editingCandidateId = intel.candidate || this.candidateId;

    this.selectedStation = {
      id: intel.polling_station,
      polling_station_code: intel.polling_station_code || '',
      polling_station_name: intel.polling_station_name || '',
    };

    this.userForm.patchValue({
      polling_station: intel.polling_station,
      classification: intel.classification,
      risk_level: intel.risk_level,
      notes: intel.notes,
      is_active: intel.is_active,
    });
    this.addUpdateDialC();
  }

  onDelete(id: string) {
    const dialogRef = this.dialog.open(this.deleteIntelDialog, {
      maxWidth: '95vw',
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'yes') {
        this.fieldIntelService.deleteFieldIntel(id).subscribe({
          next: () => {
            this.showSuccess('Deleted successfully');
            this.getFieldIntel();
          },
          error: () => this.showError('Delete failed.'),
        });
      }
    });
  }

  resetFormState() {
    this.isEditing = false;
    this.currentIntelId = null;
    this.editingCandidateId = null;
    this.selectedStation = null;
    this.userForm.reset({ classification: 'stronghold', risk_level: 'low', is_active: true });
  }

  showSuccess(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }

  showError(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      panelClass: ['error-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }
}