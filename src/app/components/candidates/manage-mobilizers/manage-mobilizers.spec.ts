import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageMobilizers } from './manage-mobilizers';

describe('ManageMobilizers', () => {
  let component: ManageMobilizers;
  let fixture: ComponentFixture<ManageMobilizers>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageMobilizers]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageMobilizers);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
