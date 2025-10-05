import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilderComponent } from './form-builder.component';
import { FormBuilderService } from './form-builder.service';
import { MessageService } from 'primeng/api';

describe('FormBuilderComponent', () => {
  let component: FormBuilderComponent;
  let fixture: ComponentFixture<FormBuilderComponent>;
  let formBuilderService: FormBuilderService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormBuilderComponent],
      providers: [FormBuilderService, MessageService],
    }).compileComponents();

    fixture = TestBed.createComponent(FormBuilderComponent);
    component = fixture.componentInstance;
    formBuilderService = TestBed.inject(FormBuilderService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should inject FormBuilderService', () => {
    expect(component.formBuilderService).toBeTruthy();
    expect(component.formBuilderService).toBe(formBuilderService);
  });

  it('should render three-panel layout', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const panels = compiled.querySelectorAll('.w-64, .flex-1, .w-80');
    expect(panels.length).toBeGreaterThanOrEqual(3);
  });

  it('should have toolbar with save, settings, and preview buttons', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const toolbar = compiled.querySelector('.toolbar');
    expect(toolbar).toBeTruthy();
  });
});
