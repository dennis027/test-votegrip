import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Documentations } from './documentations';

describe('Documentations', () => {
  let component: Documentations;
  let fixture: ComponentFixture<Documentations>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Documentations]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Documentations);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
