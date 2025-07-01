/**
 * Portfolio Cards - Advanced JavaScript Module
 * 
 * Modern, performant and accessible portfolio application
 * Built with clean code principles and modular architecture
 */

// =================== IMPORTS ===================
import { cardsData } from "./cardsData.js";

// =================== CONFIGURATION ===================
const CONFIG = Object.freeze({
  // Pagination settings
  cardsPerPage: 6,
  maxPaginationPages: 3,

  // Media settings
  fallbackImage: "./assets/images/default.png",

  // Slideshow settings
  autoSlideInterval: 3000,
  resumeSlideTimeout: 2000,

  // Animation settings
  typewriter: {
    speed: 100,
    deleteSpeed: 50,
    pauseDuration: 1500,
    initialDelay: 300
  },

  // Performance settings
  debounceDelay: 150,
  scrollOffset: 80,

  // Scroll animation settings
  scrollAnimation: {
    duration: window.matchMedia('(max-width: 768px)').matches ? 1500 : 1200,
    easing: 'easeInOutCubic'
  }
});

// =================== STATE MANAGEMENT ===================
class AppState {
  constructor() {
    this.reset();
  }

  reset() {
    this.cards = [];
    this.filteredCards = [];
    this.currentPage = 1;
    this.activeFilter = 'all';

    this.modal = {
      imageList: [],
      currentIndex: 0,
      isSlideActive: false,
      savedScrollPosition: 0
    };

    this.timers = new Map();
    this.ui = {
      isMobileMenuOpen: false,
      isScrolling: false
    };

    this.clearAllTimers();
  }

  // Timer management methods
  setTimer(name, callback, delay) {
    this.clearTimer(name);
    this.timers.set(name, setTimeout(callback, delay));
  }

  setInterval(name, callback, interval) {
    this.clearTimer(name);
    this.timers.set(name, setInterval(callback, interval));
  }

  clearTimer(name) {
    const timer = this.timers.get(name);
    if (timer) {
      clearTimeout(timer);
      clearInterval(timer);
      this.timers.delete(name);
    }
  }

  clearAllTimers() {
    this.timers.forEach((timer) => {
      clearTimeout(timer);
      clearInterval(timer);
    });
    this.timers.clear();
  }
}

const state = new AppState();

// =================== DOM UTILITIES ===================
class DOMUtils {
  static cache = new Map();
  static cacheEnabled = true;

  // Element selector with caching
  static $(selector, context = document, useCache = true) {
    if (!this.cacheEnabled || !useCache) {
      return context.querySelector(selector);
    }

    const key = `${selector}-${context === document ? 'doc' : context.id || 'ctx'}`;
    if (!this.cache.has(key)) {
      const element = context.querySelector(selector);
      if (element) {
        this.cache.set(key, element);
      }
      return element;
    }

    const cached = this.cache.get(key);
    if (cached && !document.contains(cached)) {
      this.cache.delete(key);
      return context.querySelector(selector);
    }

    return cached;
  }

  // Multiple elements selector with caching
  static $$(selector, context = document) {
    const key = `${selector}-all-${context === document ? 'doc' : 'ctx'}`;
    if (!this.cache.has(key)) {
      this.cache.set(key, context.querySelectorAll(selector));
    }
    return this.cache.get(key);
  }

  // Element creation helper
  static createElement(tag, className, content) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content) element.innerHTML = content;
    return element;
  }

  // Attribute setting helper
  static setAttributes(element, attributes) {
    if (!element || !attributes) return element;

    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'disabled') {
        element.disabled = Boolean(value);
        if (value) element.setAttribute('disabled', '');
        else element.removeAttribute('disabled');
      } else if (value !== null && value !== undefined) {
        element.setAttribute(key, value);
      }
    });

    return element;
  }

  // CSS animation helper
  static animateCSS(element, animationName, callback) {
    element.classList.add('animate__animated', `animate__${animationName}`);

    const handleAnimationEnd = () => {
      element.classList.remove('animate__animated', `animate__${animationName}`);
      element.removeEventListener('animationend', handleAnimationEnd);
      if (callback) callback();
    };

    element.addEventListener('animationend', handleAnimationEnd);
  }

  // Cache management
  static clearCache() {
    this.cache.clear();
  }

  static disableCache() {
    this.cacheEnabled = false;
    this.clearCache();
  }
}

// =================== UTILITY FUNCTIONS ===================
const Utils = {
  // Performance utilities
  debounce(func, delay = CONFIG.debounceDelay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => func.apply(this, args), delay);
    };
  },

  throttle(func, delay) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, delay);
      }
    };
  },

  // Math utilities
  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  },

  // Scroll and navigation utilities
  getVisibleSections() {
    const sections = DOMUtils.$$('section[id]');
    const viewportHeight = window.innerHeight;
    const visibleSections = [];

    sections.forEach(section => {
      const rect = section.getBoundingClientRect();

      if (rect.top < viewportHeight && rect.bottom > 0) {
        const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
        const visiblePercent = (visibleHeight / viewportHeight) * 100;

        if (visiblePercent > 5) {
          visibleSections.push({
            id: section.id,
            visiblePercent,
            distanceFromTop: Math.abs(rect.top)
          });
        }
      }
    });

    return visibleSections.sort((a, b) => {
      const percentDifference = Math.abs(a.visiblePercent - b.visiblePercent);
      return percentDifference < 15 ?
        a.distanceFromTop - b.distanceFromTop :
        b.visiblePercent - a.visiblePercent;
    });
  },

  // Easing functions for smooth animations
  easing: {
    easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    easeOutQuart: (t) => 1 - Math.pow(1 - t, 4),
    easeInOutQuart: (t) => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2
  },

  // Smooth scroll implementation
  smoothScrollTo(target, callback) {
    const element = typeof target === 'string' ? DOMUtils.$(target) : target;
    if (!element) return;

    const startPosition = window.pageYOffset;
    const targetPosition = element.offsetTop - CONFIG.scrollOffset;
    const distance = targetPosition - startPosition;
    const duration = CONFIG.scrollAnimation.duration;
    const easingFunction = this.easing[CONFIG.scrollAnimation.easing];

    let startTime = null;

    const animateScroll = (currentTime) => {
      if (!startTime) startTime = currentTime;

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = easingFunction(progress);

      const currentPosition = startPosition + (distance * ease);
      window.scrollTo(0, currentPosition);

      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      } else if (callback) {
        callback();
      }
    };

    requestAnimationFrame(animateScroll);
  },

  // String utilities
  formatProjectSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
};

