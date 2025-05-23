/**
 * Portfolio Cards - Main JavaScript
 *
 * This script handles the dynamic portfolio cards display, filtering,
 * modal interactions, and navigation functionality.
 */

// =================== IMPORTS ===================
import { cardsData } from "./cardsData.js";

// =================== CONFIG ===================
const CONFIG = {
  // Card settings
  cardsPerPage: 6,
  fallbackImage: "./assets/images/default.png",

  // Modal settings
  autoSlideInterval: 3000,
  resumeSlideTimeout: 2000,

  // Navigation
  scrollOffset: 80,

  // Animation
  typewriterSpeed: 100,
  typewriterDeleteSpeed: 50,
  typewriterPause: 1500,
  typewriterDelay: 300,

  // Performance
  debounceDelay: 150,
  animationStaggerDelay: 100,

  // Scroll settings
  scrollAttempts: 3,
  scrollInterval: 100,
};

// =================== APP STATE ===================
const AppState = {
  // Cards
  cards: [],
  filteredCards: [],
  currentPage: 1,

  // Modal
  modalImageList: [],
  currentImageIndex: 0,
  autoSlideInterval: null,
  isSlideHeld: false,
  resumeTimeout: null,
  savedScrollPosition: 0,

  // Scroll
  isScrolling: false,
  scrollTimeout: null,

  // Reset all state
  reset() {
    this.cards = [];
    this.filteredCards = [];
    this.currentPage = 1;
    this.modalImageList = [];
    this.currentImageIndex = 0;
    this.isSlideHeld = false;
    this.isScrolling = false;
    clearInterval(this.autoSlideInterval);
    clearTimeout(this.resumeTimeout);
    clearTimeout(this.scrollTimeout);
  },
};

// =================== DOM ELEMENTS ===================
const DOM = {
  // Core elements
  body: document.body,

  // Navigation
  mobileMenuToggle: document.querySelector(".mobile-menu-toggle"),
  navLinks: document.querySelectorAll(".nav-link"),
  internalLinks: document.querySelectorAll('a[href^="#"]'),
  scrollToTopBtn: document.querySelector(".scroll-to-top"),

  // Cards & Filtering
  filterButtons: document.querySelectorAll(".filter-btn"),
  cardsGrid: document.querySelector(".cards-grid"),
  paginationContainer: document.querySelector(".pagination"),

  // Modal elements
  modalOverlay: document.querySelector(".modal-overlay"),
  modalImg: document.querySelector(".modal-img"),
  modalTitle: document.querySelector(".modal-title"),
  modalTags: document.querySelector(".modal-tags"),
  modalDescription: document.querySelector(".modal-description"),
  modalClose: document.querySelector(".modal-close"),
  prevBtn: document.querySelector(".gallery-nav.prev"),
  nextBtn: document.querySelector(".gallery-nav.next"),
  modalBtn1: document.querySelector(".modal-buttons a:nth-child(1)"),
  modalBtn2: document.querySelector(".modal-buttons a:nth-child(2)"),
  thumbsWrapper: document.querySelector(".modal-thumbs"),

  // Animation elements
  professionText: document.getElementById("profession-text"),
  yearSpan: document.getElementById("current-year"),

  // Lazily initialize and cache selectors that might not be available immediately
  getElements(selector) {
    return document.querySelectorAll(selector);
  },

  getElement(selector) {
    return document.querySelector(selector);
  },
};

