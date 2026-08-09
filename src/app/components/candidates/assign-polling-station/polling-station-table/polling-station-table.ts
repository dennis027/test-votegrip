import {
  Component, Input, Output, EventEmitter,
  ViewChild, AfterViewInit, OnChanges, SimpleChanges, PLATFORM_ID, inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { polingStationObj } from '../assign-polling-station';
import { AgentsService } from '../../../../services/candidates/agents-service';
import { AgentAssignDialog, AgentAssignDialogResult } from './agent-assign-dialog./agent-assign-dialog.';

type AssignmentStatus = 'pending' | 'active' | 'reassigned' | 'withdrawn' | null;

@Component({
  selector: 'app-polling-station-table',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatPaginatorModule, MatButtonModule, MatDialogModule, MatChipsModule],
  templateUrl: './polling-station-table.html',
  styleUrl: './polling-station-table.css',
})
export class PollingStationTable implements OnChanges, AfterViewInit {

  @Input() stations: polingStationObj[] = [];
  @Input() agents: any[] = [];
  /** The logged-in candidate's own user id — becomes `assigned_by` on every assignment call. */
  @Input() currentCandidateId: string | null = null;

  @Output() stationUpdated = new EventEmitter<polingStationObj>();

  private platformId = inject(PLATFORM_ID);
  private agentService = inject(AgentsService);
  private dialog = inject(MatDialog);

  displayedColumns: string[] = [
    'polling_station_code',
    'polling_station_name',
    'station_type',
    'assigned_to',
    'status',
    'actions'
  ];

  dataSource = new MatTableDataSource<polingStationObj>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnChanges(changes: SimpleChanges): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if (changes['stations']) {
      this.dataSource.data = this.stations || [];
      if (this.paginator) {
        this.dataSource.paginator = this.paginator;
        this.paginator.firstPage();
      }
    }
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  // ── Status helpers ──────────────────────────────────────────────────
  getStatus(station: polingStationObj): AssignmentStatus {
    return (station as any).assignment_status ?? (station.assigned_to ? 'active' : null);
  }

  statusLabel(status: AssignmentStatus): string {
    switch (status) {
      case 'pending': return 'Pending';
      case 'active': return 'Active';
      case 'reassigned': return 'Reassigned';
      case 'withdrawn': return 'Withdrawn';
      default: return 'Unassigned';
    }
  }

  statusClass(status: AssignmentStatus): string {
    return status ? `status-${status}` : 'status-none';
  }

  // ── Assign (first-time — no reassignment_reason, no reassigned_to) ───
  onAssign(station: polingStationObj): void {
    if (!this.currentCandidateId) {
      console.error('Cannot assign: currentCandidateId is missing.');
      return;
    }

    const dialogRef = this.dialog.open(AgentAssignDialog, {
      width: '480px',
      data: {
        mode: 'assign',
        station: { id: station.id!, polling_station_name: station.polling_station_name },
        agents: this.agents,
      }
    });

    dialogRef.afterClosed().subscribe((result: AgentAssignDialogResult | undefined) => {
      if (!result) return;

      const payload = {
        agent: result.agentId,
        polling_station: station.id,
        assigned_by: this.currentCandidateId,
        assigned_at: new Date().toISOString(),
        status: 'pending', // first assignment always starts as pending
        is_active: true,
      };

      this.agentService.assignPollingStationToAgent(payload).subscribe({
        next: () => {
          const agent = this.agents.find(a => a.id === result.agentId);
          const updated: polingStationObj = {
            ...station,
            assigned_to: agent ? `${agent.first_name} ${agent.last_name}` : result.agentId,
            assigned_by: this.currentCandidateId,
            assigned_date: payload.assigned_at,
          } as polingStationObj;
          (updated as any).assignment_status = 'pending';

          this.stationUpdated.emit(updated);
        },
        error: (error) => {
          console.error('Error assigning polling station:', error);
        }
      });
    });
  }

  // ── Reassign (existing assignment → new agent, requires a reason) ────
  // ASSUMPTION: the backend can resolve which assignment record to update
  // from `polling_station` + `agent` alone. If the API actually requires
  // the assignment's own `id` (not present in the list response this
  // component receives), this call will need an extra lookup step first —
  // confirm with the real AgentsService/API contract before relying on this.
  onReassign(station: polingStationObj): void {
    if (!this.currentCandidateId) {
      console.error('Cannot reassign: currentCandidateId is missing.');
      return;
    }

    const dialogRef = this.dialog.open(AgentAssignDialog, {
      width: '480px',
      data: {
        mode: 'reassign',
        station: { id: station.id!, polling_station_name: station.polling_station_name },
        agents: this.agents,
        currentAgentLabel: station.assigned_to,
      }
    });

    dialogRef.afterClosed().subscribe((result: AgentAssignDialogResult | undefined) => {
      if (!result) return;

      const payload = {
        polling_station: station.id,
        assigned_by: this.currentCandidateId,
        assigned_at: new Date().toISOString(),
        status: 'reassigned',
        reassigned_to: result.agentId,
        reassignment_reason: result.reassignmentReason,
        is_active: true,
      };

      this.agentService.assignPollingStationToAgent(payload).subscribe({
        next: () => {
          const agent = this.agents.find(a => a.id === result.agentId);
          const updated: polingStationObj = {
            ...station,
            assigned_to: agent ? `${agent.first_name} ${agent.last_name}` : result.agentId,
            assigned_date: payload.assigned_at,
          } as polingStationObj;
          (updated as any).assignment_status = 'reassigned';

          this.stationUpdated.emit(updated);
        },
        error: (error) => {
          console.error('Error reassigning polling station:', error);
        }
      });
    });
  }

  // ── Withdraw — marks the current assignment inactive ──────────────────
  // Same ASSUMPTION as onReassign: relies on backend resolving the record
  // from polling_station id alone.
  onWithdraw(station: polingStationObj): void {
    if (!this.currentCandidateId) {
      console.error('Cannot withdraw: currentCandidateId is missing.');
      return;
    }

    const payload = {
      polling_station: station.id,
      assigned_by: this.currentCandidateId,
      status: 'withdrawn',
      is_active: false,
    };

    this.agentService.assignPollingStationToAgent(payload).subscribe({
      next: () => {
        const updated: polingStationObj = { ...station, assigned_to: null };
        (updated as any).assignment_status = 'withdrawn';
        this.stationUpdated.emit(updated);
      },
      error: (error) => {
        console.error('Error withdrawing polling station assignment:', error);
      }
    });
  }
}