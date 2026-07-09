import { Component, inject, OnInit, AfterViewInit, OnDestroy, PLATFORM_ID, ChangeDetectorRef, ViewChildren, QueryList } from '@angular/core';
import { ViewChild, TemplateRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { UsersService } from '../../../services/users';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
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
  selector: 'app-manage-candidates',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatPaginatorModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, FormsModule],
  templateUrl: './manage-candidates.html',
  styleUrls: ['./manage-candidates.css'],
})
export class ManageCandidates implements OnInit, AfterViewInit, OnDestroy {

  displayedColumns: string[] = ['first_name', 'last_name', 'email', 'phone', 'actions'];
  positions: string[] = ['unassigned', 'president', 'senator', 'mp', 'womenrep', 'mca', 'governor'];
  positionLabels: Record<string, string> = {
    unassigned: 'Unassigned',
    president: 'President',
    senator: 'Senator',
    mp: 'Member of Parliament',
    womenrep: 'Women Representative',
    mca: 'Member of County Assembly',
    governor: 'Governor'
  };

  positionLists: Record<string, Candidate[]> = {};
  positionDataSources: Record<string, MatTableDataSource<Candidate>> = {};
  renderedPositions: string[] = [];

  private paginatorSubscription!: Subscription;
  private latestPaginatorsQL: QueryList<MatPaginator> | null = null;
  @ViewChildren(MatPaginator) set paginators(queryList: QueryList<MatPaginator>) {
    if (this.paginatorSubscription) {
      this.paginatorSubscription.unsubscribe();
    }
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

  private route = inject(Router);
  private userService = inject(UsersService);
  private platformId = inject(PLATFORM_ID);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private dialog = inject(MatDialog);
  @ViewChild('rejectDialog') rejectDialogTpl!: TemplateRef<any>;
  currentRejectCandidate?: Candidate;
  rejectReason = '';
  private activeDialogRef?: MatDialogRef<any>;

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (!token) {
      this.showError('Session expired. Please log in again.');
      this.route.navigate(['login']);
      return;
    }

    this.loadCandidates();
  }

  ngAfterViewInit() {
    // no-op: paginator wiring handled via ViewChildren setter
  }

  loadCandidates() {
    if (!isPlatformBrowser(this.platformId)) return; // belt-and-suspenders

    this.userService.getUsersList('candidate', null).subscribe({
      next: (response) => {
        console.log('Raw API Response on Reload:', response);

        let candidates: any[] = [];
        if (response && response.data && Array.isArray(response.data)) {
          candidates = response.data;
        } else if (Array.isArray(response)) {
          candidates = response;
        } else if (response && typeof response === 'object') {
          const keys = Object.keys(response);
          const arrayKey = keys.find(k => Array.isArray((response as any)[k]));
          if (arrayKey) candidates = (response as any)[arrayKey];
        }

        this.positions.forEach(pos => this.positionLists[pos] = []);
        this.positionDataSources = {};

        const positionMap: Record<string, string> = {
          president: 'president',
          senator: 'senator',
          mp: 'mp',
          mca: 'mca',
          governor: 'governor',
          'women representative': 'womenrep',
          'women_rep': 'womenrep',
          'women rep': 'womenrep',
          'womenrepresentative': 'womenrep'
        };

        candidates.forEach((c: any) => {
          if (!c || !c.profile) return;

          const status = c.profile.status ? c.profile.status.toLowerCase().trim() : '';
          const rawDesired = c.profile.desired_position;
          let desired = rawDesired?.toLowerCase().trim() ?? null;

          if (!desired) {
            desired = 'unassigned';
          } else {
            desired = positionMap[desired] ?? desired;
          }

          if (status === 'registered' && desired && this.positions.includes(desired)) {
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

        console.log('Processed structure positions:', this.renderedPositions);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error fetching candidates on reload:', error);
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
    if (this.paginatorSubscription) {
      this.paginatorSubscription.unsubscribe();
    }
  }

  applyFilter(term: string) {
    this.searchTerm = (term || '').toLowerCase().trim();

    this.positionDataSources = {};
    this.positions.forEach(pos => {
      const list = this.positionLists[pos] || [];
      if (!this.searchTerm) {
        if (list.length) this.positionDataSources[pos] = new MatTableDataSource<Candidate>([...list]);
      } else {
        const filtered = list.filter(c => {
          const s = this.searchTerm;
          return (c.first_name?.toLowerCase().includes(s)) ||
                 (c.last_name?.toLowerCase().includes(s)) ||
                 (c.email?.toLowerCase().includes(s)) ||
                 (c.phone?.toLowerCase().includes(s));
        });
        if (filtered.length) this.positionDataSources[pos] = new MatTableDataSource<Candidate>(filtered);
      }
    });

    this.renderedPositions = this.positions.filter(
      pos => this.positionDataSources[pos]?.data.length > 0
    );
    this.hasAnyData = this.renderedPositions.length > 0;
    if (this.latestPaginatorsQL) this.wirePaginators(this.latestPaginatorsQL);
    this.cdr.detectChanges();
  }

  approveCandidate(candidate: Candidate) {
    this.userService.approveCandidate(candidate.id).subscribe({
      next: () => {
        this.showSuccess('Candidate approved successfully.');
        this.removeCandidateFromPosition(candidate.id);
      },
      error: (error) => {
        console.error('Approve Error:', error);
        this.showError('Failed to approve candidate.');
      }
    });
  }

  rejectCandidate(candidate: Candidate) {
    // open inline dialog template to capture rejection reason
    this.currentRejectCandidate = candidate;
    this.rejectReason = '';
    this.activeDialogRef = this.dialog.open(this.rejectDialogTpl, { width: '520px' });

    this.activeDialogRef.afterClosed().subscribe((reason: string | undefined) => {
      this.activeDialogRef = undefined;
      this.currentRejectCandidate = undefined;
      if (reason === undefined) return; // cancelled

      this.userService.rejectCandidate(candidate.id, reason || undefined).subscribe({
        next: () => {
          this.showSuccess('Candidate rejected successfully.');
          this.removeCandidateFromPosition(candidate.id);
        },
        error: (error) => {
          console.error('Reject Error:', error);
          this.showError('Failed to reject candidate.');
        }
      });
    });
  }

  closeRejectDialog(confirm: boolean) {
    if (!this.activeDialogRef) return;
    if (confirm) {
      this.activeDialogRef.close(this.rejectReason || '');
    } else {
      this.activeDialogRef.close(undefined);
    }
  }

  private removeCandidateFromPosition(candidateId: string) {
    this.positions.forEach(pos => {
      const list = this.positionLists[pos] || [];
      const idx = list.findIndex((c: Candidate) => c.id === candidateId);

      if (idx > -1) {
        list.splice(idx, 1);

        if (list.length > 0) {
          this.positionDataSources[pos].data = [...list];
        } else {
          const updatedSources = { ...this.positionDataSources };
          delete updatedSources[pos];
          this.positionDataSources = updatedSources;
        }
      }
    });

    this.renderedPositions = this.positions.filter(
      pos => this.positionDataSources[pos]?.data.length > 0
    );
    this.cdr.detectChanges();
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      panelClass: ['error-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }
}