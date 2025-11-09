import { Component, Input, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { MessageModule } from 'primeng/message';
import { environment } from '../../../../environments/environment';
import { IframeEmbedOptions, IframeEmbedCode } from '@nodeangularfullstack/shared';

/**
 * Iframe embed code generator component.
 * Story 26.4: Iframe Embed Code Generator - Brownfield Enhancement
 *
 * Generates HTML iframe embed codes for published forms with customizable
 * dimensions and security attributes. Integrates with PublishDialogComponent
 * to provide embed functionality after successful form publishing.
 */
@Component({
  selector: 'app-iframe-embed-generator',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    Select,
    CheckboxModule,
    TooltipModule,
    MessageModule,
  ],
  templateUrl: './iframe-embed-generator.component.html',
  styleUrls: ['./iframe-embed-generator.component.scss'],
})
export class IframeEmbedGeneratorComponent implements OnInit {
  /** Public form URL for embedding */
  @Input({ required: true }) formUrl!: string;

  /** Form title for iframe title attribute */
  @Input({ required: true }) formTitle!: string;

  /** Form short code for URL construction */
  @Input({ required: true }) shortCode!: string;

  /** Optional initial iframe embed options (from published form) */
  @Input() initialOptions?: IframeEmbedOptions;

  /** Whether to hide the customization form (show only generated code) */
  @Input() hideCustomization = false;

  /** Reactive form for iframe options */
  embedForm!: FormGroup;

  /** Signal for copy success state */
  copySuccess = signal(false);

  /** Available dimension presets */
  readonly dimensionPresets = [
    { label: 'Small (400x600)', value: 'small', width: '400', height: '600' },
    { label: 'Medium (600x800)', value: 'medium', width: '600', height: '800' },
    { label: 'Large (800x1000)', value: 'large', width: '800', height: '1000' },
    { label: 'Custom', value: 'custom', width: '600', height: '800' },
  ];

  /** Computed iframe embed code */
  readonly embedCode = computed(() => this.generateEmbedCode());

  /** Computed preview dimensions for visual feedback */
  readonly previewDimensions = computed(() => {
    const options = this.getEmbedOptions();
    return {
      width: options.responsive ? '100%' : options.width,
      height: options.height,
      responsive: options.responsive,
    };
  });

  ngOnInit(): void {
    this.initializeForm();
  }

  /**
   * Initializes the reactive form with default values or initial options from published form.
   */
  private initializeForm(): void {
    // Use initial options from published form if available, otherwise use defaults
    const defaultWidth = this.initialOptions?.width?.replace('px', '') || '600';
    const defaultHeight = this.initialOptions?.height?.replace('px', '') || '800';
    const defaultResponsive = this.initialOptions?.responsive ?? false;
    const defaultShowBorder = this.initialOptions?.showBorder ?? false;
    const defaultAllowScrolling = this.initialOptions?.allowScrolling ?? true;
    const defaultTitle = this.initialOptions?.title || this.formTitle || 'Form';

    this.embedForm = new FormGroup({
      preset: new FormControl('custom'), // Always start with custom when initial options provided
      width: new FormControl(defaultWidth, [Validators.required, Validators.pattern(/^\d+(%|px)?$/)]),
      height: new FormControl(defaultHeight, [Validators.required, Validators.pattern(/^\d+(%|px)?$/)]),
      responsive: new FormControl(defaultResponsive),
      showBorder: new FormControl(defaultShowBorder),
      allowScrolling: new FormControl(defaultAllowScrolling),
      title: new FormControl(defaultTitle, [
        Validators.required,
        Validators.maxLength(100),
      ]),
    });

    // Subscribe to preset changes to update width/height
    this.embedForm.get('preset')?.valueChanges.subscribe((preset: string) => {
      this.onPresetChange(preset);
    });

    // Subscribe to responsive toggle to update width format
    this.embedForm.get('responsive')?.valueChanges.subscribe((responsive: boolean) => {
      this.onResponsiveChange(responsive);
    });
  }

  /**
   * Handles preset selection changes.
   * Updates width and height based on selected preset.
   */
  private onPresetChange(preset: string): void {
    const selectedPreset = this.dimensionPresets.find((p) => p.value === preset);
    if (selectedPreset && preset !== 'custom') {
      this.embedForm.patchValue(
        {
          width: selectedPreset.width,
          height: selectedPreset.height,
        },
        { emitEvent: false },
      );
    }
  }

  /**
   * Handles responsive toggle changes.
   * Converts width to percentage when responsive is enabled.
   */
  private onResponsiveChange(responsive: boolean): void {
    const currentWidth = this.embedForm.get('width')?.value;
    if (responsive && currentWidth && !currentWidth.includes('%')) {
      // Convert to percentage width for responsive design
      this.embedForm.patchValue(
        {
          width: '100%',
        },
        { emitEvent: false },
      );
    } else if (!responsive && currentWidth?.includes('%')) {
      // Convert back to pixel width
      this.embedForm.patchValue(
        {
          width: '600',
        },
        { emitEvent: false },
      );
    }
  }

