import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ErrorFeedbackComponent, ErrorInfo } from './error-feedback.component';

describe('ErrorFeedbackComponent', () => {
  let component: ErrorFeedbackComponent;
  let fixture: ComponentFixture<ErrorFeedbackComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorFeedbackComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ErrorFeedbackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not display anything when error is null', () => {
    fixture.componentRef.setInput('error', null);
    fixture.detectChanges();

    const container = fixture.debugElement.query(By.css('[role="alert"]'));
    expect(container).toBeNull();
  });

  it('should display error message', () => {
    const errorInfo: ErrorInfo = {
      message: 'Test error message',
      severity: 'error'
    };

    fixture.componentRef.setInput('error', errorInfo);
    fixture.detectChanges();

    const messageElement = fixture.debugElement.query(By.css('h3'));
    expect(messageElement.nativeElement.textContent.trim()).toBe('Test error message');
  });

  it('should display error details when provided', () => {
    const errorInfo: ErrorInfo = {
      message: 'Test error',
      severity: 'error',
      details: 'Detailed error information'
    };

    fixture.componentRef.setInput('error', errorInfo);
    fixture.detectChanges();

    const detailsElement = fixture.debugElement.query(By.css('p'));
    expect(detailsElement.nativeElement.textContent.trim()).toBe('Detailed error information');
  });

  it('should not display details when not provided', () => {
    const errorInfo: ErrorInfo = {
      message: 'Test error',
      severity: 'error'
    };

    fixture.componentRef.setInput('error', errorInfo);
    fixture.detectChanges();

    const detailsElement = fixture.debugElement.query(By.css('p'));
    expect(detailsElement).toBeNull();
  });

  describe('Action Button', () => {
    it('should display action button when actionText is provided', () => {
      const errorInfo: ErrorInfo = {
        message: 'Test error',
        severity: 'error',
        actionText: 'Retry'
      };

      fixture.componentRef.setInput('error', errorInfo);
      fixture.detectChanges();

      const actionButton = fixture.debugElement.query(By.css('button:not([aria-label="Dismiss"])'));
      expect(actionButton).toBeTruthy();
      expect(actionButton.nativeElement.textContent.trim()).toBe('Retry');
    });

    it('should not display action button when actionText is not provided', () => {
      const errorInfo: ErrorInfo = {
        message: 'Test error',
        severity: 'error'
      };

      fixture.componentRef.setInput('error', errorInfo);
      fixture.detectChanges();

      const actionButton = fixture.debugElement.query(By.css('button:not([aria-label="Dismiss"])'));
      expect(actionButton).toBeNull();
    });

    it('should emit action event when action button is clicked', () => {
      const errorInfo: ErrorInfo = {
        message: 'Test error',
        severity: 'error',
        actionText: 'Retry'
      };

      spyOn(component.action, 'emit');

      fixture.componentRef.setInput('error', errorInfo);
      fixture.detectChanges();

      const actionButton = fixture.debugElement.query(By.css('button:not([aria-label="Dismiss"])'));
      actionButton.nativeElement.click();

      expect(component.action.emit).toHaveBeenCalled();
    });
  });

  describe('Dismiss Button', () => {
    it('should display dismiss button by default', () => {
      const errorInfo: ErrorInfo = {
        message: 'Test error',
        severity: 'error'
      };

      fixture.componentRef.setInput('error', errorInfo);
      fixture.detectChanges();

      const dismissButton = fixture.debugElement.query(By.css('button[aria-label="Dismiss"]'));
      expect(dismissButton).toBeTruthy();
    });

    it('should not display dismiss button when dismissible is false', () => {
      const errorInfo: ErrorInfo = {
        message: 'Test error',
        severity: 'error',
        dismissible: false
      };

      fixture.componentRef.setInput('error', errorInfo);
      fixture.detectChanges();

      const dismissButton = fixture.debugElement.query(By.css('button[aria-label="Dismiss"]'));
      expect(dismissButton).toBeNull();
    });

    it('should emit dismiss event when dismiss button is clicked', () => {
      const errorInfo: ErrorInfo = {
        message: 'Test error',
        severity: 'error'
      };

      spyOn(component.dismiss, 'emit');

      fixture.componentRef.setInput('error', errorInfo);
      fixture.detectChanges();

      const dismissButton = fixture.debugElement.query(By.css('button[aria-label="Dismiss"]'));
      dismissButton.nativeElement.click();

      expect(component.dismiss.emit).toHaveBeenCalled();
    });
  });

  describe('Severity Styling', () => {
    it('should apply error styling for error severity', () => {
      const errorInfo: ErrorInfo = {
        message: 'Test error',
        severity: 'error'
      };

      fixture.componentRef.setInput('error', errorInfo);
      fixture.detectChanges();

      const container = fixture.debugElement.query(By.css('[role="alert"]'));
      expect(container.nativeElement.classList).toContain('bg-red-50');
    });

    it('should apply warning styling for warning severity', () => {
      const errorInfo: ErrorInfo = {
        message: 'Test warning',
        severity: 'warning'
      };

      fixture.componentRef.setInput('error', errorInfo);
      fixture.detectChanges();

      const container = fixture.debugElement.query(By.css('[role="alert"]'));
      expect(container.nativeElement.classList).toContain('bg-yellow-50');
    });

    it('should apply info styling for info severity', () => {
      const errorInfo: ErrorInfo = {
        message: 'Test info',
        severity: 'info'
      };

      fixture.componentRef.setInput('error', errorInfo);
      fixture.detectChanges();

      const container = fixture.debugElement.query(By.css('[role="alert"]'));
      expect(container.nativeElement.classList).toContain('bg-blue-50');
    });

    it('should apply success styling for success severity', () => {
      const errorInfo: ErrorInfo = {
        message: 'Test success',
        severity: 'success'
      };

      fixture.componentRef.setInput('error', errorInfo);
      fixture.detectChanges();

      const container = fixture.debugElement.query(By.css('[role="alert"]'));
      expect(container.nativeElement.classList).toContain('bg-green-50');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for error messages', () => {
      const errorInfo: ErrorInfo = {
        message: 'Test error',
        severity: 'error'
      };

      fixture.componentRef.setInput('error', errorInfo);
      fixture.detectChanges();

      const container = fixture.debugElement.query(By.css('[role="alert"]'));
      expect(container.nativeElement.getAttribute('role')).toBe('alert');
      expect(container.nativeElement.getAttribute('aria-live')).toBe('assertive');
    });

    it('should have proper ARIA attributes for non-error messages', () => {
      const errorInfo: ErrorInfo = {
        message: 'Test info',
        severity: 'info'
      };

      fixture.componentRef.setInput('error', errorInfo);
      fixture.detectChanges();

      const container = fixture.debugElement.query(By.css('[role="alert"]'));
      expect(container.nativeElement.getAttribute('aria-live')).toBe('polite');
    });
  });
});