import { TestBed } from '@angular/core/testing';

import { GeographicalService } from './geographical-service';

describe('GeographicalService', () => {
  let service: GeographicalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GeographicalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
