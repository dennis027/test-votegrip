import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageTraining } from './manage-training';

describe('ManageTraining', () => {
  let component: ManageTraining;
  let fixture: ComponentFixture<ManageTraining>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageTraining]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageTraining);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
