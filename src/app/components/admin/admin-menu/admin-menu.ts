import { Component, OnInit, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../services/auth/auth';

@Component({
  selector: 'app-admin-menu',
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-menu.html',
  styleUrl: './admin-menu.css',
})
export class AdminMenu {


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
  
    links = [
  
      // ── Overview ──────────────────────────────────────────────────────────
      {
        group: 'Overview',
        type: 'default',
        items: [
          { name: 'Dashboard', route: '/admin-menu/admin-dashboard', icon: 'grid' },
        ]
      },
  
  
  
      // ── Pre-Election ──────────────────────────────────────────────────────
      {
        group: 'Admin Roles',
        type: 'default',
        items: [
          { name: 'Manage Candidates',route: '/admin-menu/manage-candidates',   icon: 'map' },
          { name: 'Agents',          route: '/admin-menu/agents',     icon: 'users' },
          { name: 'Readiness',       route: '/admin-menu/readiness',  icon: 'checklist' },
          { name: 'Communication',   route: '/admin-menu/messages',   icon: 'chat' },
          { name: 'Field Intel',     route: '/admin-menu/intel',      icon: 'flag' },
          { name: 'Finance',         route: '/admin-menu/finance',    icon: 'dollar' },
        ]
      },
  
  
    ];
  
    isSidebarActive = false;
  
    constructor(private router: Router) {}
  
    ngOnInit(): void {}
  
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