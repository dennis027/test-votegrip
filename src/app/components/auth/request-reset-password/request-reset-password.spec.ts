import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestResetPassword } from './request-reset-password';

describe('RequestResetPassword', () => {
  let component: RequestResetPassword;
  let fixture: ComponentFixture<RequestResetPassword>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestResetPassword]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequestResetPassword);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
