import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatsCardComponent } from './stats-card.component';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

describe('StatsCardComponent', () => {
  let component: StatsCardComponent;
  let fixture: ComponentFixture<StatsCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatsCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StatsCardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    // Set required inputs
    fixture.componentRef.setInput('label', 'Test Label');
    fixture.componentRef.setInput('value', 42);
    fixture.componentRef.setInput('icon', 'pi pi-test');
    fixture.componentRef.setInput('colorVariant', 'success');

    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should display the correct label and value', () => {
    fixture.componentRef.setInput('label', 'Active Tools');
    fixture.componentRef.setInput('value', 25);
    fixture.componentRef.setInput('icon', 'pi pi-check-circle');
    fixture.componentRef.setInput('colorVariant', 'success');

    fixture.detectChanges();

    const labelElement = fixture.debugElement.query(By.css('.text-sm'));
    const valueElement = fixture.debugElement.query(By.css('.text-lg'));

    expect(labelElement.nativeElement.textContent.trim()).toBe('Active Tools');
    expect(valueElement.nativeElement.textContent.trim()).toBe('25');
  });

  it('should apply the correct icon class', () => {
    fixture.componentRef.setInput('label', 'Test');
    fixture.componentRef.setInput('value', 10);
    fixture.componentRef.setInput('icon', 'pi pi-cog');
    fixture.componentRef.setInput('colorVariant', 'info');

    fixture.detectChanges();

    const iconElement = fixture.debugElement.query(By.css('i'));
    expect(iconElement.nativeElement.className).toContain('pi pi-cog');
    expect(iconElement.nativeElement.className).toContain('text-xl');
  });

  it('should apply success color variant styles', () => {
    fixture.componentRef.setInput('label', 'Test');
    fixture.componentRef.setInput('value', 10);
    fixture.componentRef.setInput('icon', 'pi pi-check');
    fixture.componentRef.setInput('colorVariant', 'success');

    fixture.detectChanges();

    const cardElement = fixture.debugElement.query(By.css('.border-l-4'));
    const iconElement = fixture.debugElement.query(By.css('i'));

    expect(cardElement.nativeElement.style.borderLeftColor).toBe('rgb(16, 185, 129)');
    expect(iconElement.nativeElement.style.color).toBe('rgb(16, 185, 129)');
  });

  it('should apply danger color variant styles', () => {
    fixture.componentRef.setInput('label', 'Test');
    fixture.componentRef.setInput('value', 10);
    fixture.componentRef.setInput('icon', 'pi pi-times');
    fixture.componentRef.setInput('colorVariant', 'danger');

    fixture.detectChanges();

    const cardElement = fixture.debugElement.query(By.css('.border-l-4'));
    const iconElement = fixture.debugElement.query(By.css('i'));

    expect(cardElement.nativeElement.style.borderLeftColor).toBe('rgb(239, 68, 68)');
    expect(iconElement.nativeElement.style.color).toBe('rgb(239, 68, 68)');
  });

  it('should use custom border and icon colors when provided', () => {
    fixture.componentRef.setInput('label', 'Test');
    fixture.componentRef.setInput('value', 10);
    fixture.componentRef.setInput('icon', 'pi pi-custom');
    fixture.componentRef.setInput('colorVariant', 'info');
    fixture.componentRef.setInput('borderColor', '#ff0000');
    fixture.componentRef.setInput('iconColor', '#00ff00');

    fixture.detectChanges();

    const cardElement = fixture.debugElement.query(By.css('.border-l-4'));
    const iconElement = fixture.debugElement.query(By.css('i'));

    expect(cardElement.nativeElement.style.borderLeftColor).toBe('rgb(255, 0, 0)');
    expect(iconElement.nativeElement.style.color).toBe('rgb(0, 255, 0)');
  });

  it('should handle string and number values', () => {
    // Test with number
    fixture.componentRef.setInput('label', 'Count');
    fixture.componentRef.setInput('value', 100);
    fixture.componentRef.setInput('icon', 'pi pi-check');
    fixture.componentRef.setInput('colorVariant', 'success');

    fixture.detectChanges();

    let valueElement = fixture.debugElement.query(By.css('.text-lg'));
    expect(valueElement.nativeElement.textContent.trim()).toBe('100');

    // Test with string
    fixture.componentRef.setInput('value', '$1,250');
    fixture.detectChanges();

    valueElement = fixture.debugElement.query(By.css('.text-lg'));
    expect(valueElement.nativeElement.textContent.trim()).toBe('$1,250');
  });
});
