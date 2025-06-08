/**
 * Portfolio Cards - Main JavaScript Module
 * 
 * Modern, performant ve erişilebilir portfolio uygulaması
 * Modüler mimari ile geliştirilmiş, temiz kod prensiplerine uygun
 */

// =================== IMPORTS ===================
import { cardsData } from "./cardsData.js";

// =================== CONFIGURATION ===================
const CONFIG = Object.freeze({
  // Sayfalama
  cardsPerPage: 6,
  maxPaginationPages: 3,

  // Görsel ayarları
  fallbackImage: "./assets/images/default.png",

  // Slayt gösterisi
  autoSlideInterval: 3000,
  resumeSlideTimeout: 2000,

  // Animasyonlar
  typewriter: {
    speed: 100,
    deleteSpeed: 50,
    pauseDuration: 1500,
    initialDelay: 300
  },

  // Performans
  debounceDelay: 150,
  scrollOffset: 80,

  // Yeni scroll ayarları ekleyin
  scrollAnimation: {
    duration: window.innerWidth <= 768 ? 1500 : 1200,  // Mobilde daha yavaş
    easing: 'easeInOutCubic'  // Animasyon easing'i
  },
  // ...existing code...
});

// =================== STATE MANAGEMENT ===================
class AppState {
  constructor() {
    this.reset();
  }

  reset() {
    // Kart yönetimi
    this.cards = [];
    this.filteredCards = [];
    this.currentPage = 1;
    this.activeFilter = 'all';

    // Modal yönetimi
    this.modal = {
      imageList: [],
      currentIndex: 0,
      isSlideActive: false,
      savedScrollPosition: 0
    };

    // Zamanlayıcılar
    this.timers = new Map();

    // UI durumları
    this.ui = {
      isMobileMenuOpen: false,
      isScrolling: false
    };

    this.clearAllTimers();
  }

  // Zamanlayıcı yönetimi
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

// Global state instance
const state = new AppState();

// =================== DOM UTILITIES ===================
class DOMUtils {
  static cache = new Map();
  static cacheEnabled = true;

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
    // Element hala DOM'da mı kontrol et
    if (cached && !document.contains(cached)) {
      this.cache.delete(key);
      return context.querySelector(selector);
    }

    return cached;
  }

  static $$(selector, context = document) {
    const key = `${selector}-all-${context === document ? 'doc' : 'ctx'}`;
    if (!this.cache.has(key)) {
      this.cache.set(key, context.querySelectorAll(selector));
    }
    return this.cache.get(key);
  }

  static createElement(tag, className, content) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content) element.innerHTML = content;
    return element;
  }

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

  static animateCSS(element, animationName, callback) {
    element.classList.add('animate__animated', `animate__${animationName}`);

    const handleAnimationEnd = () => {
      element.classList.remove('animate__animated', `animate__${animationName}`);
      element.removeEventListener('animationend', handleAnimationEnd);
      if (callback) callback();
    };

    element.addEventListener('animationend', handleAnimationEnd);
  }

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

  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  },

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

  // Easing fonksiyonları ekleyin
  easing: {
    easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    easeOutQuart: (t) => 1 - Math.pow(1 - t, 4),
    easeInOutQuart: (t) => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2
  },

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
        // Animasyon bittiğinde callback'i çağır
        callback();
      }
    };

    requestAnimationFrame(animateScroll);
  },

  formatProjectSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
};

// =================== ACCESSIBILITY MANAGER ===================
class AccessibilityManager {
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

