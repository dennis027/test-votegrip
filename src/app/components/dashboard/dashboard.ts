// dashboard.ts
import { ChangeDetectorRef, Component, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth/auth';
import { Router } from '@angular/router';
import { GeographicalService } from '../../services/geographical-service';
import { TemplateRef, ViewChild } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ElectionTypesService } from '../../services/election-types-service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { Observable, map, startWith } from 'rxjs';
import { OnboardingService } from '../../services/onboarding-service';

type GeographyLevel = 'ward' | 'constituency' | 'county' | 'none' | null;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatButtonModule,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  @ViewChild('locationPartyOnboarding') locationPartyOnboarding!: TemplateRef<any>;

  private snackBar = inject(MatSnackBar);
  private cdr      = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  private router = inject(Router);
  private geographicalService = inject(GeographicalService);
  private electionTypesService = inject(ElectionTypesService);
  private platformId = inject(PLATFORM_ID);
  private dialog = inject(MatDialog);
  private fb = inject(FormBuilder);
  private onBoardingService = inject(OnboardingService);

  name = 'Candidate';
  agentsNumber = 0;
  mobilizersNumber = 0;
  statsLoading = true;

  counties: any[] = [];
  constituencies: any[] = [];
  wards: any[] = [];
  politicalParties: any[] = [];
  electionTypes: any[] = [];

  onboardingForm!: FormGroup;
  filteredCounties$!: Observable<any[]>;
  filteredParties$!: Observable<any[]>;

  profileDesiredPosition: string | null = null;
  matchedPositionType: any = null;
  geographyLevel: GeographyLevel = null;

  selectedCounty: any = null;
  selectedConstituency: any = null;
  selectedWard: any = null;

  constituenciesLoading = false;
  wardsLoading = false;


  currentUserId: any;

  private profileLoaded = false;
  private electionTypesLoaded = false;
  private pendingOnboardingCheck = false;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    
    console.log('candidate details', this.candidate);
    this.buildOnboardingForm();

    this.getCounties();
    this.getPoliticalParties();
    this.getElectionTypes();

    this.authService.getProfile().subscribe({
      next: (profile) => {
        const fullName = profile?.data?.full_name ?? 'Candidate';
        const agents = profile?.data?.profile?.agents_summary?.total ?? 0;
        const mobilizers = profile?.data?.profile?.mobilizers_count ?? 0;
        const elections = profile?.data?.profile?.elections ?? [];

        this.profileDesiredPosition = profile?.data?.profile?.desired_position ?? null;

      this.currentUserId = profile.data?.id;

        this.name = fullName;
        this.agentsNumber = agents;
        this.mobilizersNumber = mobilizers;

        this.candidate = {
          ...this.candidate,
          name: fullName,
          initials: this.getInitials(fullName),
        };

        this.stats = [
          { label: 'Total Agents', value: agents, sub: '28 pending approval', icon: 'agents', color: 'blue', trend: '+14', trendUp: true },
          { label: 'Total Mobilizers', value: mobilizers, sub: 'of 301 total', icon: 'stations', color: 'green', trend: '82%', trendUp: true },
          { label: 'Readiness Score', value: '76%', sub: '3 regions below threshold', icon: 'score', color: 'amber', trend: '+4%', trendUp: true },
          { label: 'Open Incidents', value: '5', sub: '2 high severity', icon: 'incidents', color: 'red', trend: '-2', trendUp: false },
        ];

        this.statsLoading = false;
        this.showSuccess('Welcome back, ' + fullName + '!');
        this.profileLoaded = true;
        this.pendingOnboardingCheck = elections.length === 0;
        this.maybeStartOnboarding();

        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load profile:', err);
        this.statsLoading = false;
        this.profileLoaded = true;

        if (err.status === 401) {
          this.showError('Session expired. Please log in again.');
          this.router.navigate(['login']);
        } else {
          this.showError('Failed to load user profile. Please try again later.');
        }
        this.cdr.markForCheck();
      }
    });

  
  }

  private buildOnboardingForm(): void {
    this.onboardingForm = this.fb.group({
      countySearch: [''],
      county: ['', Validators.required],
      constituency: [{ value: '', disabled: true }],
      ward: [{ value: '', disabled: true }],
      politicalPartySearch: [''],
      political_party: [''],
      campaign_start_date: ['', Validators.required],
      polling_station: [''],
    });

    this.filteredCounties$ = this.onboardingForm.get('countySearch')!.valueChanges.pipe(
      startWith(''),
      map((val: unknown) => this.filterByName(this.counties, val)),
    );

    this.filteredParties$ = this.onboardingForm.get('politicalPartySearch')!.valueChanges.pipe(
      startWith(''),
      map((val: unknown) => this.filterByName(this.politicalParties, val, 'abbreviation')),
    );
  }

  /**
   * Filters a list by `name` (and optionally a second field, e.g. `abbreviation`).
   * Guards against non-string values, since mat-autocomplete sets the control's
   * value to the SELECTED OBJECT once an option is chosen — displayWith only
   * controls what's rendered, not what valueChanges emits.
   */
  private filterByName(list: any[], value: unknown, extraField?: string): any[] {
    if (value == null) return list;
    if (typeof value !== 'string') return list;

    const term = value.toLowerCase().trim();
    if (!term) return list;

    return list.filter(item => {
      const nameMatch = item.name?.toLowerCase().includes(term);
      const extraMatch = extraField ? item[extraField]?.toLowerCase().includes(term) : false;
      return nameMatch || extraMatch;
    });
  }

  /** "ODM - Orange Democratic Movement" style label for a political party. */
  formatParty(party: any): string {
    if (!party) return '';
    return party.abbreviation ? `${party.abbreviation} - ${party.name}` : party.name;
  }

  private updateFieldEnabledStates(): void {
    const constituency = this.onboardingForm.get('constituency')!;
    const ward = this.onboardingForm.get('ward')!;

    if (!this.selectedCounty || this.constituenciesLoading) {
      constituency.disable({ emitEvent: false });
    } else {
      constituency.enable({ emitEvent: false });
    }

    if (!this.selectedConstituency || this.wardsLoading) {
      ward.disable({ emitEvent: false });
    } else {
      ward.enable({ emitEvent: false });
    }
  }

  private maybeStartOnboarding(): void {
    if (!this.profileLoaded || !this.electionTypesLoaded) return;

    this.tryResolvePositionRequirements();

    if (this.pendingOnboardingCheck) {
      this.pendingOnboardingCheck = false;
      this.candidateOnBoarding();
    }
  }

  private tryResolvePositionRequirements(): void {
    if (!this.profileDesiredPosition || !this.electionTypes.length) return;

    const match = this.electionTypes.find(
      (et: any) => et.name?.trim().toLowerCase() === this.profileDesiredPosition!.trim().toLowerCase()
    );

    this.matchedPositionType = match ?? null;
    this.geographyLevel = this.mapScopeToGeographyLevel(match);

    this.applyGeographyValidators();
    this.cdr.markForCheck();
  }

  private mapScopeToGeographyLevel(match: any): GeographyLevel {
    if (!match) return null;

    if (match.required_geography_level) {
      return match.required_geography_level as GeographyLevel;
    }

    const scope = (match.scope || match.scope_display || '').toString().trim().toLowerCase();

    switch (scope) {
      case 'ward':
        return 'ward';
      case 'constituency':
        return 'constituency';
      case 'county':
        return 'county';
      case 'national':
        return 'none';
      default:
        return null;
    }
  }

  private applyGeographyValidators(): void {
    const county = this.onboardingForm.get('county')!;
    const constituency = this.onboardingForm.get('constituency')!;
    const ward = this.onboardingForm.get('ward')!;
    const politicalParty = this.onboardingForm.get('political_party')!;
    const pollingStation = this.onboardingForm.get('polling_station')!;

    [county, constituency, ward, politicalParty, pollingStation].forEach(c => c.clearValidators());

    switch (this.geographyLevel) {
      case 'ward':
        county.setValidators([Validators.required]);
        constituency.setValidators([Validators.required]);
        ward.setValidators([Validators.required]);
        politicalParty.setValidators([Validators.required]);
        break;
      case 'constituency':
        county.setValidators([Validators.required]);
        constituency.setValidators([Validators.required]);
        politicalParty.setValidators([Validators.required]);
        break;
      case 'county':
        county.setValidators([Validators.required]);
        politicalParty.setValidators([Validators.required]);
        break;
      case 'none':
        pollingStation.setValidators([Validators.required]);
        break;
      default:
        break;
    }

    [county, constituency, ward, politicalParty, pollingStation].forEach(c => c.updateValueAndValidity());
  }

  get showCounty(): boolean {
    return this.geographyLevel === 'county' || this.geographyLevel === 'constituency' || this.geographyLevel === 'ward';
  }
  get showConstituency(): boolean {
    return this.geographyLevel === 'constituency' || this.geographyLevel === 'ward';
  }
  get showWard(): boolean {
    return this.geographyLevel === 'ward';
  }
  get showPollingStation(): boolean {
    return this.geographyLevel === 'none';
  }
  get showPoliticalParty(): boolean {
    return this.geographyLevel !== 'none' && this.geographyLevel !== null;
  }

  getCounties(): void {
    this.geographicalService.getCounties().subscribe({
      next: (res: any) => {
        this.counties = res?.results ?? res ?? [];
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Failed to load counties:', err),
    });
  }

  onCountySelected(event: MatAutocompleteSelectedEvent): void {
    const county = event.option.value;
    this.selectedCounty = county;
    this.onboardingForm.patchValue({
      countySearch: county.name,
      county: county.id,
      constituency: '',
      ward: '',
    });
    this.constituencies = [];
    this.wards = [];
    this.selectedConstituency = null;
    this.selectedWard = null;

    this.updateFieldEnabledStates();

    if (this.showConstituency) {
      this.getConstituencies(county.name);
    }
  }

  displayCounty = (county: any): string => (typeof county === 'string' ? county : county?.name ?? '');
  displayParty = (party: any): string => (typeof party === 'string' ? party : this.formatParty(party));

  getConstituencies(countyName: string): void {
    this.constituenciesLoading = true;
    this.updateFieldEnabledStates();

    this.geographicalService.getConstituencies(countyName).subscribe({
      next: (res: any) => {
        this.constituencies = res?.results ?? res ?? [];
        this.constituenciesLoading = false;
        this.updateFieldEnabledStates();
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load constituencies:', err);
        this.constituenciesLoading = false;
        this.updateFieldEnabledStates();
        this.cdr.markForCheck();
      },
    });
  }

  onConstituencyChange(constituencyId: string): void {
    const constituency = this.constituencies.find(c => c.id === constituencyId);
    this.selectedConstituency = constituency ?? null;
    this.onboardingForm.patchValue({ ward: '' });
    this.wards = [];
    this.selectedWard = null;

    this.updateFieldEnabledStates();

    if (constituency && this.showWard) {
      this.getWards(constituency.name);
    }
  }

  getWards(constituencyName: string): void {
    this.wardsLoading = true;
    this.updateFieldEnabledStates();

    this.geographicalService.getWards(constituencyName).subscribe({
      next: (res: any) => {
        this.wards = res?.results ?? res ?? [];
        this.wardsLoading = false;
        this.updateFieldEnabledStates();
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load wards:', err);
        this.wardsLoading = false;
        this.updateFieldEnabledStates();
        this.cdr.markForCheck();
      },
    });
  }

  onWardChange(wardId: string): void {
    this.selectedWard = this.wards.find(w => w.id === wardId) ?? null;
  }

  getPoliticalParties(): void {
    this.geographicalService.getPoliticalParties().subscribe({
      next: (res: any) => {
        this.politicalParties = res?.results ?? res ?? [];
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Failed to load political parties:', err),
    });
  }

  onPartySelected(event: MatAutocompleteSelectedEvent): void {
    const party = event.option.value;
    this.onboardingForm.patchValue({
      politicalPartySearch: this.formatParty(party),
      political_party: party.id,
    });
  }

  getElectionTypes(): void {
    this.electionTypesService.getElectionTypes().subscribe({
      next: (res: any) => {
        this.electionTypes = res?.results ?? res ?? [];
        this.electionTypesLoaded = true;
        this.maybeStartOnboarding();
        this.cdr.markForCheck();
      },
      error: () => {
        this.showError('Failed to fetch election types. Please try again later.');
        this.electionTypesLoaded = true;
        this.maybeStartOnboarding();
        this.cdr.markForCheck();
      }
    });
  }

  submitOnboarding(): void {
    if (this.onboardingForm.invalid) {
      this.onboardingForm.markAllAsTouched();
      this.showError('Please fill in all required fields.');
      return;
    }

    const raw = this.onboardingForm.getRawValue();
    const payload: Record<string, any> = {
      campaign_start_date: raw.campaign_start_date,
    };

    if (this.showCounty) payload['county'] = raw.county;
    if (this.showConstituency) payload['constituency'] = raw.constituency;
    if (this.showWard) payload['ward'] = raw.ward;
    if (this.showPoliticalParty) payload['political_party'] = raw.political_party;
    if (this.showPollingStation) payload['polling_station'] = raw.polling_station;

    console.log('Onboarding payload:', payload);

    this.onBoardingService.postOnBoarding(this.currentUserId, payload).subscribe({
      next: (res: any) => {
        this.showSuccess('Onboarding successful!');
      },
      error: (err) => {
        console.error('Onboarding failed:', err);
        this.showError('Onboarding failed. Please try again.');
      }
    });
  }

  private getInitials(fullName: string): string {
    return fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase())
      .join('');
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

  candidate = {
    name: 'James Kariuki',
    initials: 'JK',
    party: 'Jubilee Party',
    constituency: 'Westlands Constituency',
    county: 'Nairobi County',
    electionDate: '9 Aug 2027',
    daysLeft: 127,
  };

  phase = {
    current: 'Pre-Election',
    label: 'Preparation Phase',
    progress: 38,
  };

  stats: Array<{
    label: string; value: string | number; sub: string; icon: string;
    color: string; trend: string; trendUp: boolean;
  }> = [];

  readiness = [
    { region: 'Nairobi Central',  score: 94, agents: 48,  color: 'green' },
    { region: 'Kibera',           score: 91, agents: 55,  color: 'green' },
    { region: 'Dagoretti North',  score: 97, agents: 29,  color: 'green' },
    { region: 'Westlands',        score: 78, agents: 32,  color: 'amber' },
    { region: 'Embakasi East',    score: 68, agents: 41,  color: 'amber' },
    { region: 'Starehe',          score: 54, agents: 36,  color: 'red'   },
  ];

  recentActivity = [
    { type: 'agent',    message: 'Grace Wanjiku completed onboarding',      time: '2m ago',  color: 'green'  },
    { type: 'incident', message: 'Intimidation reported — Embakasi East',   time: '18m ago', color: 'red'    },
    { type: 'form',     message: 'Form 34A uploaded — Kibera Ward 3',       time: '45m ago', color: 'blue'   },
    { type: 'payment',  message: 'KES 12,500 disbursed — Westlands agents', time: '1h ago',  color: 'amber'  },
    { type: 'agent',    message: 'Samuel Otieno device verified',           time: '2h ago',  color: 'green'  },
    { type: 'alert',    message: 'Starehe coverage below 60% threshold',    time: '3h ago',  color: 'red'    },
  ];

  quickActions = [
    { label: 'Broadcast Message', icon: 'chat',    color: 'blue'  },
    { label: 'Invite Agent',      icon: 'users',   color: 'green' },
    { label: 'Record Payment',    icon: 'dollar',  color: 'amber' },
    { label: 'File Incident',     icon: 'alert',   color: 'red'   },
  ];

  coverageData = [
    { label: 'Covered',  value: 247, pct: 82, color: '#2E6DA4' },
    { label: 'At Risk',  value: 36,  pct: 12, color: '#F59E0B' },
    { label: 'Missing',  value: 18,  pct: 6,  color: '#EF4444' },
  ];

  candidateOnBoarding() {
    const dialogRef = this.dialog.open(this.locationPartyOnboarding, {
      width: '520px',
      maxWidth: '95vw',
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result !== undefined) {
        console.log('Onboarding dialog closed with:', result);
      }
    });
  }
}