// =================== HELPER FUNCTIONS ===================
const Helpers = {
  /**
   * Creates pagination dots element
   */
  createDots() {
    const dots = document.createElement("span");
    dots.textContent = "…";
    dots.className = "pagination-dots";
    return dots;
  },

  /**
   * Traps focus within a modal for accessibility
   */
  trapFocus(element) {
    const focusable = element.querySelectorAll(
      'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    element.addEventListener("keydown", this.handleFocusTrap);

    // Store references for cleanup
    element.focusTrapData = { first, last };
  },

  /**
   * Event handler for focus trap navigation
   */
  handleFocusTrap(e) {
    if (e.key !== "Tab") return;

    const { first, last } = e.currentTarget.focusTrapData || {};
    if (!first || !last) return;

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  },

  /**
   * Removes focus trap event listeners
   */
  removeFocusTrap(element) {
    if (element) {
      element.removeEventListener("keydown", this.handleFocusTrap);
      element.focusTrapData = null;
    }
  },

  /**
   * Debounce function for performance optimization
   */
  debounce(func, delay = CONFIG.debounceDelay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  },

  /**
   * Safely parse JSON with error handling
   */
  safeJSONParse(str, fallback = {}) {
    try {
      return JSON.parse(str);
    } catch (err) {
      console.error("JSON parsing error:", err);
      return fallback;
    }
  },

  /**
   * Log errors with consistent formatting
   */
  logError(component, message, error) {
    console.error(`[${component}] ${message}`, error);
  },
};

// =================== CARD MODULE ===================
const CardModule = {
  /**
   * Creates cards from data and adds them to the grid
   */
  createCards() {
    try {
      if (!DOM.cardsGrid) return;

      DOM.cardsGrid.innerHTML = "";
      const fragment = document.createDocumentFragment();

      cardsData.forEach((item) => {
        const card = document.createElement("div");
        card.className = "card-item";
        card.dataset.category = item.category;
        card.dataset.images = (
          item.images.length > 0 ? item.images : [CONFIG.fallbackImage]
        ).join(",");
        card.dataset.projectSlug = item.slug;

        const links = item.links
          .map(
            (link) =>
              `<a href="${link.url}" target="_blank" class="card-link-item">
              <i class="${link.icon}"></i>
            </a>`
          )
          .join("");

        card.innerHTML = `
          <div class="card-image">
            <img src="${item.images[0] || CONFIG.fallbackImage}" alt="${
          item.title
        }" loading="lazy" />
            <div class="card-overlay">
              <div class="card-links">${links}</div>
            </div>
          </div>
          <div class="card-info">
            <h3 class="card-title">${item.title}</h3>
            <p class="card-tags">${item.tags}</p>
            <p class="card-description">${item.description}</p>
            <button class="view-details-btn">View Details</button>
          </div>`;

        fragment.appendChild(card);
      });

      DOM.cardsGrid.appendChild(fragment);
      AppState.cards = Array.from(document.querySelectorAll(".card-item"));
      AppState.filteredCards = [...AppState.cards];
    } catch (error) {
      Helpers.logError("CardModule", "Error creating cards:", error);
    }
  },

  /**
   * Filters cards by category
   */
  filterCards(filter) {
    try {
      AppState.filteredCards = AppState.cards.filter(
        (card) => filter === "all" || card.dataset.category === filter
      );

      AppState.currentPage = 1;
      this.renderPagination();
      this.showPage(1);
    } catch (error) {
      Helpers.logError("CardModule", "Error filtering cards:", error);
      // Fallback to showing all cards
      AppState.filteredCards = [...AppState.cards];
      this.showPage(1);
    }
  },

  /**
   * Shows cards for current page
   */
  showPage(page) {
    try {
      AppState.cards.forEach((card) => {
        card.style.display = "none";
        card.classList.add("hide");
      });

      const start = (page - 1) * CONFIG.cardsPerPage;
      AppState.filteredCards
        .slice(start, start + CONFIG.cardsPerPage)
        .forEach((card, index) => {
          card.style.display = "flex";
          // Staggered animation for smoother appearance
          setTimeout(() => card.classList.remove("hide"), 50 + index * 20);
        });
    } catch (error) {
      Helpers.logError("CardModule", "Error showing page:", error);
    }
  },

  /**
   * Renders pagination controls
   */
  renderPagination() {
    try {
      if (!DOM.paginationContainer) return;

      const total = Math.ceil(
        AppState.filteredCards.length / CONFIG.cardsPerPage
      );
      DOM.paginationContainer.innerHTML = "";

      // No pagination needed if only one page
      if (total <= 1) return;

      // Add previous button
      this.addPaginationButton(
        '<i class="fas fa-chevron-left"></i>',
        AppState.currentPage === 1,
        () => {
          if (AppState.currentPage > 1) {
            AppState.currentPage--;
            this.showPage(AppState.currentPage);
            this.renderPagination();
          }
        }
      );

      // Calculate page numbers to show
      const maxPages = 3;
      let start = Math.max(1, AppState.currentPage - Math.floor(maxPages / 2));
      let end = Math.min(total, start + maxPages - 1);

      if (end - start + 1 < maxPages) {
        start = Math.max(1, end - maxPages + 1);
      }

      // Add first page + dots if needed
      if (start > 1) {
        this.addPageButton(1);
        if (start > 2) DOM.paginationContainer.append(Helpers.createDots());
      }

      // Add page numbers
      for (let i = start; i <= end; i++) {
        this.addPageButton(i);
      }

      // Add dots + last page if needed
      if (end < total) {
        if (end < total - 1)
          DOM.paginationContainer.append(Helpers.createDots());
        this.addPageButton(total);
      }

      // Add next button
      this.addPaginationButton(
        '<i class="fas fa-chevron-right"></i>',
        AppState.currentPage === total,
        () => {
          if (AppState.currentPage < total) {
            AppState.currentPage++;
            this.showPage(AppState.currentPage);
            this.renderPagination();
          }
        }
      );
    } catch (error) {
      Helpers.logError("CardModule", "Error rendering pagination:", error);
    }
  },

  /**
   * Adds a pagination button
   */
  addPaginationButton(html, disabled, callback) {
    const button = document.createElement("button");
    button.innerHTML = html;
    button.className = "page-btn";
    button.disabled = disabled;
    button.setAttribute("aria-disabled", disabled ? "true" : "false");
    button.onclick = callback;
    DOM.paginationContainer.appendChild(button);
    return button;
  },

  /**
   * Adds a page number button
   */
  addPageButton(number) {
    const button = document.createElement("button");
    button.textContent = number;
    button.className = "page-btn";
    button.setAttribute("aria-label", `Sayfa ${number}`);

    if (number === AppState.currentPage) {
      button.classList.add("active");
      button.setAttribute("aria-current", "page");
    }

    button.onclick = () => {
      AppState.currentPage = number;
      this.showPage(number);
      this.renderPagination();
    };

    DOM.paginationContainer.appendChild(button);
    return button;
  },

  /**
   * Initialize card event listeners using event delegation
   */
  initCardEvents() {
    try {
      // Use event delegation for better performance
      if (DOM.cardsGrid) {
        DOM.cardsGrid.addEventListener("click", (e) => {
          const detailsBtn = e.target.closest(".view-details-btn");
          if (detailsBtn) {
            ModalModule.openModalFromCard(detailsBtn.closest(".card-item"));
          }
        });
      }
    } catch (error) {
      Helpers.logError("CardModule", "Error initializing card events:", error);
    }
  },
};

// =================== MODAL MODULE ===================
const ModalModule = {
  // Store bound handlers for proper event cleanup
  boundHandlers: {
    keydownHandler: null,
    pauseSlide: null,
    handleMouseUp: null,
  },

  /**
   * Initialize the modal system
   */
  init() {
    try {
      // Bind event handlers once to allow proper removal
      this.boundHandlers.keydownHandler = this.handleKeydown.bind(this);
      this.boundHandlers.pauseSlide = this.pauseSlide.bind(this);
      this.boundHandlers.handleMouseUp = this.handleMouseUp.bind(this);

      // Set up main modal event listeners
      this.setupModalEvents();
    } catch (error) {
      Helpers.logError("ModalModule", "Error initializing modal:", error);
    }
  },

  /**
   * Open modal from a card element
   */
  openModalFromCard(card) {
    try {
      if (!card || !DOM.modalOverlay) return;

      // Set up modal data
      AppState.modalImageList = card.dataset.images.split(",");
      AppState.currentImageIndex = 0;
      AppState.savedScrollPosition = window.scrollY;

      // Update modal content
      this.updateModalContent(card);
      this.buildThumbs();

      // Show modal
      DOM.modalOverlay.style.display = "flex";

      // Disable body scrolling but keep position
      DOM.body.style.overflow = "hidden";
      DOM.body.style.position = "fixed";
      DOM.body.style.top = `-${AppState.savedScrollPosition}px`;
      DOM.body.style.width = "100%";

      // Set up modal interactions
      this.startSlide();
      this.setupImagePauseEvents();
      Helpers.trapFocus(DOM.modalOverlay);

      // Add keyboard navigation
      window.addEventListener("keydown", this.boundHandlers.keydownHandler);

      // Update URL
      const slug = card.dataset.projectSlug;
      history.replaceState(
        { slug, scrollY: AppState.savedScrollPosition },
        "",
        `#projects/${slug}`
      );

      // Set focus to close button for accessibility
      setTimeout(() => {
        DOM.modalClose?.focus();
      }, 100);
    } catch (error) {
      Helpers.logError("ModalModule", "Error opening modal:", error);
    }
  },

  /**
   * Update modal content with card data
   */
  updateModalContent(card) {
    try {
      if (!DOM.modalImg || !card) return;

      DOM.modalImg.src = AppState.modalImageList[AppState.currentImageIndex];
      DOM.modalImg.alt =
        card.querySelector(".card-title")?.textContent || "Project image";

      if (DOM.modalTitle) {
        DOM.modalTitle.textContent =
          card.querySelector(".card-title")?.textContent || "";
      }

      if (DOM.modalTags) {
        DOM.modalTags.textContent =
          card.querySelector(".card-tags")?.textContent || "";
      }

      if (DOM.modalDescription) {
        DOM.modalDescription.textContent =
          card.querySelector(".card-description")?.textContent || "";
      }

      // Set up links
      const links = card.querySelectorAll(".card-link-item");
      if (DOM.modalBtn1 && links[0]) {
        DOM.modalBtn1.href = links[0].href || "#";
        DOM.modalBtn1.setAttribute(
          "aria-label",
          `Live Demo for ${DOM.modalTitle.textContent}`
        );
      }

      if (DOM.modalBtn2 && links[1]) {
        DOM.modalBtn2.href = links[1].href || "#";
        DOM.modalBtn2.setAttribute(
          "aria-label",
          `Source Code for ${DOM.modalTitle.textContent}`
        );
      }

      this.highlightThumb(AppState.currentImageIndex);
    } catch (error) {
      Helpers.logError("ModalModule", "Error updating modal content:", error);
    }
  },

  /**
   * Build thumbnail images
   */
  buildThumbs() {
    try {
      if (!DOM.thumbsWrapper) return;

      DOM.thumbsWrapper.innerHTML = "";
      const fragment = document.createDocumentFragment();

      AppState.modalImageList.forEach((src, i) => {
        const thumb = document.createElement("img");
        thumb.src = src;
        thumb.loading = "lazy";
        thumb.className = "modal-thumb";
        thumb.dataset.index = i;
        thumb.setAttribute(
          "aria-label",
          `Image ${i + 1} of ${AppState.modalImageList.length}`
        );
        thumb.setAttribute("role", "tab");
        thumb.setAttribute("tabindex", "0");
        thumb.setAttribute(
          "aria-selected",
          i === AppState.currentImageIndex ? "true" : "false"
        );

        thumb.onclick = () => this.switchToImage(i);

        // Add keyboard accessibility
        thumb.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            this.switchToImage(i);
          }
        });

        fragment.appendChild(thumb);
      });

      DOM.thumbsWrapper.appendChild(fragment);
      this.highlightThumb(AppState.currentImageIndex);
    } catch (error) {
      Helpers.logError("ModalModule", "Error building thumbnails:", error);
    }
  },

  /**
   * Switch to a specific image
   */
  switchToImage(index) {
    this.pauseSlide();
    AppState.currentImageIndex = index;

    if (DOM.modalImg) {
      DOM.modalImg.src = AppState.modalImageList[index];
    }

    this.highlightThumb(index);

    clearTimeout(AppState.resumeTimeout);
    AppState.resumeTimeout = setTimeout(
      () => this.resumeSlide(),
      CONFIG.resumeSlideTimeout
    );
  },

  /**
   * Highlight the active thumbnail
   */
  highlightThumb(index) {
    try {
      if (!DOM.thumbsWrapper) return;

      DOM.thumbsWrapper.querySelectorAll(".modal-thumb").forEach((thumb) => {
        const isActive = Number(thumb.dataset.index) === index;
        thumb.classList.toggle("active", isActive);
        thumb.setAttribute("aria-selected", isActive ? "true" : "false");
      });
    } catch (error) {
      Helpers.logError("ModalModule", "Error highlighting thumbnail:", error);
    }
  },

  /**
   * Start automatic slideshow
   */
  startSlide() {
    clearInterval(AppState.autoSlideInterval);
    AppState.autoSlideInterval = setInterval(
      () => this.nextImage(),
      CONFIG.autoSlideInterval
    );
  },

  /**
   * Pause automatic slideshow
   */
  pauseSlide() {
    AppState.isSlideHeld = true;
    clearInterval(AppState.autoSlideInterval);
  },

  /**
   * Resume automatic slideshow
   */
  resumeSlide() {
    if (DOM.modalOverlay.style.display === "flex" && AppState.isSlideHeld) {
      AppState.isSlideHeld = false;
      this.startSlide();
    }
  },

  /**
   * Go to next image
   */
  nextImage() {
    try {
      AppState.currentImageIndex =
        (AppState.currentImageIndex + 1) % AppState.modalImageList.length;

      if (DOM.modalImg) {
        DOM.modalImg.src = AppState.modalImageList[AppState.currentImageIndex];
      }

      this.highlightThumb(AppState.currentImageIndex);
    } catch (error) {
      Helpers.logError("ModalModule", "Error navigating to next image:", error);
    }
  },

  /**
   * Go to previous image
   */
  prevImage() {
    try {
      AppState.currentImageIndex =
        (AppState.currentImageIndex - 1 + AppState.modalImageList.length) %
        AppState.modalImageList.length;

      if (DOM.modalImg) {
        DOM.modalImg.src = AppState.modalImageList[AppState.currentImageIndex];
      }

      this.highlightThumb(AppState.currentImageIndex);
    } catch (error) {
      Helpers.logError(
        "ModalModule",
        "Error navigating to previous image:",
        error
      );
    }
  },

  /**
   * Set up events to pause/resume slideshow on image interaction
   */
  setupImagePauseEvents() {
    try {
      if (!DOM.modalImg) return;

      // Remove any existing listeners
      this.cleanupImagePauseEvents();

      // Add new listeners
      DOM.modalImg.addEventListener("mousedown", this.boundHandlers.pauseSlide);
      DOM.modalImg.addEventListener(
        "mouseup",
        this.boundHandlers.handleMouseUp
      );
      DOM.modalImg.addEventListener(
        "mouseleave",
        this.boundHandlers.handleMouseUp
      );
      DOM.modalImg.addEventListener(
        "touchstart",
        this.boundHandlers.pauseSlide
      );
      DOM.modalImg.addEventListener(
        "touchend",
        this.boundHandlers.handleMouseUp
      );
      DOM.modalImg.addEventListener(
        "touchcancel",
        this.boundHandlers.handleMouseUp
      );
    } catch (error) {
      Helpers.logError("ModalModule", "Error setting up image events:", error);
    }
  },

  /**
   * Handle mouse/touch up to resume slideshow
   */
  handleMouseUp() {
    clearTimeout(AppState.resumeTimeout);
    AppState.resumeTimeout = setTimeout(() => this.resumeSlide(), 1000);
  },

  /**
   * Handle keyboard events for modal
   */
  handleKeydown(e) {
    // Close on Escape
    if (e.key === "Escape") this.closeModal();

    // Navigation with arrow keys when modal is open
    if (DOM.modalOverlay.style.display === "flex") {
      if (e.key === "ArrowLeft") {
        this.handleNavigation(this.prevImage.bind(this));
      }

      if (e.key === "ArrowRight") {
        this.handleNavigation(this.nextImage.bind(this));
      }
    }
  },

  /**
   * Handle navigation actions with consistent behavior
   */
  handleNavigation(navigationFunction) {
    this.pauseSlide();
    navigationFunction();
    clearTimeout(AppState.resumeTimeout);
    AppState.resumeTimeout = setTimeout(
      () => this.resumeSlide(),
      CONFIG.resumeSlideTimeout
    );
  },

  /**
   * Clean up event listeners when modal closes
   */
  cleanupImagePauseEvents() {
    try {
      if (!DOM.modalImg) return;

      DOM.modalImg.removeEventListener(
        "mousedown",
        this.boundHandlers.pauseSlide
      );
      DOM.modalImg.removeEventListener(
        "mouseup",
        this.boundHandlers.handleMouseUp
      );
      DOM.modalImg.removeEventListener(
        "mouseleave",
        this.boundHandlers.handleMouseUp
      );
      DOM.modalImg.removeEventListener(
        "touchstart",
        this.boundHandlers.pauseSlide
      );
      DOM.modalImg.removeEventListener(
        "touchend",
        this.boundHandlers.handleMouseUp
      );
      DOM.modalImg.removeEventListener(
        "touchcancel",
        this.boundHandlers.handleMouseUp
      );
    } catch (error) {
      Helpers.logError("ModalModule", "Error cleaning up image events:", error);
    }
  },

  closeModal() {
    try {
      if (!DOM.modalOverlay) return;

      DOM.modalOverlay.style.display = "none";
      clearInterval(AppState.autoSlideInterval);
      AppState.isSlideHeld = false;
      this.cleanupImagePauseEvents();

      window.removeEventListener("keydown", this.boundHandlers.keydownHandler);
      Helpers.removeFocusTrap(DOM.modalOverlay);

      // Scroll'u geri yüklemeden önce stil sıfırla
      DOM.body.style.overflow = "";
      DOM.body.style.position = "";
      DOM.body.style.top = "";
      DOM.body.style.width = "";

      // Scroll pozisyonunu restore et
      window.scrollTo({
        top: AppState.savedScrollPosition,
        behavior: "instant",
      });

      // 🔽 Hash yalnızca `#projects/some-slug` ise `#projects` olarak bırakılır
      const hash = window.location.hash;
      if (hash.startsWith("#projects/")) {
        history.replaceState({}, "", "#projects");
      } else {
        // Diğer tüm durumlarda tamamen temizle
        history.replaceState(
          {},
          "",
          window.location.pathname + window.location.search
        );
      }

      // Odak yönetimi
      const activeCardSlug = AppState.cards.find(
        (card) => card.dataset.projectSlug === window.location.hash.slice(10)
      );
      if (activeCardSlug) {
        const btn = activeCardSlug.querySelector(".view-details-btn");
        if (btn) btn.focus();
      }
    } catch (error) {
      Helpers.logError("ModalModule", "Error closing modal:", error);

      if (DOM.modalOverlay) DOM.modalOverlay.style.display = "none";

      DOM.body.style.overflow = "";
      DOM.body.style.position = "";
      window.scrollTo(0, 0);
    }
  },

  /**
   * Set up modal navigation events
   */
  setupModalEvents() {
    try {
      // Close button
      if (DOM.modalClose) {
        DOM.modalClose.addEventListener("click", () => this.closeModal());
      }

      // Navigation buttons
      if (DOM.prevBtn) {
        DOM.prevBtn.addEventListener("click", () => {
          this.handleNavigation(this.prevImage.bind(this));
        });
      }

      if (DOM.nextBtn) {
        DOM.nextBtn.addEventListener("click", () => {
          this.handleNavigation(this.nextImage.bind(this));
        });
      }
    } catch (error) {
      Helpers.logError("ModalModule", "Error setting up modal events:", error);
    }
  },
};

