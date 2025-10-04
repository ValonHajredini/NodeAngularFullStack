import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { SubmissionsListComponent } from './submissions-list.component';

describe('SubmissionsListComponent', () => {
  let component: SubmissionsListComponent;
  let fixture: ComponentFixture<SubmissionsListComponent>;

  const mockActivatedRoute = {
    snapshot: {
      paramMap: {
        get: (key: string) => 'test-form-id',
      },
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubmissionsListComponent, HttpClientTestingModule],
      providers: [{ provide: ActivatedRoute, useValue: mockActivatedRoute }],
    }).compileComponents();

    fixture = TestBed.createComponent(SubmissionsListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should get form ID from route', () => {
    component.ngOnInit();
    expect(component.formId).toBe('test-form-id');
  });

  it('should truncate long text', () => {
    const longText = 'a'.repeat(150);
    const truncated = component.truncate(longText, 100);
    expect(truncated.length).toBe(103); // 100 + '...'
    expect(truncated.endsWith('...')).toBe(true);
  });

  it('should not truncate short text', () => {
    const shortText = 'short';
    const result = component.truncate(shortText, 100);
    expect(result).toBe(shortText);
  });

  it('should format date correctly', () => {
    const date = '2025-01-04T14:30:00Z';
    const formatted = component.formatDate(date);
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe('string');
  });
});
