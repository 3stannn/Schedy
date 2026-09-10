/**
 * iOS & Mobile Web Haptic Feedback Engine
 *
 * iOS Safari Support:
 * Apple Safari on iOS does not support the standard Web Vibration API (navigator.vibrate).
 * To provide genuine tactile feedback via the device's Taptic Engine, we leverage the
 * iOS 17.4+ native `<input type="checkbox" switch>` element. Toggling its associated
 * `<label>` programmatically within a user touch/click gesture activates the system Taptic Engine.
 *
 * Android & Chromium Support:
 * Uses standard `navigator.vibrate(pattern)` for cross-platform support.
 */

const HAPTICS_STORAGE_KEY = 'schedy_haptics_enabled';

class HapticEngine {
  private switchLabel: HTMLLabelElement | null = null;
  private isEnabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(HAPTICS_STORAGE_KEY);
        this.isEnabled = stored !== null ? stored === 'true' : true;
      } catch {
        this.isEnabled = true;
      }

      // Pre-warm the iOS switch DOM on the very first touch gesture
      if (typeof document !== 'undefined') {
        const initDOM = () => {
          this.ensureDOM();
          window.removeEventListener('touchstart', initDOM);
          window.removeEventListener('pointerdown', initDOM);
        };
        window.addEventListener('touchstart', initDOM, { passive: true });
        window.addEventListener('pointerdown', initDOM, { passive: true });
      }
    }
  }

  /**
   * Injects an invisible switch checkbox and label required for iOS Safari Taptic feedback.
   * Uses opacity: 0.001 and clip to avoid display:none which would cancel WebKit haptics.
   */
  private ensureDOM() {
    if (this.switchLabel || typeof document === 'undefined') return;

    try {
      const id = 'schedy-haptic-switch-trigger';
      let existing = document.getElementById(id) as HTMLLabelElement | null;
      if (existing) {
        this.switchLabel = existing;
        return;
      }

      const label = document.createElement('label');
      label.id = id;
      label.setAttribute('for', `${id}-input`);
      label.setAttribute('aria-hidden', 'true');
      label.style.cssText =
        'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0.001;pointer-events:none;z-index:-99999;overflow:hidden;';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = `${id}-input`;
      input.setAttribute('switch', '');
      input.setAttribute('aria-hidden', 'true');
      input.tabIndex = -1;
      input.style.cssText = 'position:absolute;opacity:0.001;pointer-events:none;width:1px;height:1px;';

      label.appendChild(input);
      document.body.appendChild(label);

      this.switchLabel = label;
    } catch {
      // In case DOM insertion is restricted
    }
  }

  private triggerIosTap() {
    this.ensureDOM();
    if (this.switchLabel) {
      try {
        this.switchLabel.click();
      } catch {
        // Fail silently
      }
    }
  }

  /**
   * Main haptic trigger method
   */
  public trigger(type: 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error' = 'medium') {
    if (!this.isEnabled || typeof window === 'undefined') return;

    // 1. Android / Web Vibration API
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        switch (type) {
          case 'selection':
            navigator.vibrate(8);
            break;
          case 'light':
            navigator.vibrate(15);
            break;
          case 'medium':
            navigator.vibrate(25);
            break;
          case 'heavy':
            navigator.vibrate(40);
            break;
          case 'success':
            navigator.vibrate([15, 60, 25]);
            break;
          case 'warning':
            navigator.vibrate([30, 80, 30]);
            break;
          case 'error':
            navigator.vibrate([35, 50, 35, 50, 35]);
            break;
        }
      } catch {
        // Vibration might be blocked by user agent
      }
    }

    // 2. iOS Taptic Engine Trigger
    // On iOS Safari, navigator.vibrate is either undefined or a silent no-op.
    // The switch-label click triggers the native Apple Taptic Engine feedback.
    switch (type) {
      case 'selection':
      case 'light':
      case 'medium':
      case 'heavy':
        this.triggerIosTap();
        break;
      case 'success':
        this.triggerIosTap();
        setTimeout(() => this.triggerIosTap(), 70);
        break;
      case 'warning':
        this.triggerIosTap();
        setTimeout(() => this.triggerIosTap(), 100);
        break;
      case 'error':
        this.triggerIosTap();
        setTimeout(() => this.triggerIosTap(), 70);
        setTimeout(() => this.triggerIosTap(), 140);
        break;
    }
  }

  /** Light tactile tap (tab switches, chip selection) */
  public light() {
    this.trigger('light');
  }

  /** Medium tactile tap (card pickup, button click) */
  public medium() {
    this.trigger('medium');
  }

  /** Strong tactile tap (primary action, modal confirm) */
  public heavy() {
    this.trigger('heavy');
  }

  /** Subtle tick (hovering drop targets, scrubber tick) */
  public selection() {
    this.trigger('selection');
  }

  /** Satisfying double-pulse confirmation (task completed, dropped into column) */
  public success() {
    this.trigger('success');
  }

  /** Double pulse warning */
  public warning() {
    this.trigger('warning');
  }

  /** Triple pulse error */
  public error() {
    this.trigger('error');
  }

  /** Set haptics preference */
  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    try {
      localStorage.setItem(HAPTICS_STORAGE_KEY, String(enabled));
    } catch {
      // Ignore
    }
  }

  /** Get haptics preference */
  public getEnabled(): boolean {
    return this.isEnabled;
  }

  /** Toggle haptics preference */
  public toggle(): boolean {
    const next = !this.isEnabled;
    this.setEnabled(next);
    if (next) {
      this.medium();
    }
    return next;
  }
}

export const haptics = new HapticEngine();
export default haptics;
