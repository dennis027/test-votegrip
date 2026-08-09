import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PollingStationTable } from './polling-station-table';

describe('PollingStationTable', () => {
  let component: PollingStationTable;
  let fixture: ComponentFixture<PollingStationTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PollingStationTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PollingStationTable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
