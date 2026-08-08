import { TestBed } from '@angular/core/testing';

import { PolingStationService } from './poling-station-service';

describe('PolingStationService', () => {
  let service: PolingStationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PolingStationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
