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

  // Reset all state
  reset() {
    this.cards = [];
    this.filteredCards = [];
    this.currentPage = 1;
    this.modalImageList = [];
    this.currentImageIndex = 0;
    this.isSlideHeld = false;
    clearInterval(this.autoSlideInterval);
    clearTimeout(this.resumeTimeout);
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

    element.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  },
};

// =================== CARD MODULE ===================
const CardModule = {
  /**
   * Creates cards from data and adds them to the grid
   */
  createCards() {
    DOM.cardsGrid.innerHTML = "";

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

      DOM.cardsGrid.appendChild(card);
    });

    AppState.cards = Array.from(document.querySelectorAll(".card-item"));
    AppState.filteredCards = [...AppState.cards];
  },

  /**
   * Filters cards by category
   */
  filterCards(filter) {
    AppState.filteredCards = AppState.cards.filter(
      (card) => filter === "all" || card.dataset.category === filter
    );

    AppState.currentPage = 1;
    this.renderPagination();
    this.showPage(1);
  },

  /**
   * Shows cards for current page
   */
  showPage(page) {
    AppState.cards.forEach((card) => {
      card.style.display = "none";
      card.classList.add("hide");
    });

    const start = (page - 1) * CONFIG.cardsPerPage;
    AppState.filteredCards
      .slice(start, start + CONFIG.cardsPerPage)
      .forEach((card) => {
        card.style.display = "flex";
        setTimeout(() => card.classList.remove("hide"), 50);
      });
  },

  /**
   * Renders pagination controls
   */
  renderPagination() {
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
        AppState.currentPage--;
        this.showPage(AppState.currentPage);
        this.renderPagination();
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
      if (end < total - 1) DOM.paginationContainer.append(Helpers.createDots());
      this.addPageButton(total);
    }

    // Add next button
    this.addPaginationButton(
      '<i class="fas fa-chevron-right"></i>',
      AppState.currentPage === total,
      () => {
        AppState.currentPage++;
        this.showPage(AppState.currentPage);
        this.renderPagination();
      }
    );
  },

  /**
   * Adds a pagination button
   */
  addPaginationButton(html, disabled, callback) {
    const button = document.createElement("button");
    button.innerHTML = html;
    button.className = "page-btn";
    button.disabled = disabled;
    button.onclick = callback;
    DOM.paginationContainer.appendChild(button);
  },

  /**
   * Adds a page number button
   */
  addPageButton(number) {
    const button = document.createElement("button");
    button.textContent = number;
    button.className = "page-btn";

    if (number === AppState.currentPage) {
      button.classList.add("active");
    }

    button.onclick = () => {
      AppState.currentPage = number;
      this.showPage(number);
      this.renderPagination();
    };

    DOM.paginationContainer.appendChild(button);
  },

  /**
   * Initialize card event listeners
   */
  initCardEvents() {
    document.querySelectorAll(".view-details-btn").forEach((btn) => {
      ModalModule.initModal(btn);
    });
  },
};

