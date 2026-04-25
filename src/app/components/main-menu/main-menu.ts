// main-menu.ts
import { Component, OnInit, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth/auth';

@Component({
  selector: 'app-main-menu',
  imports: [CommonModule, RouterModule],
  templateUrl: './main-menu.html',
  styleUrl: './main-menu.css',
})
export class MainMenu implements OnInit {

  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);


  // ── Snack helpers ─────────────────────────────────────────────────────────
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

  openGroup = signal<string | null>(null);

  links = [

    // ── Overview ──────────────────────────────────────────────────────────
    {
      group: 'Overview',
      type: 'default',
      items: [
        { name: 'Dashboard', route: '/main-menu/dashboard', icon: 'grid' },
      ]
    },



    // ── Pre-Election ──────────────────────────────────────────────────────
    {
      group: 'Pre-Election',
      type: 'default',
      items: [
        { name: 'Campaign Setup',  route: '/dashboard/campaign',   icon: 'map' },
        { name: 'Agents',          route: '/dashboard/agents',     icon: 'users' },
        { name: 'Readiness',       route: '/dashboard/readiness',  icon: 'checklist' },
        { name: 'Communication',   route: '/dashboard/messages',   icon: 'chat' },
        { name: 'Field Intel',     route: '/dashboard/intel',      icon: 'flag' },
        { name: 'Finance',         route: '/dashboard/finance',    icon: 'dollar' },
      ]
    },

        // ── Nomination Day ────────────────────────────────────────────────────
    {
      group: 'Nomination Day',
      type: 'nomination',           // ← special styling trigger
      items: [
        { name: 'Nom. Monitoring',  route: '/dashboard/nomination/monitoring', icon: 'signal' },
        { name: 'Nom. Results',     route: '/dashboard/nomination/results',    icon: 'chart' },
      ]
    },

    
    // ── Election Day ──────────────────────────────────────────────────────
    {
      group: 'Election Day',
      type: 'default',
      items: [
        { name: 'Live Monitoring', route: '/dashboard/monitoring', icon: 'signal' },
        { name: 'Results & Tally', route: '/dashboard/tally',      icon: 'chart' },
      ]
    },

    // ── Post-Election ─────────────────────────────────────────────────────
    {
      group: 'Post-Election',
      type: 'default',
      items: [
        { name: 'Disputes',  route: '/dashboard/disputes', icon: 'alert' },
        { name: 'Reports',   route: '/dashboard/reports',  icon: 'file' },
      ]
    },

  ];

  isSidebarActive = false;

  constructor(private router: Router) {}

  ngOnInit(): void {}

  toggleGroup(groupName: string): void {
    this.openGroup.set(this.openGroup() === groupName ? null : groupName);
  }

  isGroupOpen(groupName: string): boolean {
    return this.openGroup() === groupName;
  }

  toggleSidebar(): void {
    this.isSidebarActive = !this.isSidebarActive;
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (sidebar && overlay) {
      sidebar.classList.toggle('active');
      overlay.classList.toggle('active');
    }
    this.toggleBodyScroll();
  }

  closeSidebar(): void {
    if (this.isSidebarActive) {
      this.isSidebarActive = false;
      const sidebar = document.getElementById('sidebar');
      const overlay = document.querySelector('.sidebar-overlay');
      if (sidebar && overlay) {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
      }
      this.toggleBodyScroll();
    }
  }

  onNavLinkClick(): void {
    if (window.innerWidth <= 992) this.closeSidebar();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    const width = (event.target as Window).innerWidth;
    if (width > 992 && this.isSidebarActive) this.closeSidebar();
  }

  private toggleBodyScroll(): void {
    document.body.style.overflow = this.isSidebarActive ? 'hidden' : '';
  }

  logOut(): void {
    this.authService.logout();
    this.showSuccess('Logged out successfully');

    this.router.navigate(['/login']);
  }
}