// =================== ACCESSIBILITY MANAGER ===================
class AccessibilityManager {
  // Focus trap for modal dialogs
  static trapFocus(element) {
    if (!element) return;

    const focusableElements = element.querySelectorAll(
      'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    element.addEventListener('keydown', handleKeyDown);
    element._focusTrapHandler = handleKeyDown;

    return () => {
      element.removeEventListener('keydown', handleKeyDown);
      element._focusTrapHandler = null;
    };
  }

  // Remove focus trap
  static removeFocusTrap(element) {
    if (element?._focusTrapHandler) {
      element.removeEventListener('keydown', element._focusTrapHandler);
      element._focusTrapHandler = null;
    }
  }

  // Screen reader announcements
  static announceToScreenReader(message, priority = 'polite') {
    const announcement = DOMUtils.createElement('div', 'sr-only');
    announcement.setAttribute('aria-live', priority);
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }
}

// =================== CARD MANAGEMENT MODULE ===================
class CardManager {
  constructor() {
    this.modalManager = null;
    this.initializeElements();
    this.bindEvents();
  }

  // Initialize DOM elements
  initializeElements() {
    this.elements = {
      grid: DOMUtils.$('.cards-grid'),
      filters: DOMUtils.$$('.filter-btn'),
      pagination: DOMUtils.$('.pagination'),
      emptyMessage: DOMUtils.$('.empty-category')
    };
  }

  // Bind event listeners
  bindEvents() {
    // Card detail buttons event delegation
    this.elements.grid?.addEventListener('click', (e) => {
      const detailsBtn = e.target.closest('.view-details-btn');
      if (detailsBtn) {
        const card = detailsBtn.closest('.card-item');
        if (this.modalManager || window.modalManager) {
          (this.modalManager || window.modalManager).openFromCard(card);
        } else {
          console.warn('Modal manager not ready yet.');
        }
      }
    });

    // Filter buttons
    this.elements.filters.forEach(button => {
      button.addEventListener('click', () => this.handleFilterChange(button));
    });
  }

  // Card creation and rendering
  createCards() {
    if (!this.elements.grid || !cardsData.length) return;

    const fragment = document.createDocumentFragment();

    cardsData.forEach(item => {
      const card = this.createCardElement(item);
      fragment.appendChild(card);
    });

    this.elements.grid.innerHTML = '';
    this.elements.grid.appendChild(fragment);

    state.cards = Array.from(this.elements.grid.children);
    state.filteredCards = [...state.cards];

    this.showPage(1);
    this.renderPagination();
  }

  // Create individual card element
  createCardElement(item) {
    const card = DOMUtils.createElement('div', 'card-item');

    DOMUtils.setAttributes(card, {
      'data-category': item.category,
      'data-images': (item.images.length > 0 ? item.images : [CONFIG.fallbackImage]).join(','),
      'data-project-slug': Utils.formatProjectSlug(item.title)
    });

    const linkElements = item.links.map(link => {
      const iconClass = this.getLinkIconClass(link.icon);
      return `
        <a href="${link.url}" target="_blank" rel="noopener noreferrer" 
           class="card-link-item ${iconClass}"
           aria-label="${this.getLinkAriaLabel(link.icon, item.title)}">
          <i class="${link.icon}" aria-hidden="true"></i>
        </a>
      `;
    }).join('');

    card.innerHTML = `
      <div class="card-image">
        <img src="${item.images[0] || CONFIG.fallbackImage}" 
             alt="${item.title}" 
             loading="lazy" />
        <div class="card-overlay">
          <div class="card-links">${linkElements}</div>
        </div>
      </div>
      <div class="card-info">
        <h3 class="card-title">${item.title}</h3>
        <p class="card-tags">${item.tags}</p>
        <p class="card-description">${item.description}</p>
        <button class="view-details-btn" aria-label="View details for ${item.title}">
          View Details
        </button>
      </div>
    `;

    return card;
  }

  // Helper methods for card links
  getLinkIconClass(icon) {
    if (icon.includes('github')) return 'github-icon';
    if (icon.includes('play')) return 'play-icon';
    return '';
  }

  getLinkAriaLabel(icon, title) {
    if (icon.includes('github')) return `View source code for ${title}`;
    if (icon.includes('play')) return `View live demo for ${title}`;
    return `External link for ${title}`;
  }

