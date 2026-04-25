import { AfterViewInit, Component, inject, OnDestroy, OnInit, ViewChild, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { UsersService } from '../../../services/users';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';

export interface Candidate {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  is_verified: boolean;
  // Add other fields as needed
}

@Component({
  selector: 'app-manage-candidates',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatPaginatorModule, MatButtonModule],
  templateUrl: './manage-candidates.html',
  styleUrls: ['./manage-candidates.css'],
})
export class ManageCandidates implements OnInit, AfterViewInit, OnDestroy {

  displayedColumns: string[] = ['first_name', 'last_name', 'email', 'phone', 'actions'];
  dataSource = new MatTableDataSource<Candidate>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  destroyed = false;
  private route = inject(Router);
  private userService = inject(UsersService);
  private platformId = inject(PLATFORM_ID);
  private snackBar = inject(MatSnackBar);

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.userService.getUsersList('candidate', null).subscribe({
        next: (response) => {
          console.log('Candidates:', response);
          // Assuming response.data is the array of candidates
          const candidates = response.data || response;
          // Filter for unverified candidates
          const unverifiedCandidates = candidates.filter((c: any) => !c.is_verified);
          this.dataSource.data = unverifiedCandidates;
        },
        error: (error) => {
          console.error('Error fetching candidates:', error);
          this.showError('Failed to load candidates. Please try again later.');
          if (error.status === 401) {
            this.showError('Session expired. Please log in again.');
            this.route.navigate(['/login']);
          }
        }
      });
    }
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  ngOnDestroy() {
    this.destroyed = true;
  }

  approveCandidate(candidate: Candidate) {
    this.userService.approveCandidate(candidate.id).subscribe({
      next: () => {
        this.showSuccess('Candidate approved successfully.');
        // Remove from dataSource
        this.dataSource.data = this.dataSource.data.filter(c => c.id !== candidate.id);
      },
      error: (error) => {
        console.error('Error approving candidate:', error);
        this.showError('Failed to approve candidate.');
      }
    });
  }

  rejectCandidate(candidate: Candidate) {
    this.userService.rejectCandidate(candidate.id).subscribe({
      next: () => {
        this.showSuccess('Candidate rejected successfully.');
        // Remove from dataSource
        this.dataSource.data = this.dataSource.data.filter(c => c.id !== candidate.id);
      },
      error: (error) => {
        console.error('Error rejecting candidate:', error);
        this.showError('Failed to reject candidate.');
      }
    });
  }

  showSuccess(message: string) {
    if (!this.destroyed) {
      this.snackBar.open(message, 'Close', {
        duration: 3000,
        panelClass: ['success-snackbar'],
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
  }

  showError(message: string) {
    if (!this.destroyed) {
      this.snackBar.open(message, 'Close', {
        duration: 4000,
        panelClass: ['error-snackbar'],
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
  }
}
