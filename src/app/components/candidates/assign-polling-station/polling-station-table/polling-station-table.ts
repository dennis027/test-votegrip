import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  AfterViewInit,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';

import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';

import { polingStationObj } from '../assign-polling-station';

@Component({
  selector: 'app-polling-station-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule
  ],
  templateUrl: './polling-station-table.html',
  styleUrl: './polling-station-table.css',
})
export class PollingStationTable implements OnChanges {

  @Input() stations: polingStationObj[] = [];
  @Input() agents: any[] = [];
  private platformId = inject(PLATFORM_ID);

  @Output() assign = new EventEmitter<polingStationObj>();

  displayedColumns: string[] = [
    'polling_station_code',
    'polling_station_name',
    'station_type',
    'assigned_to',
    'actions'
  ];

  dataSource = new MatTableDataSource<polingStationObj>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;


  ngOnChanges(changes: SimpleChanges): void {
    if (!isPlatformBrowser(this.platformId)) return;
      // Stations changed
      if (changes['stations']) {
        this.dataSource.data = this.stations || [];

        if (this.paginator) {
          this.dataSource.paginator = this.paginator;
          this.paginator.firstPage();
        }
      }

      // Agents changed
      if (changes['agents']) {
        console.log('Agents received in PollingStationTable:', this.agents);
      }
  
  }


  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }


  onAssign(station: polingStationObj): void {
    this.assign.emit(station);

    console.log('Station ID:', station?.id);
    console.log('Available agents:', this.agents);
  }


  onUnassign(station: polingStationObj): void {
    const unassignedStation = {
      ...station,
      assigned_to: null
    };

    this.assign.emit(unassignedStation);
  }
}