  // Filter handling
  handleFilterChange(button) {
    // Update UI
    this.elements.filters.forEach(btn => {
      btn.classList.remove('active');
      btn.setAttribute('aria-pressed', 'false');
    });

    button.classList.add('active');
    button.setAttribute('aria-pressed', 'true');

    // Apply filter
    const filter = button.dataset.filter;
    state.activeFilter = filter;
    this.filterCards(filter);

    AccessibilityManager.announceToScreenReader(
      `Showing ${state.filteredCards.length} projects in ${filter === 'all' ? 'all categories' : filter + ' category'}`
    );
  }

  filterCards(filter) {
    this.hideEmptyMessage();

    state.filteredCards = filter === 'all'
      ? [...state.cards]
      : state.cards.filter(card => card.dataset.category.includes(filter));

    state.currentPage = 1;
    this.showPage(1);
    this.renderPagination();

    if (state.filteredCards.length === 0) {
      this.showEmptyMessage(filter);
    }
  }

  // Pagination methods
  showPage(page) {
    // Hide all cards
    state.cards.forEach(card => {
      card.style.display = 'none';
      card.classList.add('hide');
    });

    // Show page cards
    const start = (page - 1) * CONFIG.cardsPerPage;
    const pageCards = state.filteredCards.slice(start, start + CONFIG.cardsPerPage);

    pageCards.forEach((card) => {
      card.style.display = 'flex';
      card.classList.remove('hide');
    });

    // Always show pagination if there are any cards
    if (this.elements.pagination) {
      this.elements.pagination.style.display =
        state.filteredCards.length > 0 ? 'flex' : 'none';
    }
  }

  renderPagination() {
    if (!this.elements.pagination) return;

    const totalPages = Math.ceil(state.filteredCards.length / CONFIG.cardsPerPage);
    this.elements.pagination.innerHTML = '';

    // Show pagination even for single page (if there are cards)
    if (totalPages < 1) return;

    // Previous page button
    this.addNavigationButton('prev', state.currentPage === 1);

    // Page numbers
    this.addPageNumbers(totalPages);

    // Next page button
    this.addNavigationButton('next', state.currentPage === totalPages);
  }

  addNavigationButton(type, disabled) {
    const button = DOMUtils.createElement('button', 'page-btn');
    button.innerHTML = type === 'prev'
      ? '<i class="fas fa-chevron-left"></i>'
      : '<i class="fas fa-chevron-right"></i>';

    DOMUtils.setAttributes(button, {
      disabled,
      'aria-label': type === 'prev' ? 'Previous page' : 'Next page'
    });

    button.addEventListener('click', () => {
      if (!disabled) {
        state.currentPage += type === 'prev' ? -1 : 1;
        this.showPage(state.currentPage);
        this.renderPagination();
        Utils.smoothScrollTo('#projects');
      }
    });

    this.elements.pagination.appendChild(button);
  }

  addPageNumbers(totalPages) {
    const maxPages = CONFIG.maxPaginationPages;
    let start = Math.max(1, state.currentPage - Math.floor(maxPages / 2));
    let end = Math.min(totalPages, start + maxPages - 1);

    if (end - start + 1 < maxPages) {
      start = Math.max(1, end - maxPages + 1);
    }

    // First page + dots
    if (start > 1) {
      this.addPageButton(1);
      if (start > 2) {
        this.elements.pagination.appendChild(this.createDots());
      }
    }

    // Middle pages
    for (let i = start; i <= end; i++) {
      this.addPageButton(i);
    }

    // Dots + last page
    if (end < totalPages) {
      if (end < totalPages - 1) {
        this.elements.pagination.appendChild(this.createDots());
      }
      this.addPageButton(totalPages);
    }
  }

  addPageButton(pageNumber) {
    const isActive = pageNumber === state.currentPage;
    const button = DOMUtils.createElement('button', `page-btn${isActive ? ' active' : ''}`, pageNumber);

    DOMUtils.setAttributes(button, {
      'aria-label': `Page ${pageNumber}`,
      'aria-current': isActive ? 'page' : null
    });

    button.addEventListener('click', () => {
      state.currentPage = pageNumber;
      this.showPage(pageNumber);
      this.renderPagination();
      Utils.smoothScrollTo('#projects');
    });

    this.elements.pagination.appendChild(button);
  }

  createDots() {
    return DOMUtils.createElement('span', 'pagination-dots', '…');
  }

  // Empty state handling
  showEmptyMessage(filter) {
    if (!this.elements.emptyMessage) return;

    this.elements.grid.style.display = 'none';
    this.elements.pagination.style.display = 'none';

    const categoryName = filter === 'all' ? 'Projects' : filter.charAt(0).toUpperCase() + filter.slice(1);

    this.elements.emptyMessage.innerHTML = `
      <i class="fas fa-folder-open" aria-hidden="true"></i>
      <h3>No ${categoryName} Found</h3>
      <p>There are currently no projects in the ${filter === 'all' ? 'portfolio' : categoryName + ' category'}. Check back later!</p>
    `;

    this.elements.emptyMessage.style.display = 'block';
  }

  hideEmptyMessage() {
    if (this.elements.emptyMessage) {
      this.elements.emptyMessage.style.display = 'none';
      this.elements.grid.style.display = 'grid';
    }
  }

  // Set modal manager reference
  setModalManager(modalManager) {
    this.modalManager = modalManager;
  }
}

// =================== MODAL MANAGEMENT MODULE ===================
class ModalManager {
  constructor() {
    this.cleanupHandlers = [];
    this.boundHandlers = this.createBoundHandlers();
    this.currentCard = null;
    this.initializeElements();
    this.bindEvents();
  }

