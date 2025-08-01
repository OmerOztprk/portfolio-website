/**
  * Portfolio Website JavaScript Module
  */

// =================== IMPORTS ===================
import { homeData } from "./data/homeData.js";
import { aboutData } from "./data/aboutData.js";
import { skillsData } from "./data/skillsData.js";
import { cardsData } from "./data/cardsData.js";
import { contactData } from "./data/contactData.js";

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
    duration: $(window).width() <= 768 ? 1500 : 1200,
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

// =================== JQUERY UTILITIES ===================
class JQueryUtils {
  static cache = new Map();
  static cacheEnabled = true;

  // Enhanced jQuery selector with caching
  static $(selector, context = $(document), useCache = true) {
    if (!this.cacheEnabled || !useCache) {
      return context.find ? context.find(selector) : $(selector, context);
    }

    const key = `${selector}-${context.get(0) === document ? 'doc' : 'ctx'}`;
    if (!this.cache.has(key)) {
      const element = context.find ? context.find(selector) : $(selector, context);
      if (element.length) {
        this.cache.set(key, element);
      }
      return element;
    }

    const cached = this.cache.get(key);
    if (cached.length && !$.contains(document, cached.get(0))) {
      this.cache.delete(key);
      return context.find ? context.find(selector) : $(selector, context);
    }

    return cached;
  }

  // Create element helper with jQuery
  static createElement(tag, className, content) {
    const $element = $(`<${tag}>`);
    if (className) $element.addClass(className);
    if (content) $element.html(content);
    return $element;
  }

  // Attribute setting helper for jQuery
  static setAttributes($element, attributes) {
    if (!$element || !$element.length || !attributes) return $element;

    $.each(attributes, (key, value) => {
      if (key === 'disabled') {
        $element.prop('disabled', Boolean(value));
        if (value) $element.attr('disabled', '');
        else $element.removeAttr('disabled');
      } else if (value !== null && value !== undefined) {
        $element.attr(key, value);
      }
    });

    return $element;
  }

