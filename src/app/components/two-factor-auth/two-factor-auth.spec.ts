import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TwoFactorAuth } from './two-factor-auth';

describe('TwoFactorAuth', () => {
  let component: TwoFactorAuth;
  let fixture: ComponentFixture<TwoFactorAuth>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TwoFactorAuth]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TwoFactorAuth);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