  // Initialize DOM elements
  initializeElements() {
    this.elements = {
      overlay: DOMUtils.$('.modal-overlay'),
      title: DOMUtils.$('.modal-title'),
      tags: DOMUtils.$('.modal-tags'),
      description: DOMUtils.$('.modal-description'),
      closeBtn: DOMUtils.$('.modal-close'),
      prevBtn: DOMUtils.$('.gallery-nav.prev'),
      nextBtn: DOMUtils.$('.gallery-nav.next'),
      thumbsContainer: DOMUtils.$('.modal-thumbs'),
      buttons: DOMUtils.$$('.modal-buttons a')
    };
  }

  // Create bound event handlers
  createBoundHandlers() {
    return {
      pauseSlide: () => this.pauseSlideshow(),
      handleMouseUp: () => this.handleMouseUp(),
      keydownHandler: (e) => this.handleKeydown(e),
      preventImageDrag: (e) => {
        e.preventDefault();
        return false;
      },
      handleThumbnailScroll: (e) => this.handleThumbnailScroll(e)
    };
  }

  // Bind basic event listeners
  bindEvents() {
    this.elements.closeBtn?.addEventListener('click', () => this.close());
    this.elements.prevBtn?.addEventListener('click', () => this.navigateImage(-1));
    this.elements.nextBtn?.addEventListener('click', () => this.navigateImage(1));

    this.keydownHandler = this.boundHandlers.keydownHandler;

    this.elements.overlay?.addEventListener('click', (e) => {
      if (e.target === this.elements.overlay) this.close();
    });
  }

  // Modal opening and content management
  openFromCard(card) {
    if (!card || !this.elements.overlay) return;

    try {
      this.currentCard = card;

      state.modal.imageList = card.dataset.images.split(',');
      state.modal.currentIndex = 0;
      state.modal.savedScrollPosition = window.scrollY;

      this.updateModalStaticContent();
      this.updateModalImageAndEvents();
      this.buildThumbnails();

      this.show();
      this.startSlideshow();

      // Update URL
      const slug = card.dataset.projectSlug;
      history.replaceState(
        { slug, scrollY: state.modal.savedScrollPosition },
        '',
        `#projects/${slug}`
      );
    } catch (error) {
      console.error('Error opening modal:', error);
      this.close();
    }
  }

  updateModalStaticContent() {
    if (!this.currentCard) return;

    const title = this.currentCard.querySelector('.card-title')?.textContent || '';
    const tags = this.currentCard.querySelector('.card-tags')?.textContent || '';
    const description = this.currentCard.querySelector('.card-description')?.textContent || '';

    if (this.elements.title) this.elements.title.textContent = title;
    if (this.elements.tags) this.elements.tags.textContent = tags;
    if (this.elements.description) this.elements.description.textContent = description;

    this.updateActionButtons();
  }

  updateModalImageAndEvents() {
    const imageElement = DOMUtils.$('.modal-img');

    if (imageElement) {
      imageElement.src = state.modal.imageList[state.modal.currentIndex];
      imageElement.alt = this.currentCard?.querySelector('.card-title')?.textContent || 'Project image';

      imageElement.draggable = false;
      imageElement.setAttribute('draggable', 'false');

      this.setupImagePauseEvents(imageElement);
    } else {
      console.warn('Modal image element not found');
    }
  }

  updateActionButtons() {
    if (!this.currentCard) return;

    const links = this.currentCard.querySelectorAll('.card-link-item');

    this.elements.buttons.forEach((button, index) => {
      if (links[index]) {
        button.href = links[index].href;
        const linkText = index === 0 ? 'Live Demo' : 'Source Code';
        button.setAttribute('aria-label', `${linkText} for ${this.elements.title?.textContent || 'project'}`);
      }
    });
  }

  // Image navigation and slideshow
  switchToImage(index) {
    this.pauseSlideshow();
    state.modal.currentIndex = index;

    this.updateModalImageAndEvents();
    this.highlightThumbnail(index);

    state.setTimer('resumeSlideshow', () => this.resumeSlideshow(), CONFIG.resumeSlideTimeout);
  }

  navigateImage(direction) {
    this.pauseSlideshow();

    const newIndex = (state.modal.currentIndex + direction + state.modal.imageList.length) % state.modal.imageList.length;
    this.switchToImage(newIndex);
  }

  // Slideshow control methods
  startSlideshow() {
    if (state.modal.imageList.length <= 1) return;

    state.modal.isSlideActive = true;
    state.setInterval('slideshow', () => {
      if (state.modal.isSlideActive) {
        this.navigateImage(1);
      }
    }, CONFIG.autoSlideInterval);
  }

  pauseSlideshow() {
    state.modal.isSlideActive = false;
    state.clearTimer('slideshow');
    state.clearTimer('resumeSlideshow');
  }

  resumeSlideshow() {
    if (this.elements.overlay.style.display === 'flex') {
      this.startSlideshow();
    }
  }

