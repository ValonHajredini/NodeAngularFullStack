import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TokenReuseConfirmationComponent } from './token-reuse-confirmation.component';
import { TokenStatusResponse } from '@nodeangularfullstack/shared';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('TokenReuseConfirmationComponent', () => {
  let component: TokenReuseConfirmationComponent;
  let fixture: ComponentFixture<TokenReuseConfirmationComponent>;

  const mockTokenStatus: TokenStatusResponse = {
    hasValidToken: true,
    tokenExpiration: new Date('2025-12-31T23:59:59Z'),
    tokenCreatedAt: new Date('2025-01-01T00:00:00Z'),
    formUrl: 'http://localhost:4200/public/form/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  };

  const mockPermanentTokenStatus: TokenStatusResponse = {
    hasValidToken: true,
    tokenExpiration: null,
    tokenCreatedAt: new Date('2025-01-01T00:00:00Z'),
    formUrl: 'http://localhost:4200/public/form/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TokenReuseConfirmationComponent,
        DialogModule,
        ButtonModule,
        MessageModule,
        NoopAnimationsModule,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TokenReuseConfirmationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Inputs', () => {
    it('should accept visible input', () => {
      component.visible = true;
      fixture.detectChanges();
      expect(component.visible).toBe(true);
    });

    it('should accept tokenStatus input', () => {
      component.tokenStatus = mockTokenStatus;
      fixture.detectChanges();
      expect(component.tokenStatus).toEqual(mockTokenStatus);
    });
  });

  describe('Event Emitters', () => {
    it('should emit visibleChange when onHide is called', () => {
      spyOn(component.visibleChange, 'emit');
      component.onHide();
      expect(component.visibleChange.emit).toHaveBeenCalledWith(false);
      expect(component.visible).toBe(false);
    });

    it('should emit reuseToken when onReuseToken is called', () => {
      spyOn(component.reuseToken, 'emit');
      spyOn(component, 'onHide');

      component.onReuseToken();

      expect(component.reuseToken.emit).toHaveBeenCalled();
      expect(component.onHide).toHaveBeenCalled();
    });

    it('should emit generateNewToken when onGenerateNewToken is called', () => {
      spyOn(component.generateNewToken, 'emit');
      spyOn(component, 'onHide');

      component.onGenerateNewToken();

      expect(component.generateNewToken.emit).toHaveBeenCalled();
      expect(component.onHide).toHaveBeenCalled();
    });
  });

  describe('Computed Properties', () => {
    describe('expirationText', () => {
      it('should return empty string when tokenStatus is null', () => {
        component.tokenStatus = null;
        expect(component.expirationText).toBe('');
      });

      it('should return "No expiration (permanent token)" for permanent tokens', () => {
        component.tokenStatus = mockPermanentTokenStatus;
        expect(component.expirationText).toBe('No expiration (permanent token)');
      });

      it('should return "Expires in X days" for future expiration', () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 5);

        component.tokenStatus = {
          ...mockTokenStatus,
          tokenExpiration: futureDate,
        };

        expect(component.expirationText).toBe('Expires in 5 days');
      });

      it('should return "Expires in 1 day" for singular day', () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        component.tokenStatus = {
          ...mockTokenStatus,
          tokenExpiration: tomorrow,
        };

        expect(component.expirationText).toBe('Expires in 1 day');
      });

      it('should return "Token expired" for past expiration', () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);

        component.tokenStatus = {
          ...mockTokenStatus,
          tokenExpiration: pastDate,
        };

        expect(component.expirationText).toBe('Token expired');
      });

      it('should return formatted date for long-term expiration', () => {
        const longTermDate = new Date();
        longTermDate.setDate(longTermDate.getDate() + 100);

        component.tokenStatus = {
          ...mockTokenStatus,
          tokenExpiration: longTermDate,
        };

        expect(component.expirationText).toContain('Expires on');
        expect(component.expirationText).toContain(longTermDate.toLocaleDateString());
      });
    });

    describe('creationText', () => {
      it('should return empty string when tokenStatus is null', () => {
        component.tokenStatus = null;
        expect(component.creationText).toBe('');
      });

      it('should return formatted creation date', () => {
        component.tokenStatus = mockTokenStatus;
        const expectedDate = mockTokenStatus.tokenCreatedAt.toLocaleDateString();
        expect(component.creationText).toBe(`Created on ${expectedDate}`);
      });
    });

    describe('displayUrl', () => {
      it('should return empty string when tokenStatus is null', () => {
        component.tokenStatus = null;
        expect(component.displayUrl).toBe('');
      });

      it('should return full URL when short enough', () => {
        const shortUrl = 'http://localhost:4200/public/form/short';
        component.tokenStatus = {
          ...mockTokenStatus,
          formUrl: shortUrl,
        };
        expect(component.displayUrl).toBe(shortUrl);
      });

      it('should return truncated URL when too long', () => {
        const longUrl =
          'http://localhost:4200/public/form/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmb3JtU2NoZW1hSWQiOiIzOTdhNTE0Yy0xOWI2LTRiM2EtODdlMy0yNGIyODFiMjQ1N2QiLCJleHBpcmVzQXQiOiIyMDI1LTExLTA1VDIxOjQ1OjIyLjM2MloiLCJpc3MiOiJmb3JtLWJ1aWxkZXIiLCJpYXQiOjE3NTk2OTcxMjIsImV4cCI6MTc2MjM3OTEyMX0.5SW97nGpVt9hd8ogabCpvsEngPptmEmFdjPs1Z5dw1A';
        component.tokenStatus = {
          ...mockTokenStatus,
          formUrl: longUrl,
        };

        const result = component.displayUrl;
        expect(result).toContain('...');
        expect(result.length).toBeLessThan(longUrl.length);
        expect(result).toContain(longUrl.substring(0, 30));
        expect(result).toContain(longUrl.substring(longUrl.length - 27));
      });
    });
  });

  describe('Template Integration', () => {
    it('should not render dialog when visible is false', () => {
      component.visible = false;
      fixture.detectChanges();

      const dialogElement = fixture.nativeElement.querySelector('p-dialog');
      expect(dialogElement).toBeFalsy();
    });

    it('should render dialog when visible is true', () => {
      component.visible = true;
      component.tokenStatus = mockTokenStatus;
      fixture.detectChanges();

      const dialogElement = fixture.nativeElement.querySelector('p-dialog');
      expect(dialogElement).toBeTruthy();
    });

    it('should display token information when tokenStatus is provided', () => {
      component.visible = true;
      component.tokenStatus = mockTokenStatus;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Existing Token Found');
      expect(compiled.textContent).toContain('This form already has a valid public token');
    });

    it('should show reuse and generate buttons', () => {
      component.visible = true;
      component.tokenStatus = mockTokenStatus;
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('button');
      const buttonTexts = Array.from(buttons).map((btn: any) => btn.textContent.trim());

      expect(buttonTexts).toContain('Use Existing Token');
      expect(buttonTexts).toContain('Generate New Token');
    });
  });
});
