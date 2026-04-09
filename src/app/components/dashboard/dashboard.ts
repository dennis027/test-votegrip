// dashboard.ts
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth/auth';
import { Router } from '@angular/router';

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


  // name variable to hold the user's name
  name = 'Candidate';


  ngOnInit(): void {
    // Simulate loading data
    setTimeout(() => {
      this.authService.getProfile().subscribe({
        next: (profile) => {
          console.log('User profile:', profile.data.full_name);
          this.showSuccess('Welcome back, ' + profile.data.full_name + '!');
          this.name = profile.data.full_name;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Failed to load profile:', err);
          this.showError('Failed to load user profile. Please try again later.');

          if (err.status === 401) {
            this.showError('Session expired. Please log in again.');
            this.router.navigate(['/login']);
          }
        }
      });
    }, 1000);
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

  stats = [
    {
      label: 'Total Agents',
      value: '312',
      sub: '28 pending approval',
      icon: 'agents',
      color: 'blue',
      trend: '+14',
      trendUp: true,
    },
    {
      label: 'Stations Covered',
      value: '247',
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