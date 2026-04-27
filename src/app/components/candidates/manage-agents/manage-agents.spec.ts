import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageAgents } from './manage-agents';

describe('ManageAgents', () => {
  let component: ManageAgents;
  let fixture: ComponentFixture<ManageAgents>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageAgents]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageAgents);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