  // Thumbnail management
  buildThumbnails() {
    if (!this.elements.thumbsContainer) return;

    this.cleanupThumbnails();
    this.elements.thumbsContainer.innerHTML = '';

    const fragment = document.createDocumentFragment();

    state.modal.imageList.forEach((src, index) => {
      const thumb = DOMUtils.createElement('img', 'modal-thumb');
      thumb.src = src;
      thumb.loading = 'lazy';
      thumb.dataset.index = index;

      thumb.draggable = false;
      thumb.setAttribute('draggable', 'false');

      DOMUtils.setAttributes(thumb, {
        'aria-label': `Image ${index + 1} of ${state.modal.imageList.length}`,
        'role': 'tab',
        'tabindex': '0',
        'aria-selected': index === state.modal.currentIndex ? 'true' : 'false'
      });

      const clickHandler = () => this.switchToImage(index);
      const keyHandler = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.switchToImage(index);
        }
      };

      const preventDragHandler = (e) => {
        e.preventDefault();
        return false;
      };

      thumb.addEventListener('click', clickHandler);
      thumb.addEventListener('keydown', keyHandler);
      thumb.addEventListener('dragstart', preventDragHandler);
      thumb.addEventListener('selectstart', preventDragHandler);

      thumb._clickHandler = clickHandler;
      thumb._keyHandler = keyHandler;
      thumb._preventDragHandler = preventDragHandler;

      fragment.appendChild(thumb);
    });

    this.elements.thumbsContainer.appendChild(fragment);
    this.setupThumbnailScrolling();

    requestAnimationFrame(() => {
      this.highlightThumbnail(state.modal.currentIndex);
    });
  }

  highlightThumbnail(index) {
    if (!this.elements.thumbsContainer) return;

    const thumbs = this.elements.thumbsContainer.querySelectorAll('.modal-thumb');
    thumbs.forEach(thumb => {
      const isActive = Number(thumb.dataset.index) === index;
      thumb.classList.toggle('active', isActive);
      thumb.setAttribute('aria-selected', isActive ? 'true' : 'false');

      if (isActive) {
        thumb.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    });
  }

  // Event handling methods
  setupImagePauseEvents(imageElement = null) {
    const element = imageElement || DOMUtils.$('.modal-img');

    if (!element) {
      console.warn('Modal image element not found (setupImagePauseEvents)');
      return;
    }

    this.cleanupImagePauseEvents(element);

    element.addEventListener("mousedown", this.boundHandlers.pauseSlide);
    element.addEventListener("mouseup", this.boundHandlers.handleMouseUp);
    element.addEventListener("mouseleave", this.boundHandlers.handleMouseUp);
    element.addEventListener("touchstart", this.boundHandlers.pauseSlide, { passive: true });
    element.addEventListener("touchend", this.boundHandlers.handleMouseUp);
    element.addEventListener("touchcancel", this.boundHandlers.handleMouseUp);

    if (this.boundHandlers.preventImageDrag) {
      element.addEventListener('dragstart', this.boundHandlers.preventImageDrag);
      element.addEventListener('selectstart', this.boundHandlers.preventImageDrag);
    }

    this.elements.image = element;
  }

  setupThumbnailScrolling() {
    if (this.elements.thumbsContainer) {
      this.elements.thumbsContainer.removeEventListener('wheel', this.boundHandlers.handleThumbnailScroll);
      this.elements.thumbsContainer.addEventListener('wheel', this.boundHandlers.handleThumbnailScroll, { passive: false });
    }
  }

  handleKeydown(e) {
    if (e.key === 'Escape') {
      this.close();
    } else if (e.key === 'ArrowLeft') {
      this.navigateImage(-1);
    } else if (e.key === 'ArrowRight') {
      this.navigateImage(1);
    }
  }

  handleMouseUp() {
    state.clearTimer('resumeSlideshow');
    state.setTimer('resumeSlideshow', () => {
      if (this.elements.overlay?.style.display === 'flex' && state.modal.isSlideActive === false) {
        this.resumeSlideshow();
      }
    }, 1000);
  }

  handleThumbnailScroll(e) {
    if (this.elements.thumbsContainer) {
      if (e.deltaY !== 0) {
        e.preventDefault();
        this.elements.thumbsContainer.scrollLeft += e.deltaY;
      }
    }
  }

  // Modal display methods
  show() {
    this.elements.overlay.style.display = 'flex';

    if (window.portfolioApp?.managers?.navigation) {
      window.portfolioApp.managers.navigation.setModalState(true);
    }

    document.body.style.cssText = `
      overflow: hidden;
      position: fixed;
      top: -${state.modal.savedScrollPosition}px;
      width: 100%;
    `;

    const removeFocusTrap = AccessibilityManager.trapFocus(this.elements.overlay);
    this.cleanupHandlers.push(removeFocusTrap);

    window.addEventListener('keydown', this.keydownHandler);

    state.setTimer('focusCloseBtn', () => {
      this.elements.closeBtn?.focus();
    }, 100);
  }

  close() {
    this.cleanupThumbnails();
    this.cleanupImagePauseEvents();

    this.elements.overlay.style.display = 'none';

    if (window.portfolioApp?.managers?.navigation) {
      window.portfolioApp.managers.navigation.setModalState(false);
    }

    this.pauseSlideshow();

    window.removeEventListener('keydown', this.keydownHandler);

    if (this.elements.thumbsContainer) {
      this.elements.thumbsContainer.removeEventListener('wheel', this.boundHandlers.handleThumbnailScroll);
    }

    this.cleanupHandlers.forEach(cleanup => cleanup?.());
    this.cleanupHandlers = [];

    document.body.style.cssText = '';
    window.scrollTo({
      top: state.modal.savedScrollPosition,
      behavior: 'instant'
    });

    const hash = window.location.hash;
    if (hash.startsWith('#projects/')) {
      history.replaceState({}, '', '#projects');
    }

    this.elements.image = null;
    this.currentCard = null;
  }

  // Cleanup methods
  cleanupImagePauseEvents(imageElement = null) {
    const element = imageElement || this.elements.image;

    if (element) {
      const { pauseSlide, handleMouseUp, preventImageDrag } = this.boundHandlers;

      element.removeEventListener("mousedown", pauseSlide);
      element.removeEventListener("mouseup", handleMouseUp);
      element.removeEventListener("mouseleave", handleMouseUp);
      element.removeEventListener("touchstart", pauseSlide);
      element.removeEventListener("touchend", handleMouseUp);
      element.removeEventListener("touchcancel", handleMouseUp);

      if (preventImageDrag) {
        element.removeEventListener('dragstart', preventImageDrag);
        element.removeEventListener('selectstart', preventImageDrag);
      }
    }
  }

  cleanupThumbnails() {
    if (!this.elements.thumbsContainer) return;

    const thumbs = this.elements.thumbsContainer.querySelectorAll('.modal-thumb');
    thumbs.forEach(thumb => {
      if (thumb._clickHandler) {
        thumb.removeEventListener('click', thumb._clickHandler);
        delete thumb._clickHandler;
      }
      if (thumb._keyHandler) {
        thumb.removeEventListener('keydown', thumb._keyHandler);
        delete thumb._keyHandler;
      }
      if (thumb._preventDragHandler) {
        thumb.removeEventListener('dragstart', thumb._preventDragHandler);
        thumb.removeEventListener('selectstart', thumb._preventDragHandler);
        delete thumb._preventDragHandler;
      }
    });
  }
}

