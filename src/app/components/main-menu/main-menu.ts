// main-menu.ts
import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-main-menu',
  imports: [CommonModule, RouterModule],
  templateUrl: './main-menu.html',
  styleUrl: './main-menu.css',
})
export class MainMenu implements OnInit {

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
    this.router.navigate(['/login']);
  }
}