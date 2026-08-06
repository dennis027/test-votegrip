import { TestBed } from '@angular/core/testing';

import { ElectionTypesService } from './election-types-service';

describe('ElectionTypesService', () => {
  let service: ElectionTypesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ElectionTypesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