// =================== NAVIGATION MODULE ===================
const NavigationModule = {
  // Store bound handlers
  boundHandlers: {
    scrollHandler: null,
    documentClickHandler: null,
  },

  /**
   * Initialize navigation functionality
   */
  initNavigation() {
    try {
      // Bind handlers once for proper cleanup
      this.boundHandlers.scrollHandler = Helpers.debounce(
        this.handleScroll.bind(this)
      );
      this.boundHandlers.documentClickHandler =
        this.handleDocumentClick.bind(this);

      // Mobile menu toggle
      if (DOM.mobileMenuToggle) {
        DOM.mobileMenuToggle.addEventListener("click", () => {
          const isExpanded = DOM.body.classList.contains("mobile-menu-open");
          DOM.mobileMenuToggle.setAttribute("aria-expanded", !isExpanded);
          DOM.body.classList.toggle("mobile-menu-open");
        });
      }

      // Navigation links
      DOM.navLinks.forEach((link) => {
        link.addEventListener("click", () => {
          DOM.body.classList.remove("mobile-menu-open");
          if (DOM.mobileMenuToggle) {
            DOM.mobileMenuToggle.setAttribute("aria-expanded", "false");
          }
          DOM.navLinks.forEach((l) => l.classList.remove("active"));
          link.classList.add("active");
        });
      });

      // Close mobile menu when clicking outside
      document.addEventListener(
        "click",
        this.boundHandlers.documentClickHandler
      );

      this.setInitialActiveState();
      this.initScrollHandler();
    } catch (error) {
      Helpers.logError(
        "NavigationModule",
        "Error initializing navigation:",
        error
      );
    }
  },

  /**
   * Handle document clicks for closing mobile menu
   */
  handleDocumentClick(e) {
    if (
      DOM.body.classList.contains("mobile-menu-open") &&
      !e.target.closest(".nav-links") &&
      !e.target.closest(".mobile-menu-toggle")
    ) {
      DOM.body.classList.remove("mobile-menu-open");
      if (DOM.mobileMenuToggle) {
        DOM.mobileMenuToggle.setAttribute("aria-expanded", "false");
      }
    }
  },

  /**
   * Set the initial active state based on URL hash
   */
  setInitialActiveState() {
    try {
      // Handle regular section links
      const hash = window.location.hash.split("/")[0] || "#home";
      const activeLink = document.querySelector(`.nav-link[href="${hash}"]`);

      if (activeLink) {
        DOM.navLinks.forEach((link) => link.classList.remove("active"));
        activeLink.classList.add("active");
      }
    } catch (error) {
      Helpers.logError(
        "NavigationModule",
        "Error setting initial state:",
        error
      );
    }
  },

  /**
   * Initialize scroll event handler for navigation
   */
  initScrollHandler() {
    window.addEventListener("scroll", this.boundHandlers.scrollHandler);
  },

  /**
   * Handle scroll events
   */
  handleScroll() {
    try {
      const scrollPosition = window.scrollY;

      // Update active nav link based on scroll position
      this.updateActiveNavOnScroll(scrollPosition);

      // Toggle scroll-to-top button visibility
      if (DOM.scrollToTopBtn) {
        DOM.scrollToTopBtn.style.display =
          scrollPosition > 300 ? "flex" : "none";
      }
    } catch (error) {
      Helpers.logError("NavigationModule", "Error handling scroll:", error);
    }
  },

  /**
   * Update the active navigation link based on scroll position
   */
  // ...existing code...

  // ...existing code...

  // NavigationModule içindeki updateActiveNavOnScroll fonksiyonunu değiştirin
  updateActiveNavOnScroll(scrollPosition) {
    try {
      // Görünür bölümleri ve görünürlük oranlarını saklamak için dizi
      const visibleSections = [];

      // Tüm bölümleri kontrol et
      document.querySelectorAll("section[id]").forEach((section) => {
        // Bölümün viewport'taki konumunu al
        const rect = section.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        // Bölümün görünürlük oranını hesapla
        let visibleHeight = 0;

        // Bölüm viewport içinde mi?
        if (rect.top < viewportHeight && rect.bottom > 0) {
          // Görünür yüksekliği hesapla (viewport içinde kalan kısım)
          visibleHeight =
            Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);

          // Bölümün görünürlük yüzdesini hesapla
          const visiblePercent = (visibleHeight / viewportHeight) * 100;

          // Görünürlük yüzdesi belirli bir eşiğin üzerindeyse listeye ekle
          if (visiblePercent > 5) {
            // En az %5 görünür olmalı
            visibleSections.push({
              id: section.id,
              visiblePercent: visiblePercent,
              // Bölümün viewport'un üst kısmına yakınlığını ölçmek için
              distanceFromTop: Math.abs(rect.top),
            });
          }
        }
      });

      // Görünür bölüm varsa
      if (visibleSections.length > 0) {
        // Önce görünürlük yüzdesine göre sırala (en yüksek önce)
        visibleSections.sort((a, b) => {
          // Görünürlük yüzdeleri arasındaki fark belirli bir eşikten az ise
          // viewport'un üst kısmına daha yakın olan bölümü tercih et
          const percentDifference = Math.abs(
            a.visiblePercent - b.visiblePercent
          );

          if (percentDifference < 15) {
            return a.distanceFromTop - b.distanceFromTop;
          }

          // Aksi takdirde, en yüksek görünürlük yüzdesine sahip bölümü seç
          return b.visiblePercent - a.visiblePercent;
        });

        // En yüksek görünürlük değerine sahip bölümü kullan
        const mostVisibleSection = "#" + visibleSections[0].id;

        // Aktif nav-link'i güncelle
        const shouldBeActive = document.querySelector(
          `.nav-link[href="${mostVisibleSection}"]`
        );

        if (shouldBeActive && !shouldBeActive.classList.contains("active")) {
          DOM.navLinks.forEach((link) => link.classList.remove("active"));
          shouldBeActive.classList.add("active");

          // URL hash'ini değiştirmek isterseniz (opsiyonel):
          // history.replaceState(null, null, mostVisibleSection);
        }
      }
    } catch (error) {
      Helpers.logError("NavigationModule", "Error updating nav:", error);
    }
  },

  /**
   * Initialize smooth scrolling for internal links
   */
  initSmoothScrolling() {
    try {
      DOM.internalLinks.forEach((link) => {
        // Skip modal buttons
        if (link.closest(".modal-buttons")) {
          return;
        }

        link.addEventListener("click", function (e) {
          e.preventDefault();

          const targetId = this.getAttribute("href");

          if (targetId !== "#") {
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
              window.scrollTo({
                top: targetElement.offsetTop - CONFIG.scrollOffset,
                behavior: "smooth",
              });

              // Update URL but don't trigger navigation
              history.pushState(null, null, targetId);
            }
          }
        });
      });

      // Scroll to top button
      if (DOM.scrollToTopBtn) {
        DOM.scrollToTopBtn.addEventListener("click", () => {
          window.scrollTo({
            top: 0,
            behavior: "smooth",
          });
        });
      }
    } catch (error) {
      Helpers.logError(
        "NavigationModule",
        "Error setting up smooth scrolling:",
        error
      );
    }
  },

  /**
   * Clean up event listeners
   */
  cleanup() {
    document.removeEventListener(
      "click",
      this.boundHandlers.documentClickHandler
    );
    window.removeEventListener("scroll", this.boundHandlers.scrollHandler);
  },
};

