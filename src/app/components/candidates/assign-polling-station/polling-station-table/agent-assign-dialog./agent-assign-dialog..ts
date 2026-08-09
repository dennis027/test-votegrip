import { Component, inject, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

export interface AgentOption {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
}

export interface AgentAssignDialogData {
  mode: 'assign' | 'reassign';
  station: { id: string; polling_station_name: string };
  agents: AgentOption[];
  currentAgentLabel?: string | null; // shown for context in reassign mode
}

export interface AgentAssignDialogResult {
  agentId: string;
  reassignmentReason?: string;
}

@Component({
  selector: 'app-agent-assign-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatRadioModule, MatFormFieldModule, MatInputModule],
  templateUrl: './agent-assign-dialog..html',
  styleUrl: './agent-assign-dialog..css',
})
export class AgentAssignDialog {
  private dialogRef = inject(MatDialogRef<AgentAssignDialog>);

  selectedAgentId: string | null = null;
  reassignmentReason = '';

  constructor(@Inject(MAT_DIALOG_DATA) public data: AgentAssignDialogData) {}

  get isReassign(): boolean {
    return this.data.mode === 'reassign';
  }

  get canConfirm(): boolean {
    if (!this.selectedAgentId) return false;
    if (this.isReassign && !this.reassignmentReason.trim()) return false;
    return true;
  }

  confirm(): void {
    if (!this.canConfirm || !this.selectedAgentId) return;

    const result: AgentAssignDialogResult = { agentId: this.selectedAgentId };
    if (this.isReassign) {
      result.reassignmentReason = this.reassignmentReason.trim();
    }

    this.dialogRef.close(result);
  }

  cancel(): void {
    this.dialogRef.close(undefined);
  }
}