// =================== MODAL MODULE ===================
const ModalModule = {
  /**
   * Initialize the modal for a card
   */
  initModal(btn) {
    btn.addEventListener("click", () => {
      const card = btn.closest(".card-item");

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

      // Update URL
      const slug = card.dataset.projectSlug;
      history.replaceState(
        { slug, scrollY: AppState.savedScrollPosition },
        "",
        `#projects/${slug}`
      );
    });
  },

  /**
   * Update modal content with card data
   */
  updateModalContent(card) {
    DOM.modalImg.src = AppState.modalImageList[AppState.currentImageIndex];
    DOM.modalTitle.textContent = card.querySelector(".card-title").textContent;
    DOM.modalTags.textContent = card.querySelector(".card-tags").textContent;
    DOM.modalDescription.textContent =
      card.querySelector(".card-description").textContent;

    // Set up links
    const links = card.querySelectorAll(".card-link-item");
    DOM.modalBtn1.href = links[0]?.href || "#";
    DOM.modalBtn2.href = links[1]?.href || "#";

    this.highlightThumb(AppState.currentImageIndex);
  },

  /**
   * Build thumbnail images
   */
  buildThumbs() {
    if (!DOM.thumbsWrapper) return;

    DOM.thumbsWrapper.innerHTML = "";

    AppState.modalImageList.forEach((src, i) => {
      const thumb = document.createElement("img");
      thumb.src = src;
      thumb.loading = "lazy";
      thumb.className = "modal-thumb";
      thumb.dataset.index = i;

      thumb.onclick = () => {
        this.pauseSlide();
        AppState.currentImageIndex = i;
        DOM.modalImg.src = src;
        this.highlightThumb(i);

        clearTimeout(AppState.resumeTimeout);
        AppState.resumeTimeout = setTimeout(
          () => this.resumeSlide(),
          CONFIG.resumeSlideTimeout
        );
      };

      DOM.thumbsWrapper.appendChild(thumb);
    });

    this.highlightThumb(AppState.currentImageIndex);
  },

  /**
   * Highlight the active thumbnail
   */
  highlightThumb(index) {
    if (!DOM.thumbsWrapper) return;

    DOM.thumbsWrapper.querySelectorAll(".modal-thumb").forEach((thumb) => {
      thumb.classList.toggle("active", Number(thumb.dataset.index) === index);
    });
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
    AppState.currentImageIndex =
      (AppState.currentImageIndex + 1) % AppState.modalImageList.length;
    DOM.modalImg.src = AppState.modalImageList[AppState.currentImageIndex];
    this.highlightThumb(AppState.currentImageIndex);
  },

  /**
   * Go to previous image
   */
  prevImage() {
    AppState.currentImageIndex =
      (AppState.currentImageIndex - 1 + AppState.modalImageList.length) %
      AppState.modalImageList.length;

    DOM.modalImg.src = AppState.modalImageList[AppState.currentImageIndex];
    this.highlightThumb(AppState.currentImageIndex);
  },

  /**
   * Set up events to pause/resume slideshow on image interaction
   */
  setupImagePauseEvents() {
    DOM.modalImg.addEventListener("mousedown", () => this.pauseSlide());
    DOM.modalImg.addEventListener("mouseup", () => this.handleMouseUp());
    DOM.modalImg.addEventListener("mouseleave", () => this.handleMouseUp());
    DOM.modalImg.addEventListener("touchstart", () => this.pauseSlide());
    DOM.modalImg.addEventListener("touchend", () => this.handleMouseUp());
    DOM.modalImg.addEventListener("touchcancel", () => this.handleMouseUp());
  },

  /**
   * Handle mouse/touch up to resume slideshow
   */
  handleMouseUp() {
    clearTimeout(AppState.resumeTimeout);
    AppState.resumeTimeout = setTimeout(() => this.resumeSlide(), 1000);
  },

  /**
   * Clean up event listeners when modal closes
   */
  cleanupImagePauseEvents() {
    DOM.modalImg.removeEventListener("mousedown", () => this.pauseSlide());
    DOM.modalImg.removeEventListener("mouseup", () => this.handleMouseUp());
    DOM.modalImg.removeEventListener("mouseleave", () => this.handleMouseUp());
    DOM.modalImg.removeEventListener("touchstart", () => this.pauseSlide());
    DOM.modalImg.removeEventListener("touchend", () => this.handleMouseUp());
    DOM.modalImg.removeEventListener("touchcancel", () => this.handleMouseUp());
  },

  /**
   * Close the modal
   */
  closeModal() {
    DOM.modalOverlay.style.display = "none";
    clearInterval(AppState.autoSlideInterval);
    AppState.isSlideHeld = false;
    this.cleanupImagePauseEvents();

    // Restore body scrolling
    DOM.body.style.overflow = "";
    DOM.body.style.position = "";
    DOM.body.style.top = "";
    DOM.body.style.width = "";

    // Restore scroll position
    window.scrollTo(0, AppState.savedScrollPosition);

    // Update URL
    const url = new URL(window.location.href);
    url.hash = "";
    history.replaceState({}, "", url.toString());
  },

  /**
   * Set up modal navigation events
   */
  setupModalEvents() {
    // Close button
    DOM.modalClose.addEventListener("click", () => this.closeModal());

    // Navigation buttons
    DOM.prevBtn.addEventListener("click", () => {
      this.pauseSlide();
      this.prevImage();
      clearTimeout(AppState.resumeTimeout);
      AppState.resumeTimeout = setTimeout(
        () => this.resumeSlide(),
        CONFIG.resumeSlideTimeout
      );
    });

    DOM.nextBtn.addEventListener("click", () => {
      this.pauseSlide();
      this.nextImage();
      clearTimeout(AppState.resumeTimeout);
      AppState.resumeTimeout = setTimeout(
        () => this.resumeSlide(),
        CONFIG.resumeSlideTimeout
      );
    });

    // Keyboard navigation
    window.addEventListener("keydown", (e) => {
      // Close on Escape
      if (e.key === "Escape") this.closeModal();

      // Navigation with arrow keys when modal is open
      if (DOM.modalOverlay.style.display === "flex") {
        if (e.key === "ArrowLeft") {
          this.pauseSlide();
          this.prevImage();
          clearTimeout(AppState.resumeTimeout);
          AppState.resumeTimeout = setTimeout(
            () => this.resumeSlide(),
            CONFIG.resumeSlideTimeout
          );
        }

        if (e.key === "ArrowRight") {
          this.pauseSlide();
          this.nextImage();
          clearTimeout(AppState.resumeTimeout);
          AppState.resumeTimeout = setTimeout(
            () => this.resumeSlide(),
            CONFIG.resumeSlideTimeout
          );
        }
      }
    });
  },
};