// =================== NAVIGATION MODULE ===================
class NavigationManager {
  constructor() {
    this.scrollHandlers = new Set();
    this.isNavigating = false;
    this.boundHandlers = new Map();
    this.isModalOpen = false;

    this.initializeElements();
    this.bindEvents();
    this.initScrollHeaderEffect();
  }

  // Initialize DOM elements
  initializeElements() {
    this.elements = {
      mobileToggle: DOMUtils.$('.mobile-menu-toggle'),
      navLinks: DOMUtils.$$('.nav-link'),
      internalLinks: DOMUtils.$$('a[href^="#"]'),
      scrollToTop: DOMUtils.$('.scroll-to-top'),
      header: DOMUtils.$('.site-header')
    };
  }

  // Bind navigation events
  bindEvents() {
    // Mobile menu toggle
    const mobileToggleHandler = () => this.toggleMobileMenu();
    this.boundHandlers.set('mobileToggle', mobileToggleHandler);
    this.elements.mobileToggle?.addEventListener('click', mobileToggleHandler);

    // Navigation links
    this.elements.navLinks.forEach(link => {
      const handler = () => this.closeMobileMenu();
      link.addEventListener('click', handler);
      this.boundHandlers.set(link, handler);
    });

    // Outside click handling
    const outsideClickHandler = (e) => this.handleOutsideClick(e);
    this.boundHandlers.set('outsideClick', outsideClickHandler);
    document.addEventListener('click', outsideClickHandler);

    this.initSmoothScrolling();
    this.initScrollHandling();
  }

  // Mobile menu methods
  toggleMobileMenu() {
    state.ui.isMobileMenuOpen = !state.ui.isMobileMenuOpen;
    document.body.classList.toggle('mobile-menu-open', state.ui.isMobileMenuOpen);

    if (this.elements.mobileToggle) {
      this.elements.mobileToggle.setAttribute('aria-expanded', state.ui.isMobileMenuOpen.toString());
    }
  }

  closeMobileMenu() {
    state.ui.isMobileMenuOpen = false;
    document.body.classList.remove('mobile-menu-open');

    if (this.elements.mobileToggle) {
      this.elements.mobileToggle.setAttribute('aria-expanded', 'false');
    }
  }

  handleOutsideClick(e) {
    if (state.ui.isMobileMenuOpen &&
      !e.target.closest('.nav-links') &&
      !e.target.closest('.mobile-menu-toggle')) {
      this.closeMobileMenu();
    }
  }

  // Active link management
  setActiveLink(activeLink) {
    this.elements.navLinks.forEach(link => link.classList.remove('active'));
    activeLink.classList.add('active');
  }

