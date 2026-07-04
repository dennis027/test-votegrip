// main-menu.ts
import { Component, OnInit, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
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
                {
                  name: 'Manage Agents',
                  route: '/main-menu/manage-agents',
                  icon: 'people'
                },
                {
                  name: 'Manage Mobilizers',
                  route: '/main-menu/manage-mobilizers',
                  icon: 'person-add'
                },
                {
                  name: 'Assign Polling Station',
                  route: '/main-menu/assign-polling-station',
                  icon: 'location'
                },
                {
                  name: 'Documentation',
                  route: '/main-menu/documentation',
                  icon: 'document-text'
                },
                {
                  name: 'Field Intel',
                  route: '/main-menu/field-intel',
                  icon: 'eye'
                },
                {
                  name: 'Inventory',
                  route: '/main-menu/inventory',
                  icon: 'cube'
                },
                {
                  name: 'Schedules',
                  route: '/main-menu/schedules',
                  icon: 'calendar'
                },
                {
                  name: 'Structure',
                  route: '/main-menu/structure',
                  icon: 'git-network'
                }
            ]
    },

    //expenses

    {
      group: 'Expenses',
      type: 'default',
      items: [
          { name: 'Expenses', route: '/main-menu/expenses',      icon: 'payments' },
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

  private readonly openGroupStorageKey = 'mainMenuOpenGroup';

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.restoreOpenGroupFromRoute(this.router.url);

    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.restoreOpenGroupFromRoute(event.urlAfterRedirects);
    });
  }

  private restoreOpenGroupFromRoute(url: string): void {
    const persistedGroup = this.getPersistedGroup();
    const routeGroup = this.findGroupForRoute(url);

    if (routeGroup) {
      this.openGroup.set(routeGroup);
      this.persistOpenGroup(routeGroup);
      return;
    }

    if (persistedGroup) {
      this.openGroup.set(persistedGroup);
    }
  }

  private findGroupForRoute(url: string): string | null {
    const activeUrl = url.split('?')[0].split('#')[0];

    // Normalize to avoid issues with or without leading slash
    const normalize = (u: string) => u.replace(/\/$/, '');
    const a = normalize(activeUrl);

    for (const group of this.links) {
      for (const item of group.items) {
        const r = normalize(item.route || '');

        // match exactly, startsWith (deeper child routes), or fuzzy contains
        if (
          r && (
            a === r ||
            a.startsWith(r) ||
            r.startsWith(a) ||
            a.includes(r) ||
            r.includes(a)
          )
        ) {
          return group.group;
        }
      }
    }
    return null;
  }

  private getPersistedGroup(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(this.openGroupStorageKey);
  }

  private persistOpenGroup(groupName: string | null): void {
    if (typeof window === 'undefined') return;
    if (groupName) {
      window.localStorage.setItem(this.openGroupStorageKey, groupName);
    } else {
      window.localStorage.removeItem(this.openGroupStorageKey);
    }
  }

  toggleGroup(groupName: string): void {
    const newOpenGroup = this.openGroup() === groupName ? null : groupName;
    this.openGroup.set(newOpenGroup);
    this.persistOpenGroup(newOpenGroup);
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

    this.router.navigate(['login']);
  }
}