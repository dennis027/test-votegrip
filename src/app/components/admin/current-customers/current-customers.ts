import {
  Component, inject, OnDestroy, PLATFORM_ID,
  ChangeDetectorRef, ViewChildren, QueryList, afterNextRender
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { UsersService } from '../../../services/users';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { Subscription } from 'rxjs';

export interface Candidate {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  is_verified: boolean;
  profile?: {
    status?: string;
    desired_position?: string | null;
  } | null;
}

@Component({
  selector: 'app-current-users',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatPaginatorModule, MatButtonModule],
  templateUrl: './current-customers.html',
  styleUrl: './current-customers.css',
})
export class CurrentCustomers implements OnDestroy {

  displayedColumns: string[] = ['first_name', 'last_name', 'email', 'phone', 'actions'];
  positions: string[] = ['president', 'senator', 'mp', 'womenrep', 'mca', 'governor'];

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

  private route = inject(Router);
  private userService = inject(UsersService);
  private platformId = inject(PLATFORM_ID);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;

    afterNextRender(() => {
      const token =
        localStorage.getItem('access_token') ||
        sessionStorage.getItem('access_token');

      if (!token) {
        this.showError('Session expired. Please log in again.');
        this.route.navigate(['login']);
        return;
      }

      this.loadCandidates();
    });
  }

  loadCandidates() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.isLoading = true;

    this.userService.getUsersList('candidate', null).subscribe({
      next: (response) => {
        let candidates: any[] = [];
        if (response?.data && Array.isArray(response.data)) {
          candidates = response.data;
        } else if (Array.isArray(response)) {
          candidates = response;
        } else if (response && typeof response === 'object') {
          const arrayKey = Object.keys(response).find(k => Array.isArray((response as any)[k]));
          if (arrayKey) candidates = (response as any)[arrayKey];
        }

        this.positions.forEach(pos => this.positionLists[pos] = []);
        this.positionDataSources = {};

        candidates.forEach((c: any) => {
          if (!c || !c.profile) return;

          const status = c.profile.status?.toLowerCase().trim() ?? '';
          let desired = c.profile.desired_position?.toLowerCase().trim() ?? null;

          if (desired === 'women representative' || desired === 'women_rep') desired = 'Women Representative';

          // ← Only approved candidates
          if (status === 'approved' && desired && this.positions.includes(desired)) {
            this.positionLists[desired].push(c as Candidate);
          }
        });

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

        this.isLoading = false;
        this.cdr.detectChanges();
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

  private wirePaginators(ql: QueryList<MatPaginator>) {
    if (!ql || ql.length === 0) return;
    ql.toArray().forEach((p, idx) => {
      const pos = this.renderedPositions[idx];
      if (pos && this.positionDataSources[pos]) {
        this.positionDataSources[pos].paginator = p;
      }
    });
    this.cdr.detectChanges();
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