// =================== ANIMATION MODULE ===================
const AnimationModule = {
  // Store type effect timeout
  typeEffectTimeout: null,

  /**
   * Initialize typewriter effect
   */
  initTypewriter() {
    try {
      if (!DOM.professionText) return;

      const professions = [
        "Web Developer",
        "UI/UX Designer",
        "Graphic Designer",
        "Content Creator",
        "Software Engineer",
      ];

      let currentProfessionIndex = 0;
      let currentCharIndex = 0;
      let isDeleting = false;
      let typingSpeed = CONFIG.typewriterSpeed;

      const typeEffect = () => {
        const currentProfession = professions[currentProfessionIndex];

        if (isDeleting) {
          // Deleting characters
          DOM.professionText.textContent = currentProfession.substring(
            0,
            currentCharIndex - 1
          );
          currentCharIndex--;
          typingSpeed = CONFIG.typewriterDeleteSpeed;
        } else {
          // Adding characters
          DOM.professionText.textContent = currentProfession.substring(
            0,
            currentCharIndex + 1
          );
          currentCharIndex++;
          typingSpeed = CONFIG.typewriterSpeed;
        }

        // Full word displayed - start deleting
        if (!isDeleting && currentCharIndex === currentProfession.length) {
          isDeleting = true;
          typingSpeed = CONFIG.typewriterPause;
        }
        // Word fully deleted - move to next word
        else if (isDeleting && currentCharIndex === 0) {
          isDeleting = false;
          currentProfessionIndex =
            (currentProfessionIndex + 1) % professions.length;
          typingSpeed = CONFIG.typewriterDelay;
        }

        this.typeEffectTimeout = setTimeout(typeEffect, typingSpeed);
      };

      setTimeout(typeEffect, 1000);
    } catch (error) {
      Helpers.logError(
        "AnimationModule",
        "Error initializing typewriter:",
        error
      );
    }
  },

  /**
   * Update copyright year
   */
  updateCopyrightYear() {
    try {
      if (DOM.yearSpan) {
        DOM.yearSpan.textContent = new Date().getFullYear();
      }
    } catch (error) {
      Helpers.logError(
        "AnimationModule",
        "Error updating copyright year:",
        error
      );
    }
  },

  /**
   * Clean up animation timers
   */
  cleanup() {
    clearTimeout(this.typeEffectTimeout);
  },
};

