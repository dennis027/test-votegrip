import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID, ViewChild, OnInit, TemplateRef } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../services/auth/auth';
import { SchedulesService, ScheduleBody } from '../../../services/candidates/schedules-service';

interface CalendarDay {
  date: Date;
  dateKey: string;
  inCurrentMonth: boolean;
  isToday: boolean;
  activities: ScheduleBody[];
}

@Component({
  selector: 'app-schedules',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatIconModule,
  ],
  templateUrl: './schedules.html',
  styleUrl: './schedules.css',
})
export class Schedules implements OnInit {
  userForm!: FormGroup;
  candidateId: any;
  isEditing = false;
  currentScheduleId: string | null = null;

  activityTypes = [
    { value: 'meeting', label: 'Meeting' },
    { value: 'rally', label: 'Rally' },
    { value: 'training', label: 'Training' },
    { value: 'canvassing', label: 'Canvassing' },
    { value: 'media', label: 'Media Appearance' },
    { value: 'other', label: 'Other' },
  ];

  statuses = [
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  allActivities: ScheduleBody[] = [];
  activitiesByDate = new Map<string, ScheduleBody[]>();
  calendarWeeks: CalendarDay[][] = [];
  currentMonth = new Date();
  selectedDateKey: string | null = null;
  selectedDayActivities: ScheduleBody[] = [];
  upcomingActivities: ScheduleBody[] = [];

  private route = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private snackBar = inject(MatSnackBar);
  private schedulesService = inject(SchedulesService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);

  @ViewChild('addUpdateScheduleDialog') addUpdateScheduleDialog!: TemplateRef<any>;
  @ViewChild('deleteScheduleDialog') deleteScheduleDialog!: TemplateRef<any>;

  closeDialog(): void {
    this.dialog.closeAll();
  }

  ngOnInit() {
    this.initForm();
    this.buildCalendar();
    if (isPlatformBrowser(this.platformId)) {
      this.getProfile();
    }
  }

  initForm() {
    this.userForm = this.fb.group({
      activity_name: ['', [Validators.required, Validators.minLength(3)]],
      activity_type: ['meeting', Validators.required],
      description: [''],
      start_time: ['', Validators.required],
      end_time: ['', Validators.required],
      location: [''],
      status: ['scheduled', Validators.required],
      reminder_sent: [false],
    });
  }

  getProfile() {
    this.authService.getProfile().subscribe({
      next: (profile: any) => {
        this.candidateId = profile?.data.id;
        this.getSchedules();
      },
      error: () => {
        this.showError('Session expired. Please login again.');
        this.route.navigate(['login']);
      },
    });
  }

  getSchedules() {
    this.schedulesService.getSchedulesList().subscribe({
      next: (response: any) => {
        this.allActivities = response.results || [];
        this.indexActivities();
        this.buildCalendar();
        this.buildUpcomingList();
      },
      error: () => this.showError('Failed to load schedule.'),
    });
  }

  // ---------- Date helpers ----------

  private dateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private indexActivities() {
    this.activitiesByDate.clear();
    for (const activity of this.allActivities) {
      if (!activity.start_time) continue;
      const key = this.dateKey(new Date(activity.start_time));
      const list = this.activitiesByDate.get(key) || [];
      list.push(activity);
      this.activitiesByDate.set(key, list);
    }
    // sort each day's activities by start time
    this.activitiesByDate.forEach((list) =>
      list.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    );
  }

  buildCalendar() {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = firstOfMonth.getDay(); // 0 = Sunday
    const gridStart = new Date(year, month, 1 - startOffset);

    const todayKey = this.dateKey(new Date());
    const weeks: CalendarDay[][] = [];
    let cursor = new Date(gridStart);

    for (let w = 0; w < 6; w++) {
      const week: CalendarDay[] = [];
      for (let d = 0; d < 7; d++) {
        const key = this.dateKey(cursor);
        week.push({
          date: new Date(cursor),
          dateKey: key,
          inCurrentMonth: cursor.getMonth() === month,
          isToday: key === todayKey,
          activities: this.activitiesByDate.get(key) || [],
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }
    this.calendarWeeks = weeks;
  }

  buildUpcomingList() {
    const now = new Date();
    this.upcomingActivities = this.allActivities
      .filter((a) => a.start_time && new Date(a.start_time).getTime() >= now.getTime())
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .slice(0, 15);
  }

  prevMonth() {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.buildCalendar();
  }

  nextMonth() {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    this.buildCalendar();
  }

  goToToday() {
    this.currentMonth = new Date();
    this.buildCalendar();
    this.selectDay(this.dateKey(new Date()));
  }

  selectDay(dateKey: string) {
    this.selectedDateKey = dateKey;
    this.selectedDayActivities = this.activitiesByDate.get(dateKey) || [];
  }

  // ---------- CRUD ----------

  addUpdateDialC(prefillDateKey?: string) {
    if (prefillDateKey && !this.isEditing) {
      const [y, m, d] = prefillDateKey.split('-').map(Number);
      const prefill = new Date(y, m - 1, d, 9, 0);
      this.userForm.patchValue({ start_time: this.toLocalInput(prefill) });
    }
    const dialogRef = this.dialog.open(this.addUpdateScheduleDialog, {
      minWidth: '480px',
      panelClass: 'custom-dialog-container',
    });
    dialogRef.afterClosed().subscribe(() => {
      this.isEditing = false;
      this.resetFormState();
    });
  }

  private toLocalInput(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  onSubmit() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const raw = this.userForm.value;
    const payload: Partial<ScheduleBody> = {
      ...raw,
      candidate: this.candidateId,
      start_time: new Date(raw.start_time).toISOString(),
      end_time: new Date(raw.end_time).toISOString(),
    };

    const handleResponse = {
      next: () => {
        this.showSuccess(this.isEditing ? 'Activity updated!' : 'Activity scheduled!');
        this.getSchedules();
        this.dialog.closeAll();
        this.resetFormState();
      },
      error: (err: any) => {
        const backendErrors = err.error?.errors;
        if (backendErrors) {
          Object.keys(backendErrors).forEach((key) => {
            const formControl = this.userForm.get(key);
            if (formControl) {
              formControl.setErrors({ serverError: backendErrors[key][0] });
            }
          });
        } else {
          this.showError(err.error?.message || 'An unexpected error occurred.');
        }
      },
    };

    if (this.isEditing && this.currentScheduleId) {
      this.schedulesService.updateSchedule(this.currentScheduleId, payload).subscribe(handleResponse);
    } else {
      this.schedulesService.addScheduleApi(payload).subscribe(handleResponse);
    }
  }

  onEdit(activity: ScheduleBody) {
    this.isEditing = true;
    this.currentScheduleId = activity.id || null;
    this.userForm.patchValue({
      activity_name: activity.activity_name,
      activity_type: activity.activity_type,
      description: activity.description,
      start_time: this.toLocalInput(new Date(activity.start_time)),
      end_time: this.toLocalInput(new Date(activity.end_time)),
      location: activity.location,
      status: activity.status,
      reminder_sent: activity.reminder_sent,
    });
    this.addUpdateDialC();
  }

  onDelete(id: string) {
    const dialogRef = this.dialog.open(this.deleteScheduleDialog);
    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'yes') {
        this.schedulesService.deleteSchedule(id).subscribe({
          next: () => {
            this.showSuccess('Deleted successfully');
            this.getSchedules();
          },
          error: () => this.showError('Delete failed.'),
        });
      }
    });
  }

  resetFormState() {
    this.isEditing = false;
    this.currentScheduleId = null;
    this.userForm.reset({ activity_type: 'meeting', status: 'scheduled', reminder_sent: false });
  }

  monthLabel(): string {
    return this.currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  showSuccess(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }

  showError(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      panelClass: ['error-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }
}