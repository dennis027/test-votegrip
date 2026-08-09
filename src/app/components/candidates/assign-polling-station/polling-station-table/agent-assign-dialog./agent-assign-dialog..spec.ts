import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgentAssignDialog } from './agent-assign-dialog.';

describe('AgentAssignDialog', () => {
  let component: AgentAssignDialog;
  let fixture: ComponentFixture<AgentAssignDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgentAssignDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AgentAssignDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
