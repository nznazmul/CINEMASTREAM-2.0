// Android TV & Leanback D-Pad Navigation Engine

export class TVNavigation {
  static isTVMode = false;
  static focusableSelector = 'button, a, input, select, .media-card, .livetv-card, .tab-chip, .episode-item';
  static currentFocused = null;

  static init() {
    // Auto-detect Android TV user agent or Leanback intent
    const isTV = /Android.*TV|SmartTV|BRAVIA|NetCast|Tizen|Web0S|GoogleTV/i.test(navigator.userAgent);
    if (isTV) {
      this.enableTVMode();
    }

    window.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  static enableTVMode() {
    this.isTVMode = true;
    document.body.classList.add('tv-mode');
    
    // Add visual indicator
    let badge = document.getElementById('tv-mode-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'tv-mode-badge';
      badge.className = 'tv-mode-badge';
      badge.innerHTML = '📺 Android TV Mode Active';
      document.body.appendChild(badge);
    }

    this.focusFirstAvailable();
  }

  static toggleTVMode() {
    if (this.isTVMode) {
      this.isTVMode = false;
      document.body.classList.remove('tv-mode');
      const badge = document.getElementById('tv-mode-badge');
      if (badge) badge.remove();
    } else {
      this.enableTVMode();
    }
  }

  static getFocusableElements() {
    const visibleElements = Array.from(document.querySelectorAll(this.focusableSelector))
      .filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none';
      });
    return visibleElements;
  }

  static focusFirstAvailable() {
    const focusables = this.getFocusableElements();
    if (focusables.length > 0) {
      this.setFocus(focusables[0]);
    }
  }

  static setFocus(el) {
    if (this.currentFocused) {
      this.currentFocused.classList.remove('tv-focused');
    }
    this.currentFocused = el;
    if (el) {
      el.classList.add('tv-focused');
      el.focus();
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  static handleKeyDown(e) {
    const key = e.key;

    // Handle TV Navigation Keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape', 'Backspace'].includes(key)) {
      if (!this.isTVMode) {
        this.enableTVMode();
      }
    }

    if (!this.isTVMode) return;

    const focusables = this.getFocusableElements();
    if (!focusables.length) return;

    if (!this.currentFocused || !document.contains(this.currentFocused)) {
      this.setFocus(focusables[0]);
      return;
    }

    const currentIndex = focusables.indexOf(this.currentFocused);

    switch (key) {
      case 'ArrowRight':
        e.preventDefault();
        this.setFocus(focusables[(currentIndex + 1) % focusables.length]);
        break;

      case 'ArrowLeft':
        e.preventDefault();
        this.setFocus(focusables[(currentIndex - 1 + focusables.length) % focusables.length]);
        break;

      case 'ArrowDown':
        e.preventDefault();
        this.navigateSpatial(1);
        break;

      case 'ArrowUp':
        e.preventDefault();
        this.navigateSpatial(-1);
        break;

      case 'Enter':
        e.preventDefault();
        if (this.currentFocused) {
          this.currentFocused.click();
        }
        break;

      case 'Escape':
      case 'Backspace':
        // Close modal if open
        const closeBtn = document.querySelector('.btn-close-player, .btn-close-modal');
        if (closeBtn) {
          e.preventDefault();
          closeBtn.click();
        }
        break;
    }
  }

  static navigateSpatial(direction) {
    const focusables = this.getFocusableElements();
    const currentRect = this.currentFocused.getBoundingClientRect();
    
    // Find closest element above or below
    let closest = null;
    let minDistance = Infinity;

    focusables.forEach(el => {
      if (el === this.currentFocused) return;
      const rect = el.getBoundingClientRect();
      
      const isCorrectDirection = direction > 0 ? (rect.top >= currentRect.bottom - 10) : (rect.bottom <= currentRect.top + 10);
      
      if (isCorrectDirection) {
        const dx = rect.left - currentRect.left;
        const dy = rect.top - currentRect.top;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < minDistance) {
          minDistance = dist;
          closest = el;
        }
      }
    });

    if (closest) {
      this.setFocus(closest);
    }
  }
}
