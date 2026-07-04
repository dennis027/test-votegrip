import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignPollingStation } from './assign-polling-station';

describe('AssignPollingStation', () => {
  let component: AssignPollingStation;
  let fixture: ComponentFixture<AssignPollingStation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignPollingStation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssignPollingStation);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