// =================== ROUTING MODULE ===================
const RoutingModule = {
  /**
   * Initialize routing functionality
   */
  initRouting() {
    try {
      // Check for project hash on load
      const hash = window.location.hash;

      if (hash.startsWith("#projects/")) {
        const slug = hash.slice(10); // Remove "#projects/"
        this.handleProjectRoute(slug);
      }

      // Handle browser back/forward buttons
      window.addEventListener("popstate", this.handlePopState.bind(this));
    } catch (error) {
      Helpers.logError("RoutingModule", "Error initializing routing:", error);
    }
  },

  /**
   * Handle popstate events for browser history navigation
   */
  handlePopState(e) {
    try {
      if (e.state && e.state.slug) {
        const slug = e.state.slug;
        const savedScroll = e.state.scrollY || 0;

        // Only handle if modal is not already open
        if (DOM.modalOverlay.style.display !== "flex") {
          AppState.savedScrollPosition = savedScroll;
          this.handleProjectRoute(slug, false);
        }
      } else {
        // No slug in state, close modal if open
        if (DOM.modalOverlay.style.display === "flex") {
          ModalModule.closeModal();
        }
      }
    } catch (error) {
      Helpers.logError("RoutingModule", "Error handling popstate:", error);
    }
  },

  /**
   * Handle project route - open modal for given slug
   */
  handleProjectRoute(slug, useDelay = true) {
    try {
      const card = AppState.cards.find((c) => c.dataset.projectSlug === slug);

      if (card) {
        const openModal = () => {
          ModalModule.openModalFromCard(card);
        };

        // Add delay when page is loading to ensure all elements are ready
        if (useDelay) {
          setTimeout(openModal, 500);
        } else {
          openModal();
        }
      }
    } catch (error) {
      Helpers.logError("RoutingModule", "Error handling project route:", error);
    }
  },
};