  /**
   * Gets current embed options from form values.
   */
  private getEmbedOptions(): IframeEmbedOptions {
    const formValue = this.embedForm.value;
    return {
      width: this.formatDimension(formValue.width),
      height: this.formatDimension(formValue.height),
      responsive: formValue.responsive || false,
      showBorder: formValue.showBorder || false,
      allowScrolling: formValue.allowScrolling !== false,
      title: formValue.title || this.formTitle || 'Form',
    };
  }

  /**
   * Formats dimension value to include 'px' if no unit specified.
   */
  private formatDimension(value: string): string {
    if (!value) return '600px';
    if (
      value.includes('%') ||
      value.includes('px') ||
      value.includes('em') ||
      value.includes('rem')
    ) {
      return value;
    }
    return `${value}px`;
  }

  /**
   * Generates the complete iframe embed code.
   */
  private generateEmbedCode(): IframeEmbedCode {
    const options = this.getEmbedOptions();
    const baseUrl = environment.production ? window.location.origin : 'http://localhost:4201';
    const iframeSrc = `${baseUrl}/forms/render/${this.shortCode}`;

    // Generate unique ID for this iframe instance
    const iframeId = `form-iframe-${this.shortCode}`;

    // Generate secure iframe HTML with proper attributes
    const htmlCode = `<iframe
  id="${iframeId}"
  src="${iframeSrc}"
  width="${options.width}"
  height="${options.height}"
  frameborder="${options.showBorder ? '1' : '0'}"
  scrolling="${options.allowScrolling ? 'auto' : 'no'}"
  sandbox="allow-forms allow-scripts allow-same-origin"
  title="${this.escapeHtml(options.title)}"
  loading="lazy"
  style="transition: height 0.3s ease;"
>
  <p>
    Your browser does not support iframes.
    <a href="${iframeSrc}" target="_blank">Open form in new window</a>
  </p>
</iframe>

<script>
  // Dynamic height adjustment for step forms
  (function() {
    var iframe = document.getElementById('${iframeId}');

    if (!iframe) {
      console.error('Iframe not found: ${iframeId}');
      return;
    }

    // Listen for height change messages from iframe
    window.addEventListener('message', function(event) {
      // Security: Verify the message origin matches the iframe source
      var iframeSrcOrigin = '${baseUrl}';

      // Accept messages from the iframe origin
      if (event.origin !== iframeSrcOrigin) {
        return;
      }

      // Check if this is a height change message
      if (event.data && event.data.type === 'formHeightChange' && typeof event.data.height === 'number') {
        var newHeight = event.data.height + 'px';
        iframe.style.height = newHeight;
        console.log('[Form Embed] Height updated to:', newHeight);
      }
    });

    console.log('[Form Embed] Dynamic height listener initialized for iframe: ${iframeId}');
  })();
</script>`;

    return {
      htmlCode,
      previewUrl: iframeSrc,
      options,
    };
  }

  /**
   * Escapes HTML special characters for safe embedding.
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Copies the generated iframe code to clipboard.
   * Provides visual feedback on successful copy.
   */
  async onCopyEmbedCode(): Promise<void> {
    try {
      const embedCode = this.embedCode();
      await navigator.clipboard.writeText(embedCode.htmlCode);

      // Show success feedback
      this.copySuccess.set(true);
      setTimeout(() => this.copySuccess.set(false), 2000);
    } catch (error) {
      console.error('Failed to copy embed code:', error);
      // Fallback for older browsers
      this.fallbackCopyToClipboard(this.embedCode().htmlCode);
    }
  }

  /**
   * Fallback copy method for browsers without clipboard API support.
   */
  private fallbackCopyToClipboard(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      this.copySuccess.set(true);
      setTimeout(() => this.copySuccess.set(false), 2000);
    } catch (err) {
      console.error('Fallback copy failed:', err);
    } finally {
      document.body.removeChild(textArea);
    }
  }

  /**
   * Checks if the form has validation errors.
   */
  get hasFormErrors(): boolean {
    return this.embedForm.invalid && this.embedForm.dirty;
  }

  /**
   * Gets the current preset value for template binding.
   */
  get currentPreset(): string {
    return this.embedForm.get('preset')?.value || 'medium';
  }

  /**
   * Checks if custom preset is selected.
   */
  get isCustomPreset(): boolean {
    return this.currentPreset === 'custom';
  }

  /**
   * Gets the responsive toggle state.
   */
  get isResponsive(): boolean {
    return this.embedForm.get('responsive')?.value || false;
  }
}