// =================== NAVIGATION MODULE ===================
const NavigationModule = {
  /**
   * Initialize navigation functionality
   */
  initNavigation() {
    // Mobile menu toggle
    DOM.mobileMenuToggle?.addEventListener("click", () => {
      DOM.body.classList.toggle("mobile-menu-open");
    });

    // Navigation links
    DOM.navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        DOM.body.classList.remove("mobile-menu-open");
        DOM.navLinks.forEach((l) => l.classList.remove("active"));
        link.classList.add("active");
      });
    });

    // Close mobile menu when clicking outside
    document.addEventListener("click", (e) => {
      if (
        DOM.body.classList.contains("mobile-menu-open") &&
        !e.target.closest(".nav-links") &&
        !e.target.closest(".mobile-menu-toggle")
      ) {
        DOM.body.classList.remove("mobile-menu-open");
      }
    });

    this.setInitialActiveState();
    this.initScrollHandler();
  },

  /**
   * Set the initial active state based on URL hash
   */
  setInitialActiveState() {
    const hash = window.location.hash || "#home";
    const activeLink = document.querySelector(`.nav-link[href="${hash}"]`);

    if (activeLink) {
      DOM.navLinks.forEach((link) => link.classList.remove("active"));
      activeLink.classList.add("active");
    }
  },

  /**
   * Initialize scroll event handler for navigation
   */
  initScrollHandler() {
    window.addEventListener("scroll", () => {
      if (!window.requestAnimationFrame) return;

      window.requestAnimationFrame(() => {
        const scrollPosition = window.scrollY;

        // Update active nav link based on scroll position
        this.updateActiveNavOnScroll(scrollPosition);

        // Toggle scroll-to-top button visibility
        if (DOM.scrollToTopBtn) {
          DOM.scrollToTopBtn.style.display =
            scrollPosition > 300 ? "block" : "none";
        }
      });
    });
  },

  /**
   * Update the active navigation link based on scroll position
   */
  updateActiveNavOnScroll(scrollPosition) {
    let currentSection = "";

    document.querySelectorAll("section[id]").forEach((section) => {
      const sectionTop = section.offsetTop - 100;
      const sectionHeight = section.offsetHeight;

      if (
        scrollPosition >= sectionTop &&
        scrollPosition < sectionTop + sectionHeight
      ) {
        currentSection = "#" + section.getAttribute("id");
      }
    });

    if (currentSection) {
      const shouldBeActive = document.querySelector(
        `.nav-link[href="${currentSection}"]`
      );

      if (shouldBeActive && !shouldBeActive.classList.contains("active")) {
        DOM.navLinks.forEach((link) => link.classList.remove("active"));
        shouldBeActive.classList.add("active");
      }
    }
  },

  /**
   * Initialize smooth scrolling for internal links
   */
  initSmoothScrolling() {
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
  },
};

