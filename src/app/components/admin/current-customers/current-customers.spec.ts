import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CurrentCustomers } from './current-customers';

describe('CurrentCustomers', () => {
  let component: CurrentCustomers;
  let fixture: ComponentFixture<CurrentCustomers>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CurrentCustomers]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CurrentCustomers);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