  // Smooth scrolling setup
  initSmoothScrolling() {
    this.elements.internalLinks.forEach(link => {
      if (link.closest('.modal-buttons')) return;

      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href');

        if (targetId && targetId !== '#') {
          this.isNavigating = true;

          Utils.smoothScrollTo(targetId, () => {
            history.pushState(null, null, targetId);

            setTimeout(() => {
              this.isNavigating = false;
            }, 100);
          });
        }
      });
    });

    // Scroll to top button
    this.elements.scrollToTop?.addEventListener('click', () => {
      this.isNavigating = true;

      const target = document.documentElement || document.body;

      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });

      setTimeout(() => {
        this.isNavigating = false;
      }, CONFIG.scrollAnimation.duration + 100);
    });
  }

  // Header scroll effect
  initScrollHeaderEffect() {
    let ticking = false;

    const updateHeader = () => {
      const scrollY = this.isModalOpen ?
        (state.modal?.savedScrollPosition || 0) :
        window.scrollY;

      if (scrollY > 1) {
        this.elements.header?.classList.add('scrolled');
      } else {
        this.elements.header?.classList.remove('scrolled');
      }

      ticking = false;
    };

    const onScroll = () => {
      if (this.isModalOpen) return;

      if (!ticking) {
        requestAnimationFrame(updateHeader);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    this.scrollHandlers.add(onScroll);

    updateHeader();
  }

  // Scroll-based updates
  initScrollHandling() {
    const scrollHandler = Utils.throttle(() => {
      if (this.isModalOpen) return;

      this.updateActiveNavOnScroll();
      this.updateScrollToTopVisibility();
    }, 100);

    window.addEventListener('scroll', scrollHandler, { passive: true });
    this.scrollHandlers.add(scrollHandler);
  }

  setModalState(isOpen) {
    this.isModalOpen = isOpen;

    if (isOpen) {
      const scrollY = state.modal?.savedScrollPosition || 0;
      if (scrollY > 1) {
        this.elements.header?.classList.add('scrolled');
      } else {
        this.elements.header?.classList.remove('scrolled');
      }
    }
  }

  updateActiveNavOnScroll() {
    const visibleSections = Utils.getVisibleSections();

    if (visibleSections.length > 0) {
      const mostVisible = '#' + visibleSections[0].id;
      const targetLink = DOMUtils.$(`.nav-link[href="${mostVisible}"]`);

      if (targetLink && !targetLink.classList.contains('active')) {
        this.setActiveLink(targetLink);
      }
    }
  }

  updateScrollToTopVisibility() {
    if (this.elements.scrollToTop) {
      const shouldShow = window.scrollY > 300;
      this.elements.scrollToTop.style.display = shouldShow ? 'flex' : 'none';
    }
  }

  setInitialActiveState() {
    const hash = window.location.hash.split('/')[0] || '#home';
    const activeLink = DOMUtils.$(`.nav-link[href="${hash}"]`);

    if (activeLink) {
      this.setActiveLink(activeLink);
    }
  }

  // Cleanup method
  destroy() {
    const mobileToggleHandler = this.boundHandlers.get('mobileToggle');
    if (mobileToggleHandler && this.elements.mobileToggle) {
      this.elements.mobileToggle.removeEventListener('click', mobileToggleHandler);
    }

    this.elements.navLinks.forEach(link => {
      const handler = this.boundHandlers.get(link);
      if (handler) {
        link.removeEventListener('click', handler);
      }
    });

    const outsideClickHandler = this.boundHandlers.get('outsideClick');
    if (outsideClickHandler) {
      document.removeEventListener('click', outsideClickHandler);
    }

    this.scrollHandlers.forEach(handler => {
      window.removeEventListener('scroll', handler);
    });
    this.scrollHandlers.clear();
    this.boundHandlers.clear();

    console.log('NavigationManager completely cleaned up');
  }
}

// =================== ANIMATION MODULE ===================
class AnimationManager {
  constructor() {
    this.initializeElements();
  }

  // Initialize DOM elements
  initializeElements() {
    this.elements = {
      professionText: DOMUtils.$('#profession-text'),
      yearSpan: DOMUtils.$('#current-year')
    };
  }

  // Typewriter animation
  initTypewriter() {
    if (!this.elements.professionText) return;

    const professions = [
      "Full Stack Developer",
      "AI-Powered App Creator",
      "Game Dev Enthusiast",
    ];

    let currentIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    const typeEffect = () => {
      const currentProfession = professions[currentIndex];

      if (isDeleting) {
        this.elements.professionText.textContent = currentProfession.substring(0, charIndex - 1);
        charIndex--;
      } else {
        this.elements.professionText.textContent = currentProfession.substring(0, charIndex + 1);
        charIndex++;
      }

      let speed = isDeleting ? CONFIG.typewriter.deleteSpeed : CONFIG.typewriter.speed;

      if (!isDeleting && charIndex === currentProfession.length) {
        isDeleting = true;
        speed = CONFIG.typewriter.pauseDuration;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        currentIndex = (currentIndex + 1) % professions.length;
        speed = CONFIG.typewriter.initialDelay;
      }

      state.setTimer('typewriter', typeEffect, speed);
    };

    state.setTimer('typewriterStart', typeEffect, 1000);
  }

  // Update copyright year
  updateCopyrightYear() {
    if (this.elements.yearSpan) {
      this.elements.yearSpan.textContent = new Date().getFullYear();
    }
  }

  // Scroll reveal animations
  initScrollRevealAnimations() {
    const sectionsToReveal = DOMUtils.$$('section#about, section#skills, section#projects, section#contact');
    if (!sectionsToReveal || sectionsToReveal.length === 0) {
      console.warn('No sections found for reveal animation.');
      return;
    }

    const sectionConfigs = {
      'about': { rootMargin: '0px 0px -15% 0px', threshold: 0.05 },
      'skills': { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
      'projects': { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
      'contact': { rootMargin: '0px 0px -15% 0px', threshold: 0.05 }
    };

    const revealCallback = (entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const section = entry.target;
          if (!section.classList.contains('is-visible')) {
            section.classList.add('reveal-transition');

            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                section.classList.add('is-visible');
              });
            });

            observer.unobserve(section);
          }
        }
      });
    };

    // Create observers for each section
    sectionsToReveal.forEach(section => {
      const sectionId = section.id;
      const config = sectionConfigs[sectionId] || { rootMargin: '0px 0px -15% 0px', threshold: 0.05 };

      const observer = new IntersectionObserver(revealCallback, {
        root: null,
        rootMargin: config.rootMargin,
        threshold: config.threshold
      });

      section.classList.add('reveal-section');
      observer.observe(section);
    });
  }
}