// =================== EVENT LISTENERS ===================
const EventModule = {
  /**
   * Set up filter button event listeners
   */
  setupFilterButtons() {
    try {
      DOM.filterButtons.forEach((button) => {
        if (!button.classList.contains("active")) {
          button.setAttribute("aria-pressed", "false");
        }

        button.addEventListener("click", () => {
          // Update active state
          DOM.filterButtons.forEach((btn) => {
            btn.classList.remove("active");
            btn.setAttribute("aria-pressed", "false");
          });

          button.classList.add("active");
          button.setAttribute("aria-pressed", "true");

          // Filter cards
          CardModule.filterCards(button.dataset.filter);
        });
      });
    } catch (error) {
      Helpers.logError(
        "EventModule",
        "Error setting up filter buttons:",
        error
      );
    }
  },

  /**
   * Set up all event listeners
   */
  setupAllEventListeners() {
    try {
      // Set up filter buttons
      this.setupFilterButtons();

      // Add resize handler for responsive adjustments
      window.addEventListener(
        "resize",
        Helpers.debounce(() => {
          // Recalculate card layout if needed
          if (AppState.currentPage) {
            CardModule.showPage(AppState.currentPage);
          }
        }, 200)
      );
    } catch (error) {
      Helpers.logError(
        "EventModule",
        "Error setting up event listeners:",
        error
      );
    }
  },
};