// =================== ANIMATION MODULE ===================
const AnimationModule = {
  /**
   * Initialize typewriter effect
   */
  initTypewriter() {
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

    function typeEffect() {
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

      setTimeout(typeEffect, typingSpeed);
    }

    setTimeout(typeEffect, 1000);
  },

  /**
   * Update copyright year
   */
  updateCopyrightYear() {
    if (DOM.yearSpan) {
      DOM.yearSpan.textContent = new Date().getFullYear();
    }
  },
};

// =================== ROUTING MODULE ===================
const RoutingModule = {
  /**
   * Initialize routing functionality
   */
  initRouting() {
    // Check for project hash on load
    const hash = window.location.hash;

    if (hash.startsWith("#projects/")) {
      const slug = hash.slice(10); // Remove "#projects/"

      this.handleProjectRoute(slug);
    }

    // Handle browser back/forward buttons
    window.addEventListener("popstate", (e) => {
      if (e.state && e.state.slug) {
        const slug = e.state.slug;
        const savedScroll = e.state.scrollY || 0;

        // Only handle if modal is not already open
        if (DOM.modalOverlay.style.display !== "flex") {
          AppState.savedScrollPosition = savedScroll;
          this.handleProjectRoute(slug, false);
        }
      } else {
        ModalModule.closeModal();
      }
    });
  },

  /**
   * Handle project route - open modal for given slug
   */
  handleProjectRoute(slug, useDelay = true) {
    const card = AppState.cards.find((c) => c.dataset.projectSlug === slug);

    if (card) {
      const openModal = () => {
        const btn = card.querySelector(".view-details-btn");
        if (btn) btn.click();
      };

      // Add delay when page is loading to ensure all elements are ready
      if (useDelay) {
        setTimeout(openModal, 500);
      } else {
        openModal();
      }
    }
  },
};

// =================== EVENT LISTENERS ===================
const EventModule = {
  /**
   * Set up filter button event listeners
   */
  setupFilterButtons() {
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
  },

  /**
   * Set up all event listeners
   */
  setupAllEventListeners() {
    // Set up filter buttons
    this.setupFilterButtons();

    // Set up modal events
    ModalModule.setupModalEvents();

    // Reset scroll position on page load
    window.addEventListener("load", () => {
      window.scrollTo(0, 0);
    });
  },
};

// =================== SCROLL REVEAL MODULE ===================
const ScrollRevealModule = {
  /**
   * Initialize scroll reveal functionality
   */
  init() {
    // Get all sections to animate
    const sections = document.querySelectorAll("section");

    // Set up the Intersection Observer
    const observer = new IntersectionObserver(this.handleIntersect, {
      root: null,
      rootMargin: "0px",
      threshold: 0.15, // Trigger when 15% of the section is visible
    });

    // Observe each section
    sections.forEach((section) => {
      observer.observe(section);

      // Hide section content initially
      section.classList.add("reveal-section");

      // Find elements to animate inside section
      const elementsToAnimate = section.querySelectorAll(".reveal-item");
      elementsToAnimate.forEach((el) => {
        el.classList.add("reveal-hidden");
      });
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
          }, 100 * (index + 1)); // Stagger effect
        });

        // Unobserve section once revealed
        observer.unobserve(entry.target);
      }
    });
  },
};

// =================== INITIALIZATION ===================
function init() {
  // Create and set up cards
  CardModule.createCards();
  CardModule.initCardEvents();
  CardModule.filterCards("all");

  // Set up navigation
  NavigationModule.initNavigation();
  NavigationModule.initSmoothScrolling();

  // Initialize animations
  AnimationModule.initTypewriter();
  AnimationModule.updateCopyrightYear();

  // Initialize scroll reveal animations
  ScrollRevealModule.init();

  // Set up routing
  RoutingModule.initRouting();

  // Set up event listeners
  EventModule.setupAllEventListeners();
}

// Start the application when DOM content is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.scrollTo(0, 0);
  init();
});
