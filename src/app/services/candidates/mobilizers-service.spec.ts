import { TestBed } from '@angular/core/testing';

import { MobilizersService } from './mobilizers-service';

describe('MobilizersService', () => {
  let service: MobilizersService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MobilizersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