  static removeFocusTrap(element) {
    if (element?._focusTrapHandler) {
      element.removeEventListener('keydown', element._focusTrapHandler);
      element._focusTrapHandler = null;
    }
  }

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
    this.modalManager = null; // Reference ekle
    this.initializeElements();
    this.bindEvents();
  }

  initializeElements() {
    this.elements = {
      grid: DOMUtils.$('.cards-grid'),
      filters: DOMUtils.$$('.filter-btn'),
      pagination: DOMUtils.$('.pagination'),
      emptyMessage: DOMUtils.$('.empty-category')
    };
  }

  bindEvents() {
    // Kart detay butonları için event delegation
    this.elements.grid?.addEventListener('click', (e) => {
      const detailsBtn = e.target.closest('.view-details-btn');
      if (detailsBtn) {
        const card = detailsBtn.closest('.card-item');
        // GÜVENLE modalManager kullan
        if (this.modalManager || window.modalManager) {
          (this.modalManager || window.modalManager).openFromCard(card);
        } else {
          console.warn('Modal manager henüz hazır değil');
        }
      }
    });

    // Filtre butonları
    this.elements.filters.forEach(button => {
      button.addEventListener('click', () => this.handleFilterChange(button));
    });
  }

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

  handleFilterChange(button) {
    // UI güncelleme
    this.elements.filters.forEach(btn => {
      btn.classList.remove('active');
      btn.setAttribute('aria-pressed', 'false');
    });

    button.classList.add('active');
    button.setAttribute('aria-pressed', 'true');

    // Filtreleme
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

  showPage(page) {
    // Tüm kartları gizle
    state.cards.forEach(card => {
      card.style.display = 'none';
      card.classList.add('hide');
    });

    // Sayfa kartlarını göster
    const start = (page - 1) * CONFIG.cardsPerPage;
    const pageCards = state.filteredCards.slice(start, start + CONFIG.cardsPerPage);

    pageCards.forEach((card) => {
      card.style.display = 'flex';
      // Tüm kartlar aynı anda gösterilecek
      card.classList.remove('hide');
    });

    // Pagination görünürlüğü
    if (this.elements.pagination) {
      this.elements.pagination.style.display =
        state.filteredCards.length > CONFIG.cardsPerPage ? 'flex' : 'none';
    }
  }

  renderPagination() {
    if (!this.elements.pagination) return;

    const totalPages = Math.ceil(state.filteredCards.length / CONFIG.cardsPerPage);
    this.elements.pagination.innerHTML = '';

    if (totalPages <= 1) return;

    // Önceki sayfa
    this.addNavigationButton('prev', state.currentPage === 1);

    // Sayfa numaraları
    this.addPageNumbers(totalPages);

    // Sonraki sayfa
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

    // İlk sayfa + dots
    if (start > 1) {
      this.addPageButton(1);
      if (start > 2) {
        this.elements.pagination.appendChild(this.createDots());
      }
    }

    // Orta sayfalar
    for (let i = start; i <= end; i++) {
      this.addPageButton(i);
    }

    // Dots + son sayfa
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

  setModalManager(modalManager) {
    this.modalManager = modalManager;
  }
}

// =================== MODAL MANAGEMENT MODULE ===================
class ModalManager {
  constructor() {
    this.cleanupHandlers = [];
    this.boundHandlers = this.createBoundHandlers();
    this.currentCard = null; // Mevcut kart referansını sakla
    this.initializeElements();
    this.bindEvents();
  }

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

  bindEvents() {
    // Kapat butonu
    this.elements.closeBtn?.addEventListener('click', () => this.close());

    // Navigasyon butonları
    this.elements.prevBtn?.addEventListener('click', () => this.navigateImage(-1));
    this.elements.nextBtn?.addEventListener('click', () => this.navigateImage(1));

    // Klavye navigasyonu
    this.keydownHandler = this.boundHandlers.keydownHandler;

    // Overlay'e tıklayınca kapat
    this.elements.overlay?.addEventListener('click', (e) => {
      if (e.target === this.elements.overlay) this.close();
    });
  }

  buildThumbnails() {
    if (!this.elements.thumbsContainer) return;

    this.cleanupThumbnails(); // Önce var olanları temizle
    this.elements.thumbsContainer.innerHTML = '';

    const fragment = document.createDocumentFragment();

    state.modal.imageList.forEach((src, index) => {
      const thumb = DOMUtils.createElement('img', 'modal-thumb');
      thumb.src = src;
      thumb.loading = 'lazy';
      thumb.dataset.index = index;

      // Sürüklemeyi engelle
      thumb.draggable = false;
      thumb.setAttribute('draggable', 'false'); // Ekstra güvence

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

      // Sürükleme olaylarını engellemek için handler
      const preventDragHandler = (e) => {
        e.preventDefault();
        return false;
      };

      thumb.addEventListener('click', clickHandler);
      thumb.addEventListener('keydown', keyHandler);
      thumb.addEventListener('dragstart', preventDragHandler); // Sürükleme başlangıcını engelle
      thumb.addEventListener('selectstart', preventDragHandler); // Metin seçimi gibi sürüklemeyi de engeller

      thumb._clickHandler = clickHandler;
      thumb._keyHandler = keyHandler;
      thumb._preventDragHandler = preventDragHandler; // Temizlik için sakla

      fragment.appendChild(thumb);
    });

    this.elements.thumbsContainer.appendChild(fragment);

    // Thumbnails container için scroll event listener'ı ekle
    this.setupThumbnailScrolling();


    requestAnimationFrame(() => {
      this.highlightThumbnail(state.modal.currentIndex);
    });
  }

  setupThumbnailScrolling() {
    if (this.elements.thumbsContainer) {
      // Önce varsa eski listener'ı kaldır
      this.elements.thumbsContainer.removeEventListener('wheel', this.boundHandlers.handleThumbnailScroll);

      // Yeni listener ekle
      this.elements.thumbsContainer.addEventListener('wheel', this.boundHandlers.handleThumbnailScroll, { passive: false });
    }
  }

  openFromCard(card) {
    if (!card || !this.elements.overlay) return;

    try {
      // Kart referansını sakla
      this.currentCard = card; // Set currentCard here

      // Modal state'ini ayarla
      state.modal.imageList = card.dataset.images.split(',');
      state.modal.currentIndex = 0;
      state.modal.savedScrollPosition = window.scrollY;

      // İçeriği güncelle (statik kısımlar)
      this.updateModalStaticContent();
      // Resmi ve olaylarını güncelle
      this.updateModalImageAndEvents();
      this.buildThumbnails();

      // Modal'ı göster
      this.show();

      // Slayt gösterisini başlat
      this.startSlideshow();

      // URL'yi güncelle
      const slug = card.dataset.projectSlug;
      history.replaceState(
        { slug, scrollY: state.modal.savedScrollPosition },
        '',
        `#projects/${slug}`
      );
    } catch (error) {
      console.error('Modal açılırken hata:', error);
      this.close();
    }
  }

  // setupImagePauseEvents metodunu güncelle
  setupImagePauseEvents(imageElement = null) {
    // ✅ DÜZELTME: Parametre olarak al, yoksa fresh bul
    const element = imageElement || DOMUtils.$('.modal-img');

    if (!element) {
      console.warn('Modal image element bulunamadı (setupImagePauseEvents)');
      return;
    }

    // Önce temizle (cache'lenmiş elementi kullanmak yerine parametreyi kullan)
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

    // ✅ DÜZELTME: Sadece temizlik için cache'le
    this.elements.image = element;
  }

  // Sadece modal ilk açıldığında çağrılacak statik içerik güncellemeleri
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

  // Resim değiştiğinde çağrılacak resim ve olay güncellemeleri
  updateModalImageAndEvents() {
    // Her seferinde fresh al
    const imageElement = DOMUtils.$('.modal-img');

    if (imageElement) {
      imageElement.src = state.modal.imageList[state.modal.currentIndex];
      imageElement.alt = this.currentCard?.querySelector('.card-title')?.textContent || 'Project image';

      imageElement.draggable = false;
      imageElement.setAttribute('draggable', 'false');

      // ✅ DÜZELTME: Cache'e atmak yerine direkt setupImagePauseEvents'e geçir
      this.setupImagePauseEvents(imageElement);
    } else {
      console.warn('Modal image element bulunamadı');
    }
  }

  updateActionButtons() { // Bu metod updateModalStaticContent içinden çağrılabilir
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

  switchToImage(index) {
    this.pauseSlideshow();
    state.modal.currentIndex = index;

    // Sadece resmi ve olaylarını güncelle
    this.updateModalImageAndEvents();

    this.highlightThumbnail(index);

    // Slayt gösterisini yeniden başlat
    state.setTimer('resumeSlideshow', () => this.resumeSlideshow(), CONFIG.resumeSlideTimeout);
  }

  navigateImage(direction) {
    this.pauseSlideshow();

    const newIndex = (state.modal.currentIndex + direction + state.modal.imageList.length) % state.modal.imageList.length;
    this.switchToImage(newIndex);
  }

  highlightThumbnail(index) {
    if (!this.elements.thumbsContainer) return; // thumbsContainer yoksa işlem yapma

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
    state.clearTimer('slideshow'); // Ana slayt gösterisi interval'ını temizler
    state.clearTimer('resumeSlideshow'); // Bekleyen "devam et" timeout'unu da temizler
  }

  resumeSlideshow() {
    if (this.elements.overlay.style.display === 'flex') {
      this.startSlideshow();
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

  /**
   * Slayt gösterisini devam ettirmek için fare/dokunma olayını işle
   */
  handleMouseUp() {
    state.clearTimer('resumeSlideshow');
    state.setTimer('resumeSlideshow', () => {
      // Modalın hala açık ve görünür olduğunu kontrol etmek iyi bir pratiktir.
      if (this.elements.overlay?.style.display === 'flex' && state.modal.isSlideActive === false) { // Sadece slayt duraklatılmışsa devam et
        this.resumeSlideshow();
      }
    }, 1000); // Bu süre (1000ms) CONFIG.resumeSlideTimeout (2000ms) ile farklı, bilinçli bir tercih olabilir.
  }

  // cleanupImagePauseEvents metodunu da güncelle
  cleanupImagePauseEvents(imageElement = null) {
    // ✅ DÜZELTME: Parametre olarak al, yoksa cache'den al
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

  handleThumbnailScroll(e) {
    if (this.elements.thumbsContainer) {
      // e.deltaY değeri dikey tekerlek hareketini verir.
      // Yatay scroll için bunu scrollLeft'e ekliyoruz.
      // e.preventDefault() çağrısı, sayfanın dikey olarak kaymasını engeller.
      if (e.deltaY !== 0) {
        e.preventDefault();
        this.elements.thumbsContainer.scrollLeft += e.deltaY;
      }
    }
  }

  show() {
    this.elements.overlay.style.display = 'flex';

    // Navigation manager'a modal açıldığını bildir
    if (window.portfolioApp?.managers?.navigation) {
      window.portfolioApp.managers.navigation.setModalState(true);
    }

    // Body scroll'unu kilitle
    document.body.style.cssText = `
      overflow: hidden;
      position: fixed;
      top: -${state.modal.savedScrollPosition}px;
      width: 100%;
    `;

    // Accessibility
    const removeFocusTrap = AccessibilityManager.trapFocus(this.elements.overlay);
    this.cleanupHandlers.push(removeFocusTrap);

    window.addEventListener('keydown', this.keydownHandler);

    // Odağı kapat butonuna ayarla
    state.setTimer('focusCloseBtn', () => {
      this.elements.closeBtn?.focus();
    }, 100);
  }

  close() {
    this.cleanupThumbnails();
    this.cleanupImagePauseEvents();

    // Modal'ı gizle
    this.elements.overlay.style.display = 'none';

    // Navigation manager'a modal kapandığını bildir
    if (window.portfolioApp?.managers?.navigation) {
      window.portfolioApp.managers.navigation.setModalState(false);
    }

    // Slayt gösterisini durdur
    this.pauseSlideshow();

    // Event listener'ları temizle
    window.removeEventListener('keydown', this.keydownHandler);

    // ✅ THUMBNAIL SCROLL LISTENER'I BURADA KALDIR
    if (this.elements.thumbsContainer) {
      this.elements.thumbsContainer.removeEventListener('wheel', this.boundHandlers.handleThumbnailScroll);
    }

    this.cleanupHandlers.forEach(cleanup => cleanup?.());
    this.cleanupHandlers = [];

    // Scroll'u geri yükle
    document.body.style.cssText = '';
    window.scrollTo({
      top: state.modal.savedScrollPosition,
      behavior: 'instant'
    });

    // URL'yi temizle
    const hash = window.location.hash;
    if (hash.startsWith('#projects/')) {
      history.replaceState({}, '', '#projects');
    }

    // Kart referansını temizle
    this.elements.image = null; // Temizle
    this.currentCard = null;
  }

  // Event listener temizleme
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
      // Sürükleme engelleyici event listener'ları temizle
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
    this.isModalOpen = false; // Modal durumu tracking

    this.initializeElements();
    this.bindEvents();
    this.initScrollHeaderEffect();
  }


  initializeElements() {
    this.elements = {
      mobileToggle: DOMUtils.$('.mobile-menu-toggle'),
      navLinks: DOMUtils.$$('.nav-link'),
      internalLinks: DOMUtils.$$('a[href^="#"]'),
      scrollToTop: DOMUtils.$('.scroll-to-top'),
      header: DOMUtils.$('.site-header')
    };
  }

  bindEvents() {
    // Mobile menu toggle
    const mobileToggleHandler = () => this.toggleMobileMenu();
    this.boundHandlers.set('mobileToggle', mobileToggleHandler);
    this.elements.mobileToggle?.addEventListener('click', mobileToggleHandler);

    // Navigasyon linkleri
    this.elements.navLinks.forEach(link => {
      const handler = () => this.closeMobileMenu();
      link.addEventListener('click', handler);
      this.boundHandlers.set(link, handler);
    });

    // Dışarı tıklama
    const outsideClickHandler = (e) => this.handleOutsideClick(e);
    this.boundHandlers.set('outsideClick', outsideClickHandler);
    document.addEventListener('click', outsideClickHandler);

    this.initSmoothScrolling();
    this.initScrollHandling();
  }

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

  setActiveLink(activeLink) {
    this.elements.navLinks.forEach(link => link.classList.remove('active'));
    activeLink.classList.add('active');
  }

  initSmoothScrolling() {
    this.elements.internalLinks.forEach(link => {
      // Modal butonlarını atla
      if (link.closest('.modal-buttons')) return;

      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href');

        if (targetId && targetId !== '#') {
          // Programmatik navigasyon başladığını işaretle
          this.isNavigating = true;

          Utils.smoothScrollTo(targetId, () => {
            // Animasyon bittiğinde URL'yi güncelle
            history.pushState(null, null, targetId);

            // Programmatik navigasyon bittiğini işaretle
            setTimeout(() => {
              this.isNavigating = false;
            }, 100);
          });
        }
      });
    });

    // Scroll to top butonu - GÜVENLİ TARGET
    this.elements.scrollToTop?.addEventListener('click', () => {
      this.isNavigating = true;

      // document.documentElement daha güvenli
      const target = document.documentElement || document.body;

      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });

      // Navigasyon bittiğini işaretle
      setTimeout(() => {
        this.isNavigating = false;
      }, CONFIG.scrollAnimation.duration + 100);
    });
  }

  initScrollHeaderEffect() {
    let ticking = false;

    const updateHeader = () => {
      // Modal açıkken scroll position'ı state'ten al
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
      // Modal açıkken scroll event'lerini ignore et
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

  initScrollHandling() {
    const scrollHandler = Utils.throttle(() => {
      // Modal açıkken navigation güncellemelerini de durdur
      if (this.isModalOpen) return;

      this.updateActiveNavOnScroll();
      this.updateScrollToTopVisibility();
    }, 100);

    window.addEventListener('scroll', scrollHandler, { passive: true });
    this.scrollHandlers.add(scrollHandler);
  }

  // Modal açıldığında çağrılacak
  setModalState(isOpen) {
    this.isModalOpen = isOpen;

    if (isOpen) {
      // Modal açıldığında header state'ini manuel güncelle
      const scrollY = state.modal?.savedScrollPosition || 0;
      if (scrollY > 1) {
        this.elements.header?.classList.add('scrolled');
      } else {
        this.elements.header?.classList.remove('scrolled');
      }
    }
    // Modal kapandığında scroll handler'lar zaten aktif olacak
  }

  updateActiveNavOnScroll() {
    // İSTEĞE BAĞLI: isNavigating kontrolü eklenebilir
    // if (this.isNavigating) return;

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

  // CLEANUP METODU EKLENMELİ
  destroy() {
    // Mobile toggle cleanup
    const mobileToggleHandler = this.boundHandlers.get('mobileToggle');
    if (mobileToggleHandler && this.elements.mobileToggle) {
      this.elements.mobileToggle.removeEventListener('click', mobileToggleHandler);
    }

    // Nav links cleanup
    this.elements.navLinks.forEach(link => {
      const handler = this.boundHandlers.get(link);
      if (handler) {
        link.removeEventListener('click', handler);
      }
    });

    // Document click cleanup
    const outsideClickHandler = this.boundHandlers.get('outsideClick');
    if (outsideClickHandler) {
      document.removeEventListener('click', outsideClickHandler);
    }

    // Scroll handlers cleanup
    this.scrollHandlers.forEach(handler => {
      window.removeEventListener('scroll', handler);
    });
    this.scrollHandlers.clear();
    this.boundHandlers.clear();

    console.log('NavigationManager tamamen temizlendi');
  }
}

// =================== ANIMATION MODULE ===================
class AnimationManager {
  constructor() {
    this.initializeElements();
  }

  initializeElements() {
    this.elements = {
      professionText: DOMUtils.$('#profession-text'),
      yearSpan: DOMUtils.$('#current-year')
    };
  }

  initTypewriter() {
    if (!this.elements.professionText) return;

    const professions = [
      'Web Developer',
      'UI/UX Designer',
      'Graphic Designer',
      'Content Creator',
      'Software Engineer'
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

  updateCopyrightYear() {
    if (this.elements.yearSpan) {
      this.elements.yearSpan.textContent = new Date().getFullYear();
    }
  }

  initScrollRevealAnimations() {
    const sectionsToReveal = DOMUtils.$$('section#about, section#skills, section#projects, section#contact');
    if (!sectionsToReveal || sectionsToReveal.length === 0) {
      console.warn('Reveal animasyonu için hedeflenecek bölüm bulunamadı.');
      return;
    }

    // Her bölüm için farklı ayarlar
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
            // 1. Önce transition sınıfını ekle
            section.classList.add('reveal-transition');

            // 2. Bir frame bekle, sonra visible sınıfını ekle
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

    // Her bölüm için ayrı observer oluştur
    sectionsToReveal.forEach(section => {
      const sectionId = section.id;
      const config = sectionConfigs[sectionId] || { rootMargin: '0px 0px -15% 0px', threshold: 0.05 };

      const observer = new IntersectionObserver(revealCallback, {
        root: null,
        rootMargin: config.rootMargin,
        threshold: config.threshold
      });

      // Başlangıçta sadece reveal-section sınıfını ekle (transition yok)
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

  // ✅ Modal referansını ayarla
  setModalManager(modalManager) {
    this.modalManager = modalManager;
  }

  bindEvents() {
    window.addEventListener('popstate', (e) => this.handlePopState(e));
    this.handleInitialRoute();
  }

  handleInitialRoute() {
    const hash = window.location.hash;

    // Sayfa yenilendiğinde modal hash'i varsa temizle
    if (hash.startsWith('#projects/')) {
      // Hash'i temizle ve modal'ı kapalı tut
      history.replaceState(null, null, window.location.pathname + window.location.search);

      // Modal açıksa kapat
      const modalOverlay = DOMUtils.$('.modal-overlay');
      if (modalOverlay) {
        modalOverlay.style.display = 'none';
        document.body.style.cssText = '';
      }

      // Sayfa başına git
      window.scrollTo(0, 0);
      return;
    }
  }

  handlePopState(e) {
    // ✅ Global referans veya instance referansı kullan
    const modal = this.modalManager || window.modalManager;

    if (e.state?.slug) {
      const { slug, scrollY = 0 } = e.state;
      state.modal.savedScrollPosition = scrollY;

      // ✅ DÜZELTME: 'modal' değişkenini kullan
      if (modal?.elements.overlay.style.display !== 'flex') {
        this.openProjectModal(slug, false);
      }
    } else if (modal?.elements.overlay.style.display === 'flex') {
      // ✅ DÜZELTME: 'modal' değişkenini kullan
      modal.close();
    }
  }

  openProjectModal(slug, useDelay = true) {
    const card = state.cards.find(c => c.dataset.projectSlug === slug);
    const modal = this.modalManager || window.modalManager;

    if (card && modal) {
      // ✅ DÜZELTME: 'modal' değişkenini kullan
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

  async init() {
    try {
      // Scroll geri yüklemeyi devre dışı bırak
      this.setupScrollRestoration();

      // Manager'ları başlat
      await this.initializeManagers();

      // Başlangıç verilerini yükle
      this.loadInitialData();

      // Global event listener'ları ayarla
      this.setupGlobalEvents();

      this.isInitialized = true;
      console.log('Portfolio uygulaması başarıyla başlatıldı');

    } catch (error) {
      console.error('Uygulama başlatılırken hata:', error);
      this.handleCriticalError(error);
    }
  }

  setupScrollRestoration() {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    // Hash temizleme - tüm hashları temizle (modal hashları dahil)
    if (window.location.hash) {
      history.replaceState(null, null, window.location.pathname + window.location.search);
    }

    // Modal açıksa kapat
    const modalOverlay = DOMUtils.$('.modal-overlay');
    if (modalOverlay && modalOverlay.style.display === 'flex') {
      modalOverlay.style.display = 'none';
      // Body scroll kilidini kaldır
      document.body.style.cssText = '';
    }

    // Sayfa başına git
    window.scrollTo(0, 0);
  }

  async initializeManagers() {
    // Önce Modal'ı oluştur
    this.managers.modal = new ModalManager();

    // Sonra CardManager'a referans ver
    this.managers.cards = new CardManager();
    this.managers.cards.setModalManager(this.managers.modal);

    // Diğerleri
    this.managers.navigation = new NavigationManager();
    this.managers.animation = new AnimationManager();
    this.managers.routes = new RouteManager();

    // ✅ RouteManager'a da modal referansı ver
    this.managers.routes.setModalManager(this.managers.modal);

    // Global erişim için
    window.cardManager = this.managers.cards;
    window.modalManager = this.managers.modal;
  }

  loadInitialData() {
    // Kartları oluştur
    this.managers.cards.createCards();

    // Animasyonları başlat
    this.managers.animation.initTypewriter();
    this.managers.animation.updateCopyrightYear();
    this.managers.animation.initScrollRevealAnimations(); // Yeni scroll animasyonlarını başlat

    // Navigasyon durumunu ayarla
    this.managers.navigation.setInitialActiveState();
  }

  setupGlobalEvents() {
    // Resize olayları
    window.addEventListener('resize', Utils.debounce(() => {
      if (state.currentPage) {
        this.managers.cards.showPage(state.currentPage);
      }
    }, 200));

    // Sayfa kapatılmadan önce temizlik
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });

    // Hata yakalama
    window.addEventListener('error', (e) => {
      console.error('Global hata yakalandı:', {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        error: e.error
      });

      // Critical error'se fallback mode'a geç
      if (e.error?.name === 'TypeError' && e.message.includes('modalManager')) {
        this.handleCriticalError(e.error);
      }
    });

    window.addEventListener('unhandledrejection', (e) => {
      console.error('İşlenmemiş promise reddi:', e.reason);
      e.preventDefault(); // Prevent console error
    });
  }

  handleCriticalError(error) {
    try {
      // Acil durum: Temel işlevselliği geri yükle
      console.log('🔧 Acil durum moduna geçiliyor...');

      // Animasyonları kaldır
      document.querySelectorAll('.hide, .reveal-section, .reveal-item').forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'none';
        el.classList.remove('hide');
      });

      // Temel kart gösterimi
      if (cardsData?.length && this.managers.cards) {
        this.managers.cards.createCards();
      }

      // Temel navigasyon
      if (this.managers.navigation) {
        this.managers.navigation.initSmoothScrolling();
      }

      AccessibilityManager.announceToScreenReader('Application loaded in fallback mode', 'assertive');

    } catch (fallbackError) {
      console.error('❌ Acil durum modu bile başarısız:', fallbackError);
    }
  }

  cleanup() {
    console.log('🧹 Uygulama temizleniyor...');

    // State'i temizle
    state.clearAllTimers();
    state.reset();

    // DOM cache'ini temizle
    DOMUtils.cache.clear();

    console.log('✅ Temizlik tamamlandı');
  }

  // Public API
  getState() {
    return { ...state };
  }

  getManager(name) {
    return this.managers[name];
  }
}

// =================== APPLICATION INITIALIZATION ===================
const app = new PortfolioApp();

// Global erişim
window.portfolioApp = app;
window.appState = state;

// DOM hazır olduğunda başlat
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

// Export for potential module usage
export { PortfolioApp, state };