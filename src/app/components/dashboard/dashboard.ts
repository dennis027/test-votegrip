// dashboard.ts
import { ChangeDetectorRef, Component, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth/auth';
import { Router } from '@angular/router';
import { GeographicalService } from '../../services/geographical-service';
import { TemplateRef, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {

  private snackBar = inject(MatSnackBar);
  private cdr      = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  private router = inject(Router);
  private geographicalService = inject(GeographicalService);
  private platformId = inject(PLATFORM_ID);
  private dialog = inject(MatDialog);

  @ViewChild('callAPIDialog') callAPIDialog!: TemplateRef<any>;

  // name variable to hold the user's name
  name = 'Candidate';

  agentsNumber = 0;
  mobilizersNumber = 0;

  // True until the profile call resolves — template can show a skeleton/placeholder
  statsLoading = true;

  counties: any[] = [];
  constituencies: any[] = [];
  wards: any[] = [];

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.getConstituencies();
    this.getCounties();
    this.getWards();

    this.authService.getProfile().subscribe({
      next: (profile) => {
        const fullName = profile?.data?.full_name ?? 'Candidate';
        const agents = profile?.data?.profile?.agents_summary?.total ?? 0;
        const mobilizers = profile?.data?.profile?.mobilizers_count ?? 0;
        const ElectionStatus = profile?.data?.profile?.elections

        if ((ElectionStatus).length === 0) {
          console.table('No elections found in profile data. Defaulting to 0 for agents and mobilizers.');
        }

        this.name = fullName;
        this.agentsNumber = agents;
        this.mobilizersNumber = mobilizers;

        // Reflect the real name in the candidate card
        this.candidate = {
          ...this.candidate,
          name: fullName,
          initials: this.getInitials(fullName),
        };

        // Rebuild stats now that real numbers are available
        this.stats = [
          {
            label: 'Total Agents',
            value: agents,
            sub: '28 pending approval',
            icon: 'agents',
            color: 'blue',
            trend: '+14',
            trendUp: true,
          },
          {
            label: 'Total Mobilizers',
            value: mobilizers,
            sub: 'of 301 total',
            icon: 'stations',
            color: 'green',
            trend: '82%',
            trendUp: true,
          },
          {
            label: 'Readiness Score',
            value: '76%',
            sub: '3 regions below threshold',
            icon: 'score',
            color: 'amber',
            trend: '+4%',
            trendUp: true,
          },
          {
            label: 'Open Incidents',
            value: '5',
            sub: '2 high severity',
            icon: 'incidents',
            color: 'red',
            trend: '-2',
            trendUp: false,
          },
        ];

        this.statsLoading = false;
        this.showSuccess('Welcome back, ' + fullName + '!');
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load profile:', err);
        this.statsLoading = false;

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

  getCounties(): void {
    this.geographicalService.getCounties().subscribe({
      next: (counties) => {
        this.counties = counties;
        this.cdr.markForCheck();
        console.log('Counties loaded:', counties);
      },
      error: (err) => {
        console.error('Failed to load counties:', err);
      }
    });
  }

  getConstituencies(): void {
    this.geographicalService.getConstituencies().subscribe({
      next: (constituencies) => {
        this.constituencies = constituencies;
        this.cdr.markForCheck();
        console.log('Constituencies loaded:', constituencies);
      },
      error: (err) => {
        console.error('Failed to load constituencies:', err);
      }
    });
  }

  getWards(): void {
    this.geographicalService.getWards().subscribe({
      next: (wards) => {
        this.wards = wards;
        this.cdr.markForCheck();
        console.log('Wards loaded:', wards);
      },
      error: (err) => {
        console.error('Failed to load wards:', err);
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

  // Placeholder until party/constituency/county/electionDate are exposed by the API
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

  // Empty until the profile response arrives — populated in ngOnInit's next handler
  stats: Array<{
    label: string;
    value: string | number;
    sub: string;
    icon: string;
    color: string;
    trend: string;
    trendUp: boolean;
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
}