  // jQuery animation helper
  static animateCSS($element, animationName, callback) {
    $element.addClass(`animate__animated animate__${animationName}`);

    const handleAnimationEnd = () => {
      $element.removeClass(`animate__animated animate__${animationName}`);
      $element.off('animationend', handleAnimationEnd);
      if (callback) callback();
    };

    $element.on('animationend', handleAnimationEnd);
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
  // Performance utilities with jQuery
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

  // Scroll and navigation utilities with jQuery
  getVisibleSections() {
    const $sections = $('section[id]');
    const viewportHeight = $(window).height();
    const visibleSections = [];

    $sections.each((index, section) => {
      const $section = $(section);
      const rect = section.getBoundingClientRect();

      if (rect.top < viewportHeight && rect.bottom > 0) {
        const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
        const visiblePercent = (visibleHeight / viewportHeight) * 100;

        if (visiblePercent > 5) {
          visibleSections.push({
            id: $section.attr('id'),
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

  // Smooth scroll implementation with jQuery
  smoothScrollTo(target, callback) {
    const $element = typeof target === 'string' ? $(target) : target;
    if (!$element.length) return;

    const startPosition = $(window).scrollTop();
    const targetPosition = $element.offset().top - CONFIG.scrollOffset;
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
      $(window).scrollTop(currentPosition);

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
  // Focus trap for modal dialogs with jQuery
  static trapFocus($element) {
    if (!$element || !$element.length) return;

    const $focusableElements = $element.find(
      'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );

    if (!$focusableElements.length) return;

    const $firstElement = $focusableElements.first();
    const $lastElement = $focusableElements.last();

    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && $(document.activeElement).is($firstElement)) {
          e.preventDefault();
          $lastElement.focus();
        } else if (!e.shiftKey && $(document.activeElement).is($lastElement)) {
          e.preventDefault();
          $firstElement.focus();
        }
      }
    };

    $element.on('keydown.focustrap', handleKeyDown);

    return () => {
      $element.off('keydown.focustrap');
    };
  }

  // Remove focus trap
  static removeFocusTrap($element) {
    if ($element && $element.length) {
      $element.off('keydown.focustrap');
    }
  }

  // Screen reader announcements with jQuery
  static announceToScreenReader(message, priority = 'polite') {
    const $announcement = $('<div>')
      .addClass('sr-only')
      .attr('aria-live', priority)
      .text(message);

    $('body').append($announcement);

    setTimeout(() => {
      $announcement.remove();
    }, 1000);
  }
}

// =================== HOME MANAGER ===================
class HomeManager {
  constructor() {
    this.initializeElements();
    this.renderContent();
  }

  // Initialize DOM elements with jQuery
  initializeElements() {
    this.elements = {
      $heroTitle: $('.hero-title'),
      $professionText: $('#profession-text'),
      $heroDescription: $('.hero-description'),
      $heroButtons: $('.hero-buttons')
    };
  }

  // Render dynamic content from homeData
  renderContent() {
    if (this.elements.$heroTitle.length) {
      this.elements.$heroTitle.html(`
        ${homeData.hero.title}
        <span class="highlight">${homeData.hero.name}</span>
      `);
    }

    if (this.elements.$heroDescription.length) {
      this.elements.$heroDescription.text(homeData.hero.description);
    }

    if (this.elements.$heroButtons.length) {
      const buttonsHTML = homeData.buttons.map(button => `
        <a href="${button.href}" class="hero-button ${button.type}">${button.text}</a>
      `).join('');
      this.elements.$heroButtons.html(buttonsHTML);
    }
  }

  // Get professions for typewriter animation
  getTypewriterProfessions() {
    return homeData.hero.professions;
  }
}

// =================== ABOUT MANAGER ===================
class AboutManager {
  constructor() {
    this.initializeElements();
    this.renderContent();
  }

  // Initialize DOM elements with jQuery
  initializeElements() {
    this.elements = {
      $aboutImage: $('.about-image img'),
      $aboutText: $('.about-text'),
      $aboutSocial: $('.about-social'),
      $resumeButton: $('.resume-button')
    };
  }

  // Render dynamic content from aboutData
  renderContent() {
    // Update profile image
    if (this.elements.$aboutImage.length) {
      this.elements.$aboutImage
        .attr('src', aboutData.personal.image)
        .attr('alt', aboutData.personal.name);
    }

    // Update bio text
    if (this.elements.$aboutText.length) {
      const bioHTML = aboutData.personal.bio.map(paragraph =>
        `<p>${paragraph}</p>`
      ).join('');
      this.elements.$aboutText.html(bioHTML);
    }

    // Update social links
    if (this.elements.$aboutSocial.length) {
      const socialHTML = aboutData.social.map(social => `
        <a href="${social.url}" class="social-icon ${social.platform.toLowerCase()}-icon" 
           aria-label="${social.platform}" target="_blank" rel="noopener noreferrer">
          <i class="${social.icon}" aria-hidden="true"></i>
        </a>
      `).join('');
      this.elements.$aboutSocial.html(socialHTML);
    }

    // Update resume button
    if (this.elements.$resumeButton.length) {
      this.elements.$resumeButton.attr('href', aboutData.personal.resumeUrl);
    }
  }
}

// =================== SKILLS MANAGER ===================
class SkillsManager {
  constructor() {
    this.initializeElements();
    this.renderContent();
  }

  // Initialize DOM elements with jQuery
  initializeElements() {
    this.elements = {
      $skillsShowcase: $('.skills-showcase')
    };
  }

  // Render dynamic content from skillsData
  renderContent() {
    if (!this.elements.$skillsShowcase.length) return;

    const skillsCategoriesHTML = skillsData.map(category => `
      <div class="skills-category">
        <div class="skills-header">
          <h3 class="skills-category-title">${category.category}</h3>
          <div class="skills-category-icon">
            <i class="${category.icon}" aria-hidden="true"></i>
          </div>
        </div>
        <div class="skills-grid">
          ${category.skills.map(skill => `
            <div class="skill-item" data-tooltip="${skill.name}" aria-label="${skill.name} skill">
              <i class="${skill.icon}"></i>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

    this.elements.$skillsShowcase.html(skillsCategoriesHTML);
  }
}

// =================== CONTACT MANAGER ===================
class ContactManager {
  constructor() {
    this.initializeElements();
    this.renderContent();
  }

  // Initialize DOM elements with jQuery
  initializeElements() {
    this.elements = {
      $contactDescription: $('.contact-description p'),
      $contactInfoContainer: $('.contact-info-container'),
      $footerSocial: $('.footer-social')
    };
  }

  // Render dynamic content from contactData
  renderContent() {
    // Update description
    if (this.elements.$contactDescription.length) {
      this.elements.$contactDescription.text(contactData.description);
    }

    // Update contact methods
    if (this.elements.$contactInfoContainer.length) {
      const $existingDescription = this.elements.$contactInfoContainer.find('.contact-description');

      const contactMethodsHTML = contactData.contactMethods.map(method => `
        <div class="contact-item">
          <i class="${method.icon}" aria-hidden="true"></i>
          <div class="contact-text">
            <h3>${method.type}</h3>
            ${method.href ?
          `<a href="${method.href}">${method.display}</a>` :
          `<p>${method.display}</p>`
        }
          </div>
        </div>
      `).join('');

      this.elements.$contactInfoContainer.html($existingDescription.prop('outerHTML') + contactMethodsHTML);
    }

    // Update footer social media links
    this.updateFooterSocial();
  }

  // Update footer social media with jQuery
  updateFooterSocial() {
    if (this.elements.$footerSocial.length) {
      const footerSocialHTML = aboutData.social.map(social => `
        <a href="${social.url}" class="social-icon ${social.platform.toLowerCase()}-icon" 
           aria-label="${social.platform}" target="_blank" rel="noopener noreferrer">
          <i class="${social.icon}" aria-hidden="true"></i>
        </a>
      `).join('');

      this.elements.$footerSocial.html(footerSocialHTML);
    }
  }
}

// =================== CARD MANAGEMENT MODULE ===================
class CardManager {
  constructor() {
    this.modalManager = null;
    this.initializeElements();
    this.bindEvents();
  }

  // Initialize DOM elements with jQuery
  initializeElements() {
    this.elements = {
      $grid: $('.cards-grid'),
      $filters: $('.filter-btn'),
      $pagination: $('.pagination'),
      $emptyMessage: $('.empty-category')
    };
  }

  // Bind event listeners with jQuery
  bindEvents() {
    // Card detail buttons event delegation
    this.elements.$grid.on('click', '.view-details-btn', (e) => {
      const $card = $(e.target).closest('.card-item');
      if (this.modalManager || window.modalManager) {
        (this.modalManager || window.modalManager).openFromCard($card);
      }
    });

    // Filter buttons
    this.elements.$filters.on('click', (e) => {
      this.handleFilterChange($(e.target));
    });
  }

  // Create cards from data with jQuery
  createCards() {
    if (!this.elements.$grid.length || !cardsData.length) return;

    const $fragment = $(document.createDocumentFragment());

    cardsData.forEach(item => {
      const $card = this.createCardElement(item);
      $fragment.append($card);
    });

    this.elements.$grid.empty().append($fragment);

    state.cards = this.elements.$grid.children().toArray().map($el => $($el));
    state.filteredCards = [...state.cards];

    this.showPage(1);
    this.renderPagination();
  }

  // Create individual card element with jQuery
  createCardElement(item) {
    const $card = $('<div>').addClass('card-item');

    JQueryUtils.setAttributes($card, {
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

    $card.html(`
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
    `);

    return $card;
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

  // Filter handling with jQuery
  handleFilterChange($button) {
    // Update UI
    this.elements.$filters
      .removeClass('active')
      .attr('aria-pressed', 'false');

    $button
      .addClass('active')
      .attr('aria-pressed', 'true');

    // Apply filter
    const filter = $button.data('filter');
    state.activeFilter = filter;
    this.filterCards(filter);

    AccessibilityManager.announceToScreenReader(
      `Showing ${state.filteredCards.length} projects in ${filter === 'all' ? 'all categories' : filter + ' category'}`
    );
  }

  // Filter cards with jQuery
  filterCards(filter) {
    this.hideEmptyMessage();

    state.filteredCards = filter === 'all'
      ? [...state.cards]
      : state.cards.filter($card => $card.data('category').includes(filter));

    state.currentPage = 1;
    this.showPage(1);
    this.renderPagination();

    if (state.filteredCards.length === 0) {
      this.showEmptyMessage(filter);
    }
  }

  // Pagination methods with jQuery
  showPage(page) {
    // Hide all cards
    state.cards.forEach($card => {
      $card.css('display', 'none').addClass('hide');
    });

    // Show page cards
    const start = (page - 1) * CONFIG.cardsPerPage;
    const pageCards = state.filteredCards.slice(start, start + CONFIG.cardsPerPage);

    pageCards.forEach(($card) => {
      $card.css('display', 'flex').removeClass('hide');
    });

    // Always show pagination if there are any cards
    if (this.elements.$pagination.length) {
      this.elements.$pagination.css('display',
        state.filteredCards.length > 0 ? 'flex' : 'none'
      );
    }
  }

  // Render pagination with jQuery
  renderPagination() {
    if (!this.elements.$pagination.length) return;

    const totalPages = Math.ceil(state.filteredCards.length / CONFIG.cardsPerPage);
    this.elements.$pagination.empty();

    // Show pagination even for single page (if there are cards)
    if (totalPages < 1) return;

    // Previous page button
    this.addNavigationButton('prev', state.currentPage === 1);

    // Page numbers
    this.addPageNumbers(totalPages);

    // Next page button
    this.addNavigationButton('next', state.currentPage === totalPages);
  }

  // Add navigation button with jQuery
  addNavigationButton(type, disabled) {
    const $button = $('<button>').addClass('page-btn');
    $button.html(type === 'prev'
      ? '<i class="fas fa-chevron-left"></i>'
      : '<i class="fas fa-chevron-right"></i>'
    );

    JQueryUtils.setAttributes($button, {
      disabled,
      'aria-label': type === 'prev' ? 'Previous page' : 'Next page'
    });

    $button.on('click', () => {
      if (!disabled) {
        state.currentPage += type === 'prev' ? -1 : 1;
        this.showPage(state.currentPage);
        this.renderPagination();
        Utils.smoothScrollTo('#projects');
      }
    });

    this.elements.$pagination.append($button);
  }

  // Add page numbers with jQuery
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
        this.elements.$pagination.append(this.createDots());
      }
    }

    // Middle pages
    for (let i = start; i <= end; i++) {
      this.addPageButton(i);
    }

    // Dots + last page
    if (end < totalPages) {
      if (end < totalPages - 1) {
        this.elements.$pagination.append(this.createDots());
      }
      this.addPageButton(totalPages);
    }
  }

  // Add page button with jQuery
  addPageButton(pageNumber) {
    const isActive = pageNumber === state.currentPage;
    const $button = $('<button>')
      .addClass(`page-btn${isActive ? ' active' : ''}`)
      .text(pageNumber);

    JQueryUtils.setAttributes($button, {
      'aria-label': `Page ${pageNumber}`,
      'aria-current': isActive ? 'page' : null
    });

    $button.on('click', () => {
      state.currentPage = pageNumber;
      this.showPage(pageNumber);
      this.renderPagination();
      Utils.smoothScrollTo('#projects');
    });

    this.elements.$pagination.append($button);
  }

  // Create dots with jQuery
  createDots() {
    return $('<span>').addClass('pagination-dots').text('…');
  }

  // Empty state handling with jQuery
  showEmptyMessage(filter) {
    if (!this.elements.$emptyMessage.length) return;

    this.elements.$grid.hide();
    this.elements.$pagination.hide();

    const categoryName = filter === 'all' ? 'Projects' : filter.charAt(0).toUpperCase() + filter.slice(1);

    this.elements.$emptyMessage.html(`
      <i class="fas fa-folder-open" aria-hidden="true"></i>
      <h3>No ${categoryName} Found</h3>
      <p>There are currently no projects in the ${filter === 'all' ? 'portfolio' : categoryName + ' category'}. Check back later!</p>
    `).show();
  }

  hideEmptyMessage() {
    if (this.elements.$emptyMessage.length) {
      this.elements.$emptyMessage.hide();
      this.elements.$grid.show();
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

  // Initialize DOM elements with jQuery
  initializeElements() {
    this.elements = {
      $overlay: $('.modal-overlay'),
      $title: $('.modal-title'),
      $tags: $('.modal-tags'),
      $description: $('.modal-description'),
      $closeBtn: $('.modal-close'),
      $prevBtn: $('.gallery-nav.prev'),
      $nextBtn: $('.gallery-nav.next'),
      $thumbsContainer: $('.modal-thumbs'),
      $buttons: $('.modal-buttons a')
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

  // Bind basic event listeners with jQuery
  bindEvents() {
    this.elements.$closeBtn.on('click', () => this.close());
    this.elements.$prevBtn.on('click', () => this.navigateImage(-1));
    this.elements.$nextBtn.on('click', () => this.navigateImage(1));

    this.keydownHandler = this.boundHandlers.keydownHandler;

    this.elements.$overlay.on('click', (e) => {
      if ($(e.target).is(this.elements.$overlay)) this.close();
    });
  }

  // Modal opening and content management with jQuery
  openFromCard($card) {
    if (!$card || !$card.length || !this.elements.$overlay.length) return;

    try {
      this.currentCard = $card;

      state.modal.imageList = $card.data('images').split(',');
      state.modal.currentIndex = 0;
      state.modal.savedScrollPosition = $(window).scrollTop();

      this.updateModalStaticContent();
      this.updateModalImageAndEvents();
      this.buildThumbnails();

      this.show();
      this.startSlideshow();

      // Update URL
      const slug = $card.data('project-slug');
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

  // Update modal static content with jQuery
  updateModalStaticContent() {
    if (!this.currentCard || !this.currentCard.length) return;

    const title = this.currentCard.find('.card-title').text() || '';
    const tags = this.currentCard.find('.card-tags').text() || '';
    const description = this.currentCard.find('.card-description').text() || '';

    this.elements.$title.text(title);
    this.elements.$tags.text(tags);
    this.elements.$description.text(description);

    this.updateActionButtons();
  }

  // Update modal image and events with jQuery
  updateModalImageAndEvents() {
    const $imageElement = $('.modal-img');

    if ($imageElement.length) {
      $imageElement
        .attr('src', state.modal.imageList[state.modal.currentIndex])
        .attr('alt', this.currentCard.find('.card-title').text() || 'Project image')
        .attr('draggable', 'false');

      this.setupImagePauseEvents($imageElement);
    }
  }

  // Update action buttons with jQuery
  updateActionButtons() {
    if (!this.currentCard || !this.currentCard.length) return;

    const $links = this.currentCard.find('.card-link-item');

    this.elements.$buttons.each((index, button) => {
      const $button = $(button);
      const $link = $links.eq(index);
      if ($link.length) {
        $button.attr('href', $link.attr('href'));
        const linkText = index === 0 ? 'Live Demo' : 'Source Code';
        $button.attr('aria-label', `${linkText} for ${this.elements.$title.text() || 'project'}`);
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
    if (this.elements.$overlay.css('display') === 'flex') {
      this.startSlideshow();
    }
  }

  // Thumbnail management with jQuery
  buildThumbnails() {
    if (!this.elements.$thumbsContainer.length) return;

    this.cleanupThumbnails();
    this.elements.$thumbsContainer.empty();

    const $fragment = $(document.createDocumentFragment());

    state.modal.imageList.forEach((src, index) => {
      const $thumb = $('<img>')
        .addClass('modal-thumb')
        .attr({
          'src': src,
          'loading': 'lazy',
          'data-index': index,
          'aria-label': `Image ${index + 1} of ${state.modal.imageList.length}`,
          'role': 'tab',
          'tabindex': '0',
          'aria-selected': index === state.modal.currentIndex ? 'true' : 'false',
          'draggable': 'false'
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

      $thumb.on('click', clickHandler);
      $thumb.on('keydown', keyHandler);
      $thumb.on('dragstart selectstart', preventDragHandler);

      $thumb.data('handlers', { clickHandler, keyHandler, preventDragHandler });

      $fragment.append($thumb);
    });

    this.elements.$thumbsContainer.append($fragment);
    this.setupThumbnailScrolling();

    requestAnimationFrame(() => {
      this.highlightThumbnail(state.modal.currentIndex);
    });
  }

  // Highlight thumbnail with jQuery
  highlightThumbnail(index) {
    if (!this.elements.$thumbsContainer.length) return;

    const $thumbs = this.elements.$thumbsContainer.find('.modal-thumb');
    $thumbs.each((i, thumb) => {
      const $thumb = $(thumb);
      const isActive = Number($thumb.data('index')) === index;
      $thumb.toggleClass('active', isActive);
      $thumb.attr('aria-selected', isActive ? 'true' : 'false');

      if (isActive) {
        thumb.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    });
  }

  // Event handling methods with jQuery
  setupImagePauseEvents($imageElement = null) {
    const $element = $imageElement || $('.modal-img');

    if (!$element.length) return;

    this.cleanupImagePauseEvents($element);

    $element.on("mousedown", this.boundHandlers.pauseSlide);
    $element.on("mouseup mouseleave", this.boundHandlers.handleMouseUp);
    $element.on("touchstart", this.boundHandlers.pauseSlide);
    $element.on("touchend touchcancel", this.boundHandlers.handleMouseUp);
    $element.on('dragstart selectstart', this.boundHandlers.preventImageDrag);

    this.elements.$image = $element;
  }

  setupThumbnailScrolling() {
    if (this.elements.$thumbsContainer.length) {
      this.elements.$thumbsContainer.off('wheel.thumbnails');
      this.elements.$thumbsContainer.on('wheel.thumbnails', this.boundHandlers.handleThumbnailScroll);
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
      if (this.elements.$overlay.css('display') === 'flex' && state.modal.isSlideActive === false) {
        this.resumeSlideshow();
      }
    }, 1000);
  }

  handleThumbnailScroll(e) {
    if (this.elements.$thumbsContainer.length) {
      if (e.originalEvent.deltaY !== 0) {
        e.preventDefault();
        this.elements.$thumbsContainer[0].scrollLeft += e.originalEvent.deltaY;
      }
    }
  }

  // Modal display methods with jQuery
  show() {
    this.elements.$overlay.show();

    if (window.portfolioApp?.managers?.navigation) {
      window.portfolioApp.managers.navigation.setModalState(true);
    }

    $('body').css({
      overflow: 'hidden',
      position: 'fixed',
      top: `-${state.modal.savedScrollPosition}px`,
      width: '100%'
    });

    const removeFocusTrap = AccessibilityManager.trapFocus(this.elements.$overlay);
    this.cleanupHandlers.push(removeFocusTrap);

    $(window).on('keydown.modal', this.keydownHandler);

    state.setTimer('focusCloseBtn', () => {
      this.elements.$closeBtn.focus();
    }, 100);
  }

  // Close modal with jQuery
  close() {
    this.cleanupThumbnails();
    this.cleanupImagePauseEvents();

    this.elements.$overlay.hide();

    if (window.portfolioApp?.managers?.navigation) {
      window.portfolioApp.managers.navigation.setModalState(false);
    }

    this.pauseSlideshow();

    $(window).off('keydown.modal');

    if (this.elements.$thumbsContainer.length) {
      this.elements.$thumbsContainer.off('wheel.thumbnails');
    }

    this.cleanupHandlers.forEach(cleanup => cleanup?.());
    this.cleanupHandlers = [];

    $('body').css({
      overflow: '',
      position: '',
      top: '',
      width: ''
    });

    $(window).scrollTop(state.modal.savedScrollPosition);

    const hash = window.location.hash;
    if (hash.startsWith('#projects/')) {
      history.replaceState({}, '', '#projects');
    }

    this.elements.$image = null;
    this.currentCard = null;
  }

  // Cleanup methods with jQuery
  cleanupImagePauseEvents($imageElement = null) {
    const $element = $imageElement || this.elements.$image;

    if ($element && $element.length) {
      $element.off("mousedown mouseup mouseleave touchstart touchend touchcancel dragstart selectstart");
    }
  }

  cleanupThumbnails() {
    if (!this.elements.$thumbsContainer.length) return;

    const $thumbs = this.elements.$thumbsContainer.find('.modal-thumb');
    $thumbs.each((i, thumb) => {
      const $thumb = $(thumb);
      const handlers = $thumb.data('handlers');
      if (handlers) {
        $thumb.off('click', handlers.clickHandler);
        $thumb.off('keydown', handlers.keyHandler);
        $thumb.off('dragstart selectstart', handlers.preventDragHandler);
        $thumb.removeData('handlers');
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

  // Initialize DOM elements with jQuery
  initializeElements() {
    this.elements = {
      $mobileToggle: $('.mobile-menu-toggle'),
      $navLinks: $('.nav-link'),
      $internalLinks: $('a[href^="#"]'),
      $scrollToTop: $('.scroll-to-top'),
      $header: $('.site-header')
    };
  }

  // Bind navigation events with jQuery
  bindEvents() {
    // Mobile menu toggle
    this.elements.$mobileToggle.on('click', () => this.toggleMobileMenu());

    // Navigation links
    this.elements.$navLinks.on('click', () => this.closeMobileMenu());

    // Outside click handling
    $(document).on('click.navigation', (e) => this.handleOutsideClick(e));

    this.initSmoothScrolling();
    this.initScrollHandling();
  }

  // Mobile menu methods
  toggleMobileMenu() {
    state.ui.isMobileMenuOpen = !state.ui.isMobileMenuOpen;
    $('body').toggleClass('mobile-menu-open', state.ui.isMobileMenuOpen);

    this.elements.$mobileToggle.attr('aria-expanded', state.ui.isMobileMenuOpen.toString());
  }

  closeMobileMenu() {
    state.ui.isMobileMenuOpen = false;
    $('body').removeClass('mobile-menu-open');

    this.elements.$mobileToggle.attr('aria-expanded', 'false');
  }

  handleOutsideClick(e) {
    if (state.ui.isMobileMenuOpen &&
      !$(e.target).closest('.nav-links').length &&
      !$(e.target).closest('.mobile-menu-toggle').length) {
      this.closeMobileMenu();
    }
  }

  // Active link management with jQuery
  setActiveLink($activeLink) {
    this.elements.$navLinks.removeClass('active');
    $activeLink.addClass('active');
  }

  // Smooth scrolling setup with jQuery
  initSmoothScrolling() {
    this.elements.$internalLinks.each((i, link) => {
      const $link = $(link);
      if ($link.closest('.modal-buttons').length) return;

      $link.on('click', (e) => {
        e.preventDefault();
        const targetId = $link.attr('href');

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
    this.elements.$scrollToTop.on('click', () => {
      this.isNavigating = true;

      $('html, body').animate({
        scrollTop: 0
      }, CONFIG.scrollAnimation.duration, () => {
        this.isNavigating = false;
      });
    });
  }

  // Header scroll effect with jQuery
  initScrollHeaderEffect() {
    let ticking = false;

    const updateHeader = () => {
      const scrollY = this.isModalOpen ?
        (state.modal?.savedScrollPosition || 0) :
        $(window).scrollTop();

      if (scrollY > 1) {
        this.elements.$header.addClass('scrolled');
      } else {
        this.elements.$header.removeClass('scrolled');
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

    $(window).on('scroll.header', onScroll);
    this.scrollHandlers.add(onScroll);

    updateHeader();
  }

  // Scroll-based updates with jQuery
  initScrollHandling() {
    const scrollHandler = Utils.throttle(() => {
      if (this.isModalOpen) return;

      this.updateActiveNavOnScroll();
      this.updateScrollToTopVisibility();
    }, 100);

    $(window).on('scroll.navigation', scrollHandler);
    this.scrollHandlers.add(scrollHandler);
  }

  setModalState(isOpen) {
    this.isModalOpen = isOpen;

    if (isOpen) {
      const scrollY = state.modal?.savedScrollPosition || 0;
      if (scrollY > 1) {
        this.elements.$header.addClass('scrolled');
      } else {
        this.elements.$header.removeClass('scrolled');
      }
    }
  }

  updateActiveNavOnScroll() {
    const visibleSections = Utils.getVisibleSections();

    if (visibleSections.length > 0) {
      const mostVisible = '#' + visibleSections[0].id;
      const $targetLink = $(`.nav-link[href="${mostVisible}"]`);

      if ($targetLink.length && !$targetLink.hasClass('active')) {
        this.setActiveLink($targetLink);
      }
    }
  }

  updateScrollToTopVisibility() {
    if (this.elements.$scrollToTop.length) {
      const shouldShow = $(window).scrollTop() > 300;
      this.elements.$scrollToTop.css('display', shouldShow ? 'flex' : 'none');
    }
  }

  setInitialActiveState() {
    const hash = window.location.hash.split('/')[0] || '#home';
    const $activeLink = $(`.nav-link[href="${hash}"]`);

    if ($activeLink.length) {
      this.setActiveLink($activeLink);
    }
  }

  // Cleanup method with jQuery
  destroy() {
    this.elements.$mobileToggle.off('click');
    this.elements.$navLinks.off('click');
    $(document).off('click.navigation');
    $(window).off('scroll.header scroll.navigation');

    this.scrollHandlers.clear();
    this.boundHandlers.clear();
  }
}

// =================== ANIMATION MODULE ===================
class AnimationManager {
  constructor() {
    this.homeManager = null;
    this.initializeElements();
  }

  // Initialize DOM elements with jQuery
  initializeElements() {
    this.elements = {
      $professionText: $('#profession-text'),
      $yearSpan: $('#current-year')
    };
  }

  setHomeManager(homeManager) {
    this.homeManager = homeManager;
  }

  // Typewriter animation with jQuery
  initTypewriter() {
    if (!this.elements.$professionText.length) return;

    const professions = this.homeManager ?
      this.homeManager.getTypewriterProfessions() :
      ["Full Stack Developer", "AI-Powered App Creator", "Game Dev Enthusiast"];

    let currentIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    const typeEffect = () => {
      const currentProfession = professions[currentIndex];

      if (isDeleting) {
        this.elements.$professionText.text(currentProfession.substring(0, charIndex - 1));
        charIndex--;
      } else {
        this.elements.$professionText.text(currentProfession.substring(0, charIndex + 1));
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

  // Update copyright year with jQuery
  updateCopyrightYear() {
    if (this.elements.$yearSpan.length) {
      this.elements.$yearSpan.text(new Date().getFullYear());
    }
  }

  // Scroll reveal animations with jQuery
  initScrollRevealAnimations() {
    const $sectionsToReveal = $('section#about, section#skills, section#projects, section#contact');
    if (!$sectionsToReveal.length) return;

    const sectionConfigs = {
      'about': { rootMargin: '0px 0px -15% 0px', threshold: 0.05 },
      'skills': { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
      'projects': { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
      'contact': { rootMargin: '0px 0px -15% 0px', threshold: 0.05 }
    };

    const revealCallback = (entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const $section = $(entry.target);
          if (!$section.hasClass('is-visible')) {
            $section.addClass('reveal-transition');

            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                $section.addClass('is-visible');
              });
            });

            observer.unobserve(entry.target);
          }
        }
      });
    };

    // Create observers for each section
    $sectionsToReveal.each((i, section) => {
      const sectionId = $(section).attr('id');
      const config = sectionConfigs[sectionId] || { rootMargin: '0px 0px -15% 0px', threshold: 0.05 };

      const observer = new IntersectionObserver(revealCallback, {
        root: null,
        rootMargin: config.rootMargin,
        threshold: config.threshold
      });

      $(section).addClass('reveal-section');
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
    $(window).on('popstate', (e) => this.handlePopState(e.originalEvent));
    this.handleInitialRoute();
  }

  // Handle initial page load routing
  handleInitialRoute() {
    const hash = window.location.hash;

    if (hash.startsWith('#projects/')) {
      history.replaceState(null, null, window.location.pathname + window.location.search);

      const $modalOverlay = $('.modal-overlay');
      if ($modalOverlay.length) {
        $modalOverlay.hide();
        $('body').css({
          overflow: '',
          position: '',
          top: '',
          width: ''
        });
      }

      $(window).scrollTop(0);
      return;
    }
  }

  // Handle browser back/forward navigation
  handlePopState(e) {
    const modal = this.modalManager || window.modalManager;

    if (e.state?.slug) {
      const { slug, scrollY = 0 } = e.state;
      state.modal.savedScrollPosition = scrollY;

      if (modal?.elements.$overlay.css('display') !== 'flex') {
        this.openProjectModal(slug, false);
      }
    } else if (modal?.elements.$overlay.css('display') === 'flex') {
      modal.close();
    }
  }

  // Open project modal by slug
  openProjectModal(slug, useDelay = true) {
    const $card = state.cards.find($c => $c.data('project-slug') === slug);
    const modal = this.modalManager || window.modalManager;

    if ($card && modal) {
      const openModal = () => modal.openFromCard($card);

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

    } catch (error) {
      console.error('Error starting application:', error);
      this.handleCriticalError(error);
    }
  }

  // Setup scroll restoration and hash cleanup with jQuery
  setupScrollRestoration() {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    if (window.location.hash) {
      history.replaceState(null, null, window.location.pathname + window.location.search);
    }

    const $modalOverlay = $('.modal-overlay');
    if ($modalOverlay.length && $modalOverlay.css('display') === 'flex') {
      $modalOverlay.hide();
      $('body').css({
        overflow: '',
        position: '',
        top: '',
        width: ''
      });
    }

    $(window).scrollTop(0);
  }

  // Initialize all managers
  async initializeManagers() {
    // Initialize content managers
    this.managers.home = new HomeManager();
    this.managers.about = new AboutManager();
    this.managers.skills = new SkillsManager();
    this.managers.contact = new ContactManager();

    // Initialize existing managers
    this.managers.modal = new ModalManager();
    this.managers.cards = new CardManager();
    this.managers.cards.setModalManager(this.managers.modal);
    this.managers.navigation = new NavigationManager();
    this.managers.animation = new AnimationManager();
    this.managers.animation.setHomeManager(this.managers.home);
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

  // Setup global event listeners with jQuery
  setupGlobalEvents() {
    // Resize events
    $(window).on('resize', Utils.debounce(() => {
      if (state.currentPage) {
        this.managers.cards.showPage(state.currentPage);
      }
    }, 200));

    // Cleanup before page unload
    $(window).on('beforeunload', () => {
      this.cleanup();
    });

    // Global error handling
    $(window).on('error', (e) => {
      console.error('Global error caught:', {
        message: e.originalEvent.message,
        filename: e.originalEvent.filename,
        lineno: e.originalEvent.lineno,
        colno: e.originalEvent.colno,
        error: e.originalEvent.error
      });

      if (e.originalEvent.error?.name === 'TypeError' && e.originalEvent.message.includes('modalManager')) {
        this.handleCriticalError(e.originalEvent.error);
      }
    });
  }

  // Handle critical application errors
  handleCriticalError(error) {
    try {
      $('.hide, .reveal-section, .reveal-item').css({
        opacity: '1',
        transform: 'none'
      }).removeClass('hide');

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
    state.clearAllTimers();
    state.reset();
    JQueryUtils.cache.clear();
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

// Initialize when DOM is ready with jQuery
$(document).ready(() => {
  app.init();
});

// Export for potential module usage
export { PortfolioApp, state };