// =================== ROUTING MODULE ===================
class RouteManager {
  constructor() {
    this.bindEvents();
  }

  // Set modal manager reference
  setModalManager(modalManager) {
    this.modalManager = modalManager;
  }

  // Bind routing events
  bindEvents() {
    window.addEventListener('popstate', (e) => this.handlePopState(e));
    this.handleInitialRoute();
  }

  // Handle initial page load routing
  handleInitialRoute() {
    const hash = window.location.hash;

    if (hash.startsWith('#projects/')) {
      history.replaceState(null, null, window.location.pathname + window.location.search);

      const modalOverlay = DOMUtils.$('.modal-overlay');
      if (modalOverlay) {
        modalOverlay.style.display = 'none';
        document.body.style.cssText = '';
      }

      window.scrollTo(0, 0);
      return;
    }
  }

  // Handle browser back/forward navigation
  handlePopState(e) {
    const modal = this.modalManager || window.modalManager;

    if (e.state?.slug) {
      const { slug, scrollY = 0 } = e.state;
      state.modal.savedScrollPosition = scrollY;

      if (modal?.elements.overlay.style.display !== 'flex') {
        this.openProjectModal(slug, false);
      }
    } else if (modal?.elements.overlay.style.display === 'flex') {
      modal.close();
    }
  }

  // Open project modal by slug
  openProjectModal(slug, useDelay = true) {
    const card = state.cards.find(c => c.dataset.projectSlug === slug);
    const modal = this.modalManager || window.modalManager;

    if (card && modal) {
      const openModal = () => modal.openFromCard(card);

      if (useDelay) {
        state.setTimer('openModalDelay', openModal, 300);
      } else {
        openModal();
      }
    }
  }
}

// =================== APPLICATION CONTROLLER ===================
class PortfolioApp {
  constructor() {
    this.managers = {};
    this.isInitialized = false;
  }

  // Initialize application
  async init() {
    try {
      this.setupScrollRestoration();
      await this.initializeManagers();
      this.loadInitialData();
      this.setupGlobalEvents();

      this.isInitialized = true;
      console.log('Portfolio application started successfully');

    } catch (error) {
      console.error('Error starting application:', error);
      this.handleCriticalError(error);
    }
  }

  // Setup scroll restoration and hash cleanup
  setupScrollRestoration() {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    if (window.location.hash) {
      history.replaceState(null, null, window.location.pathname + window.location.search);
    }

    const modalOverlay = DOMUtils.$('.modal-overlay');
    if (modalOverlay && modalOverlay.style.display === 'flex') {
      modalOverlay.style.display = 'none';
      document.body.style.cssText = '';
    }

    window.scrollTo(0, 0);
  }

  // Initialize all managers
  async initializeManagers() {
    this.managers.modal = new ModalManager();

    this.managers.cards = new CardManager();
    this.managers.cards.setModalManager(this.managers.modal);

    this.managers.navigation = new NavigationManager();
    this.managers.animation = new AnimationManager();
    this.managers.routes = new RouteManager();

    this.managers.routes.setModalManager(this.managers.modal);

    // Global access
    window.cardManager = this.managers.cards;
    window.modalManager = this.managers.modal;
  }

  // Load initial application data
  loadInitialData() {
    this.managers.cards.createCards();
    this.managers.animation.initTypewriter();
    this.managers.animation.updateCopyrightYear();
    this.managers.animation.initScrollRevealAnimations();
    this.managers.navigation.setInitialActiveState();
  }

  // Setup global event listeners
  setupGlobalEvents() {
    // Resize events
    window.addEventListener('resize', Utils.debounce(() => {
      if (state.currentPage) {
        this.managers.cards.showPage(state.currentPage);
      }
    }, 200));

    // Cleanup before page unload
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });

    // Global error handling
    window.addEventListener('error', (e) => {
      console.error('Global error caught:', {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        error: e.error
      });

      if (e.error?.name === 'TypeError' && e.message.includes('modalManager')) {
        this.handleCriticalError(e.error);
      }
    });

    window.addEventListener('unhandledrejection', (e) => {
      console.error('Unhandled promise rejection:', e.reason);
      e.preventDefault();
    });
  }

  // Handle critical application errors
  handleCriticalError(error) {
    try {
      console.log('Switching to emergency mode...');

      document.querySelectorAll('.hide, .reveal-section, .reveal-item').forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'none';
        el.classList.remove('hide');
      });

      if (cardsData?.length && this.managers.cards) {
        this.managers.cards.createCards();
      }

      if (this.managers.navigation) {
        this.managers.navigation.initSmoothScrolling();
      }

      AccessibilityManager.announceToScreenReader('Application loaded in fallback mode', 'assertive');

    } catch (fallbackError) {
      console.error('Even emergency mode failed:', fallbackError);
    }
  }

  // Application cleanup
  cleanup() {
    console.log('Cleaning up application...');

    state.clearAllTimers();
    state.reset();
    DOMUtils.cache.clear();

    console.log('Cleanup completed');
  }

  // Public API methods
  getState() {
    return { ...state };
  }

  getManager(name) {
    return this.managers[name];
  }
}

// =================== APPLICATION INITIALIZATION ===================
const app = new PortfolioApp();

// Global access
window.portfolioApp = app;
window.appState = state;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

// Export for potential module usage
export { PortfolioApp, state };