// =================== SCROLL REVEAL MODULE ===================
const ScrollRevealModule = {
  observers: [],

  /**
   * Initialize scroll reveal functionality
   */
  init() {
    try {
      // Check if IntersectionObserver is supported
      if (!("IntersectionObserver" in window)) {
        this.fallbackReveal();
        return;
      }

      // Get all sections to animate
      const sections = document.querySelectorAll("section");

      // Set up the Intersection Observer
      const observer = new IntersectionObserver(this.handleIntersect, {
        root: null,
        rootMargin: "0px",
        threshold: 0.15, // Trigger when 15% of the section is visible
      });

      // Store observer for cleanup
      this.observers.push(observer);

      // Observe each section
      sections.forEach((section) => {
        observer.observe(section);

        // Hide section content initially
        section.classList.add("reveal-section");

        // Find elements to animate inside section
        const elementsToAnimate = section.querySelectorAll(".reveal-item");
        elementsToAnimate.forEach((el) => {
          // Only add the hidden class if element is not in the viewport
          if (!this.isInViewport(el)) {
            el.classList.add("reveal-hidden");
          }
        });
      });
    } catch (error) {
      Helpers.logError(
        "ScrollRevealModule",
        "Error initializing scroll reveal:",
        error
      );

      // Show everything in case of error
      this.fallbackReveal();
    }
  },

  /**
   * Check if element is in viewport
   */
  isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  },

  /**
   * Fallback method when IntersectionObserver is not available
   */
  fallbackReveal() {
    document.querySelectorAll(".reveal-section, .reveal-item").forEach((el) => {
      el.classList.add("reveal-visible");
      el.classList.remove("reveal-hidden");
    });
  },

  /**
   * Handle intersection events
   */
  handleIntersect(entries, observer) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // Add visible class to section
        entry.target.classList.add("reveal-visible");

        // Animate children with delay
        const elementsToAnimate = entry.target.querySelectorAll(".reveal-item");
        elementsToAnimate.forEach((el, index) => {
          setTimeout(() => {
            el.classList.add("reveal-visible");
          }, CONFIG.animationStaggerDelay * (index + 1)); // Stagger effect
        });

        // Unobserve section once revealed
        observer.unobserve(entry.target);
      }
    });
  },

  /**
   * Clean up observers
   */
  cleanup() {
    this.observers.forEach((observer) => {
      if (observer && observer.disconnect) {
        observer.disconnect();
      }
    });
    this.observers = [];
  },
};

