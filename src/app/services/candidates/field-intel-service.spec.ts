import { TestBed } from '@angular/core/testing';

import { FieldIntelService } from './field-intel-service';

describe('FieldIntelService', () => {
  let service: FieldIntelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FieldIntelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
