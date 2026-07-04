import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoverGaps } from './cover-gaps';

describe('CoverGaps', () => {
  let component: CoverGaps;
  let fixture: ComponentFixture<CoverGaps>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoverGaps]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CoverGaps);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
