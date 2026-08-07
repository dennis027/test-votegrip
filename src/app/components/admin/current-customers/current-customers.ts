import {
  Component, inject, OnInit, OnDestroy, PLATFORM_ID,
  ChangeDetectorRef, ViewChildren, QueryList
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { UsersService } from '../../../services/users';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { Subscription } from 'rxjs';
import { ElectionTypesService } from '../../../services/election-types-service';

export interface Candidate {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status?: string;
  desired_position?: {
    id: string;
    name?: string | null;
  } | null;
}

export interface ElectionType {
  id: string;
  name: string;
  scope_display: string;
}

const UNASSIGNED_KEY = 'unassigned';

@Component({
  selector: 'app-current-users',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatPaginatorModule, MatButtonModule],
  templateUrl: './current-customers.html',
  styleUrl: './current-customers.css',
})
export class CurrentCustomers implements OnInit, OnDestroy {

  displayedColumns: string[] = ['first_name', 'last_name', 'email', 'phone', 'actions'];

  // Built dynamically once election types are fetched
  positions: string[] = [];
  positionLabels: Record<string, string> = {};

  positionLists: Record<string, Candidate[]> = {};
  positionDataSources: Record<string, MatTableDataSource<Candidate>> = {};
  renderedPositions: string[] = [];

  private paginatorSubscription!: Subscription;
  private latestPaginatorsQL: QueryList<MatPaginator> | null = null;

  @ViewChildren(MatPaginator) set paginators(queryList: QueryList<MatPaginator>) {
    if (this.paginatorSubscription) this.paginatorSubscription.unsubscribe();
    this.latestPaginatorsQL = queryList;
    this.wirePaginators(queryList);
    this.paginatorSubscription = queryList.changes.subscribe((ql) => {
      this.latestPaginatorsQL = ql;
      this.wirePaginators(ql);
    });
  }

  destroyed = false;
  searchTerm = '';
  hasAnyData = false;
  isLoading = true;
  loadingElectionTypes = false;

  private route = inject(Router);
  private userService = inject(UsersService);
  private platformId = inject(PLATFORM_ID);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private electionTypesService = inject(ElectionTypesService);

  electionTypes: ElectionType[] = [];

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (!token) {
      this.showError('Session expired. Please log in again.');
      this.route.navigate(['login']);
      return;
    }

    this.loadElectionTypesAndCandidates();
  }

  /** Loads election types first (to build position groups), then candidates. */
  private loadElectionTypesAndCandidates(): void {
    this.isLoading = true;
    this.loadingElectionTypes = true;

    this.electionTypesService.getElectionTypes().subscribe({
      next: (res: any) => {
        // Handle both raw-array and { data: [...] } shaped responses
        this.electionTypes = Array.isArray(res) ? res : (res?.data || []);
        this.loadingElectionTypes = false;
        this.buildPositionMeta();
        this.loadCandidates();
      },
      error: (err) => {
        console.error('Error fetching election types:', err);
        this.showError('Failed to fetch election types. Please try again later.');
        this.electionTypes = [];
        this.loadingElectionTypes = false;
        this.buildPositionMeta();
        this.loadCandidates();
      }
    });
  }

  private buildPositionMeta(): void {
    this.positionLabels = {};
    this.positions = [];

    this.electionTypes.forEach((et) => {
      this.positions.push(et.id);
      this.positionLabels[et.id] = `${et.name} (${et.scope_display})`;
    });

    this.positions.push(UNASSIGNED_KEY);
    this.positionLabels[UNASSIGNED_KEY] = 'Unassigned';
  }

  loadCandidates() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.isLoading = true;

    this.userService.getUsersList('candidate', null).subscribe({
      next: (response) => {
        let users: any[] = [];
        if (response?.data && Array.isArray(response.data)) {
          users = response.data;
        } else if (Array.isArray(response)) {
          users = response;
        } else if (response && typeof response === 'object') {
          const arrayKey = Object.keys(response).find(k => Array.isArray((response as any)[k]));
          if (arrayKey) users = (response as any)[arrayKey];
        }

        // Reset local data structures
        this.positionLists = {};
        this.positions.forEach(pos => this.positionLists[pos] = []);
        this.positionDataSources = {};

        users.forEach((u: any) => {
          if (!u || !u.profile) return;

          // This endpoint can include agents too — only keep actual candidates
          if (u.role?.name !== 'candidate') return;

          const status = u.profile.status?.toLowerCase().trim() ?? '';
          if (status !== 'approved') return;

          const candidate: Candidate = {
            id: u.id,
            first_name: u.first_name,
            last_name: u.last_name,
            email: u.email,
            phone: u.phone,
            status: u.profile.status,
            desired_position: u.profile.desired_position ?? null,
          };

          const posId = u.profile.desired_position?.id;
          const key = (posId && this.positionLists.hasOwnProperty(posId)) ? posId : UNASSIGNED_KEY;

          this.positionLists[key].push(candidate);
        });

        this.rebuildDataSources();

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching candidates:', error);
        this.isLoading = false;
        if (error.status === 401) {
          this.showError('Session expired. Please log in again.');
          this.route.navigate(['login']);
        } else {
          this.showError('Failed to load candidates. Please try again later.');
        }
      }
    });
  }

  private rebuildDataSources(): void {
    
    this.positionDataSources = {};

    this.positions.forEach(pos => {
      const list = this.positionLists[pos] || [];
      if (list.length > 0) {
        this.positionDataSources[pos] = new MatTableDataSource<Candidate>(list);
      }
    });

    this.hasAnyData = Object.keys(this.positionDataSources).some(
      k => this.positionDataSources[k]?.data.length > 0
    );
    this.renderedPositions = this.positions.filter(
      pos => this.positionDataSources[pos]?.data.length > 0
    );

    if (this.latestPaginatorsQL) this.wirePaginators(this.latestPaginatorsQL);
    this.cdr.detectChanges();
  }

  private wirePaginators(ql: QueryList<MatPaginator>) {
     ql.toArray().forEach((p, idx) => {
      const pos = this.renderedPositions[idx];

      if (pos && this.positionDataSources[pos]) {
        this.positionDataSources[pos].paginator = p;
      }
    });

    setTimeout(() => {
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy() {
    this.destroyed = true;
    if (this.paginatorSubscription) this.paginatorSubscription.unsubscribe();
  }

  applyFilter(term: string) {
    this.searchTerm = (term || '').toLowerCase().trim();
    this.positionDataSources = {};

    this.positions.forEach(pos => {
      const list = this.positionLists[pos] || [];
      const filtered = !this.searchTerm
        ? [...list]
        : list.filter(c =>
            c.first_name?.toLowerCase().includes(this.searchTerm) ||
            c.last_name?.toLowerCase().includes(this.searchTerm) ||
            c.email?.toLowerCase().includes(this.searchTerm) ||
            c.phone?.toLowerCase().includes(this.searchTerm)
          );
      if (filtered.length) {
        this.positionDataSources[pos] = new MatTableDataSource<Candidate>(filtered);
      }
    });

    this.renderedPositions = this.positions.filter(
      pos => this.positionDataSources[pos]?.data.length > 0
    );
    this.hasAnyData = this.renderedPositions.length > 0;
    if (this.latestPaginatorsQL) this.wirePaginators(this.latestPaginatorsQL);
    this.cdr.detectChanges();
  }

  private showSuccess(message: string): void {
    if (this.destroyed) return;
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }

  private showError(message: string): void {
    if (this.destroyed) return;
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      panelClass: ['error-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }
}