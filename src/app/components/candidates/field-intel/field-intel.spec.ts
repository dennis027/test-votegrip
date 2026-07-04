import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FieldIntel } from './field-intel';

describe('FieldIntel', () => {
  let component: FieldIntel;
  let fixture: ComponentFixture<FieldIntel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FieldIntel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FieldIntel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
