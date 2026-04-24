import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestCredentials } from './request-credentials';

describe('RequestCredentials', () => {
  let component: RequestCredentials;
  let fixture: ComponentFixture<RequestCredentials>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestCredentials]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequestCredentials);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
