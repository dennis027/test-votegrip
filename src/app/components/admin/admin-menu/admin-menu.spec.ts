import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminMenu } from './admin-menu';

describe('AdminMenu', () => {
  let component: AdminMenu;
  let fixture: ComponentFixture<AdminMenu>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminMenu]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminMenu);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