// =================== APP MODULE ===================
const AppModule = {
  /**
   * Initialize the application
   */
  init() {
    try {
      // Tarayıcının otomatik scroll geri yüklemesini devre dışı bırak
      if ("scrollRestoration" in history) {
        history.scrollRestoration = "manual";
      }

      // Tarayıcı hash restorasyonunu engellemek için sayfa yüklenmeden hash'i temizle
      this.preventHashRestoration();

      // Diğer işlemler...
      CardModule.createCards();
      CardModule.initCardEvents();
      CardModule.filterCards("all");

      // Initialize modal handlers
      ModalModule.init();

      // Set up navigation
      NavigationModule.initNavigation();
      NavigationModule.initSmoothScrolling();

      // Animasyon modüllerini başlat - Bu satırları ekliyoruz
      AnimationModule.initTypewriter();
      AnimationModule.updateCopyrightYear();
      ScrollRevealModule.init(); // Bu çağrı önemli - eksikti

      // Routing'i başlat
      RoutingModule.initRouting();

      // Set up event listeners
      EventModule.setupAllEventListeners();

      console.log("Portfolio application initialized successfully");
    } catch (error) {
      console.error("Error initializing application:", error);
      this.criticalFallback();
    }
  },

  // Hash'in tekrar geri gelmesini engellemek için fonksiyonu güncelleyelim
  preventHashRestoration() {
    try {
      // Hash varsa temizle - Sayfanın ilk yüklenmesi sırasında hemen çalışacak
      if (window.location.hash) {
        // URL'yi değiştir
        history.replaceState(
          null,
          null,
          window.location.pathname + window.location.search
        );

        // Sayfayı scroll etmiyoruz - bu satırı kaldırıyoruz
        // window.scrollTo(0, 0);
      }
    } catch (error) {
      Helpers.logError(
        "AppModule",
        "Error preventing hash restoration:",
        error
      );
    }
  },

  /**
   * Temiz bir başlangıç için hash'i temizle ve sayfayı en üste kaydır
   */
  cleanHashAndScrollToTop() {
    try {
      // Hash varsa temizle
      if (window.location.hash) {
        history.replaceState(
          null,
          null,
          window.location.pathname + window.location.search
        );
      }

      // Yalnızca ilk yüklemede scroll'u en üste getir
      if ("scrollRestoration" in history) {
        history.scrollRestoration = "manual";
      }

      window.scrollTo(0, 0);
    } catch (error) {
      Helpers.logError(
        "AppModule",
        "Error cleaning hash and scrolling to top:",
        error
      );
    }
  },

  /**
   * Çoklu deneme ile scroll pozisyonunu zorla sıfırla
   * (Bazı tarayıcılar ilk scroll komutunu görmezden gelebiliyor)
   */
  forceScrollToTop() {
    // İlk deneme
    window.scrollTo(0, 0);

    // Ek denemeler
    let attempts = 0;
    const scrollInterval = setInterval(() => {
      window.scrollTo(0, 0);
      attempts++;

      if (attempts >= CONFIG.scrollAttempts) {
        clearInterval(scrollInterval);
      }
    }, CONFIG.scrollInterval);
  },

  /**
   * Emergency fallback for critical failures
   */
  criticalFallback() {
    try {
      // Show all content without animations
      document
        .querySelectorAll(".reveal-section, .reveal-item, .card-item, .hide")
        .forEach((el) => {
          el.style.opacity = "1";
          el.style.transform = "none";
          el.classList.add("reveal-visible");
          el.classList.remove("hide");
          el.style.display = "flex";
        });

      // Basic card display
      if (DOM.cardsGrid && cardsData && cardsData.length) {
        CardModule.createCards();
      }

      // Ensure navigation works
      NavigationModule.initSmoothScrolling();

      console.log("Applied critical fallback");
    } catch (err) {
      console.error("Even fallback failed:", err);
    }
  },

  /**
   * Clean up all resources and event listeners
   */
  cleanup() {
    // Clean up all module resources
    ScrollRevealModule.cleanup();
    AnimationModule.cleanup();
    NavigationModule.cleanup();

    // Clear all intervals and timeouts
    clearInterval(AppState.autoSlideInterval);
    clearTimeout(AppState.resumeTimeout);
    clearTimeout(AppState.scrollTimeout);

    // Reset state
    AppState.reset();

    console.log("Application cleanup complete");
  },
};

// Sayfa yüklendiğinde uygulamayı başlat
document.addEventListener("DOMContentLoaded", () => {
  // AppModule kendi içinde scroll'u sıfırlayacak
  AppModule.init();
});

// Sayfa yenilenmeden önce hash'i temizle ve scroll'u sıfırla
window.addEventListener("beforeunload", () => {
  // Hash'i temizle
  /*if (window.location.hash) {
    history.replaceState(
      null,
      null,
      window.location.pathname + window.location.search
    );
  }*/

  // Scroll'u sıfırla
  //window.scrollTo(0, 0);

  // Temizlik işlemi
  AppModule.cleanup();
});
