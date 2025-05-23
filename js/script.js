/**
 * Portfolio Cards - Main JavaScript
 *
 * This script manages dynamic portfolio card display,
 * filtering, modal interactions, and navigation functionality.
 *
 */

// =================== IMPORTS ===================
import { cardsData } from "./cardsData.js";

// =================== CONFIG ===================
const CONFIG = {
  // Kart ayarları
  cardsPerPage: 6,
  fallbackImage: "./assets/images/default.png",

  // Modal ayarları
  autoSlideInterval: 3000,
  resumeSlideTimeout: 2000,

  // Navigasyon
  scrollOffset: 80,

  // Animasyon
  typewriterSpeed: 100,
  typewriterDeleteSpeed: 50,
  typewriterPause: 1500,
  typewriterDelay: 300,

  // Performans
  debounceDelay: 150,
  animationStaggerDelay: 100,

  // Scroll ayarları
  scrollAttempts: 3,
  scrollInterval: 100,
};

// =================== APP STATE ===================
const AppState = {
  // Kartlar
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

  // Tüm durumu sıfırla
  reset() {
    this.cards = [];
    this.filteredCards = [];
    this.currentPage = 1;
    this.modalImageList = [];
    this.currentImageIndex = 0;
    this.isSlideHeld = false;
    this.isScrolling = false;

    // Zamanlayıcıları temizle
    this.clearAllTimers();
  },

  // Tüm zamanlayıcıları temizle
  clearAllTimers() {
    clearInterval(this.autoSlideInterval);
    clearTimeout(this.resumeTimeout);
    clearTimeout(this.scrollTimeout);
    this.autoSlideInterval = null;
    this.resumeTimeout = null;
    this.scrollTimeout = null;
  },
};

// =================== DOM ELEMENTS ===================
const DOM = {
  // Temel elementler
  body: document.body,

  // Navigasyon
  mobileMenuToggle: document.querySelector(".mobile-menu-toggle"),
  navLinks: document.querySelectorAll(".nav-link"),
  internalLinks: document.querySelectorAll('a[href^="#"]'),
  scrollToTopBtn: document.querySelector(".scroll-to-top"),

  // Kartlar & Filtreleme
  filterButtons: document.querySelectorAll(".filter-btn"),
  cardsGrid: document.querySelector(".cards-grid"),
  paginationContainer: document.querySelector(".pagination"),

  // Modal elementleri
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

  // Animasyon elementleri
  professionText: document.getElementById("profession-text"),
  yearSpan: document.getElementById("current-year"),

  // Seçicileri gerektiğinde başlat ve tekrar kullanım için önbelleğe al
  getElement(selector) {
    if (!this[selector]) {
      this[selector] = document.querySelector(selector);
    }
    return this[selector];
  },

  getElements(selector) {
    if (!this[`${selector}List`]) {
      this[`${selector}List`] = document.querySelectorAll(selector);
    }
    return this[`${selector}List`];
  },
};

// =================== HELPER FUNCTIONS ===================
const Helpers = {
  /**
   * Pagination dots elementi oluşturur
   */
  createDots() {
    const dots = document.createElement("span");
    dots.textContent = "…";
    dots.className = "pagination-dots";
    return dots;
  },

  /**
   * Erişilebilirlik için odağı modal içinde tutar
   */
  trapFocus(element) {
    if (!element) return;

    const focusable = element.querySelectorAll(
      'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    // Varolan event listener'ı kaldır (eğer varsa)
    element.removeEventListener("keydown", this.handleFocusTrap);

    // Yeni handler bağla ve referansları sakla
    element.addEventListener("keydown", this.handleFocusTrap);
    element.focusTrapData = { first, last };
  },

  /**
   * Odak tuzağı için event handler
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
   * Odak tuzağı event listener'larını kaldırır
   */
  removeFocusTrap(element) {
    if (element) {
      element.removeEventListener("keydown", this.handleFocusTrap);
      element.focusTrapData = null;
    }
  },

  /**
   * Performans optimizasyonu için debounce fonksiyonu
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
   * Güvenli JSON parse işlemi
   */
  safeJSONParse(str, fallback = {}) {
    try {
      return JSON.parse(str);
    } catch (err) {
      console.error("JSON ayrıştırma hatası:", err);
      return fallback;
    }
  },

  /**
   * Tutarlı formatla hata logları oluşturur
   */
  logError(component, message, error) {
    console.error(`[${component}] ${message}`, error);
  },

  /**
   * Fragment kullanarak daha verimli DOM güncellemesi sağlar
   */
  createElementWithHTML(tag, className, html) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (html) element.innerHTML = html;
    return element;
  },

  /**
   * Element özelliklerini ayarlar
   */
  setAttributes(element, attributes) {
    if (!element) return;

    Object.entries(attributes).forEach(([key, value]) => {
      if (key === "disabled") {
        if (value) {
          element.setAttribute(key, "");
          element.disabled = true;
        } else {
          element.removeAttribute(key);
          element.disabled = false;
        }
      } else if (value !== null && value !== undefined) {
        element.setAttribute(key, value);
      }
    });

    return element;
  },
};

// =================== CARD MODULE ===================
const CardModule = {
  /**
   * Verilerden kartları oluşturur ve grida ekler
   */
  createCards() {
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
        .map((link) => {
          // İkon tipine göre özel class ver, diğerlerinde class ekleme
          let iconClass = "";

          if (link.icon.includes("github")) {
            iconClass = "github-icon";
          } else if (link.icon.includes("play")) {
            iconClass = "play-icon";
          }

          return `<a href="${link.url}" target="_blank" rel="noopener noreferrer" class="card-link-item ${iconClass}">
            <i class="${link.icon}" aria-hidden="true"></i>
          </a>`;
        })
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
  },

  /**
   * Kategoriye göre kartları filtreler
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
   * Mevcut sayfa için kartları gösterir
   */
  showPage(page) {
    // Tüm kartları gizle
    AppState.cards.forEach((card) => {
      card.style.display = "none";
      card.classList.add("hide");
    });

    // Sadece ilgili kartları göster
    const start = (page - 1) * CONFIG.cardsPerPage;
    AppState.filteredCards
      .slice(start, start + CONFIG.cardsPerPage)
      .forEach((card, index) => {
        card.style.display = "flex";
        // Kademeli animasyon için
        setTimeout(() => card.classList.remove("hide"), 50 + index * 20);
      });
  },

  /**
   * Sayfalama kontrollerini oluşturur
   */
  renderPagination() {
    if (!DOM.paginationContainer) return;

    const total = Math.ceil(
      AppState.filteredCards.length / CONFIG.cardsPerPage
    );
    DOM.paginationContainer.innerHTML = "";

    // Tek sayfa varsa sayfalama gerekmiyor
    if (total <= 1) return;

    // Önceki sayfa butonu
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

    // Gösterilecek sayfa numaralarını hesapla
    const maxPages = 3;
    let start = Math.max(1, AppState.currentPage - Math.floor(maxPages / 2));
    let end = Math.min(total, start + maxPages - 1);

    if (end - start + 1 < maxPages) {
      start = Math.max(1, end - maxPages + 1);
    }

    // İlk sayfa + noktalar (gerekirse)
    if (start > 1) {
      this.addPageButton(1);
      if (start > 2) DOM.paginationContainer.append(Helpers.createDots());
    }

    // Sayfa numaraları
    for (let i = start; i <= end; i++) {
      this.addPageButton(i);
    }

    // Noktalar + son sayfa (gerekirse)
    if (end < total) {
      if (end < total - 1) DOM.paginationContainer.append(Helpers.createDots());
      this.addPageButton(total);
    }

    // Sonraki sayfa butonu
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
  },

  /**
   * Sayfalama butonu ekler
   */
  addPaginationButton(html, disabled, callback) {
    const button = Helpers.createElementWithHTML("button", "page-btn", html);
    Helpers.setAttributes(button, {
      disabled: disabled,
      "aria-disabled": disabled ? "true" : "false",
    });

    button.onclick = callback;
    DOM.paginationContainer.appendChild(button);
    return button;
  },

  /**
   * Sayfa numarası butonu ekler
   */
  addPageButton(number) {
    const isActive = number === AppState.currentPage;
    const button = Helpers.createElementWithHTML(
      "button",
      `page-btn${isActive ? " active" : ""}`,
      number
    );

    Helpers.setAttributes(button, {
      "aria-label": `Sayfa ${number}`,
      "aria-current": isActive ? "page" : null,
    });

    button.onclick = () => {
      AppState.currentPage = number;
      this.showPage(number);
      this.renderPagination();
    };

    DOM.paginationContainer.appendChild(button);
    return button;
  },

  /**
   * Kart event listener'larını olay delegasyonu kullanarak başlatır
   */
  initCardEvents() {
    if (!DOM.cardsGrid) return;

    // Performans için olay delegasyonu kullan
    DOM.cardsGrid.addEventListener("click", (e) => {
      const detailsBtn = e.target.closest(".view-details-btn");
      if (detailsBtn) {
        ModalModule.openModalFromCard(detailsBtn.closest(".card-item"));
      }
    });
  },
};

// =================== MODAL MODULE ===================
const ModalModule = {
  // Temizlik için bound handler'ları sakla
  boundHandlers: {
    keydownHandler: null,
    pauseSlide: null,
    handleMouseUp: null,
  },

  /**
   * Modal sistemini başlat
   */
  init() {
    // Event handler'ları bir kez bağla
    this.boundHandlers.keydownHandler = this.handleKeydown.bind(this);
    this.boundHandlers.pauseSlide = this.pauseSlide.bind(this);
    this.boundHandlers.handleMouseUp = this.handleMouseUp.bind(this);

    // Ana modal event listener'larını ayarla
    this.setupModalEvents();
  },

  /**
   * Kart elementinden modal aç
   */
  openModalFromCard(card) {
    if (!card || !DOM.modalOverlay) return;

    // Modal verilerini ayarla
    AppState.modalImageList = card.dataset.images.split(",");
    AppState.currentImageIndex = 0;
    AppState.savedScrollPosition = window.scrollY;

    // Modal içeriğini güncelle
    this.updateModalContent(card);
    this.buildThumbs();

    // Modalı göster
    DOM.modalOverlay.style.display = "flex";

    // Body scrollunu devre dışı bırak ama pozisyonu koru
    DOM.body.style.overflow = "hidden";
    DOM.body.style.position = "fixed";
    DOM.body.style.top = `-${AppState.savedScrollPosition}px`;
    DOM.body.style.width = "100%";

    // Modal etkileşimlerini ayarla
    this.startSlide();
    this.setupImagePauseEvents();
    Helpers.trapFocus(DOM.modalOverlay);

    // Klavye navigasyonunu ekle
    window.addEventListener("keydown", this.boundHandlers.keydownHandler);

    // URL'yi güncelle
    const slug = card.dataset.projectSlug;
    history.replaceState(
      { slug, scrollY: AppState.savedScrollPosition },
      "",
      `#projects/${slug}`
    );

    // Erişilebilirlik için odağı kapat butonuna ayarla
    setTimeout(() => {
      DOM.modalClose?.focus();
    }, 100);
  },

  /**
   * Modal içeriğini kart verisiyle güncelle
   */
  updateModalContent(card) {
    if (!DOM.modalImg || !card) return;

    // Ana resmi güncelle
    DOM.modalImg.src = AppState.modalImageList[AppState.currentImageIndex];
    DOM.modalImg.alt =
      card.querySelector(".card-title")?.textContent || "Project image";

    // Başlık, etiketler ve açıklamayı güncelle
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

    // Linkleri ayarla
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
  },

  /**
   * Küçük resim (thumbnail) görüntülerini oluştur
   */
  buildThumbs() {
    if (!DOM.thumbsWrapper) return;

    DOM.thumbsWrapper.innerHTML = "";
    const fragment = document.createDocumentFragment();

    AppState.modalImageList.forEach((src, i) => {
      const thumb = document.createElement("img");
      thumb.src = src;
      thumb.loading = "lazy";
      thumb.className = "modal-thumb";
      thumb.dataset.index = i;

      Helpers.setAttributes(thumb, {
        "aria-label": `Image ${i + 1} of ${AppState.modalImageList.length}`,
        role: "tab",
        tabindex: "0",
        "aria-selected": i === AppState.currentImageIndex ? "true" : "false",
      });

      thumb.onclick = () => this.switchToImage(i);

      // Klavye erişilebilirliği ekle
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
  },

  /**
   * Belirli bir resme geç
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
   * Aktif küçük resmi vurgula
   */
  highlightThumb(index) {
    if (!DOM.thumbsWrapper) return;

    DOM.thumbsWrapper.querySelectorAll(".modal-thumb").forEach((thumb) => {
      const isActive = Number(thumb.dataset.index) === index;
      thumb.classList.toggle("active", isActive);
      thumb.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  },

  /**
   * Otomatik slayt gösterisini başlat
   */
  startSlide() {
    clearInterval(AppState.autoSlideInterval);
    AppState.autoSlideInterval = setInterval(
      () => this.nextImage(),
      CONFIG.autoSlideInterval
    );
  },

  /**
   * Otomatik slayt gösterisini duraklat
   */
  pauseSlide() {
    AppState.isSlideHeld = true;
    clearInterval(AppState.autoSlideInterval);
  },

  /**
   * Otomatik slayt gösterisini devam ettir
   */
  resumeSlide() {
    if (DOM.modalOverlay.style.display === "flex" && AppState.isSlideHeld) {
      AppState.isSlideHeld = false;
      this.startSlide();
    }
  },

  /**
   * Sonraki resme geç
   */
  nextImage() {
    AppState.currentImageIndex =
      (AppState.currentImageIndex + 1) % AppState.modalImageList.length;

    if (DOM.modalImg) {
      DOM.modalImg.src = AppState.modalImageList[AppState.currentImageIndex];
    }

    this.highlightThumb(AppState.currentImageIndex);
  },

  /**
   * Önceki resme geç
   */
  prevImage() {
    AppState.currentImageIndex =
      (AppState.currentImageIndex - 1 + AppState.modalImageList.length) %
      AppState.modalImageList.length;

    if (DOM.modalImg) {
      DOM.modalImg.src = AppState.modalImageList[AppState.currentImageIndex];
    }

    this.highlightThumb(AppState.currentImageIndex);
  },

  /**
   * Resim etkileşimi için duraklatma/devam ettirme olaylarını ayarla
   */
  setupImagePauseEvents() {
    if (!DOM.modalImg) return;

    // Varolan listener'ları temizle
    this.cleanupImagePauseEvents();

    // Yeni listener'lar ekle
    DOM.modalImg.addEventListener("mousedown", this.boundHandlers.pauseSlide);
    DOM.modalImg.addEventListener("mouseup", this.boundHandlers.handleMouseUp);
    DOM.modalImg.addEventListener(
      "mouseleave",
      this.boundHandlers.handleMouseUp
    );
    DOM.modalImg.addEventListener("touchstart", this.boundHandlers.pauseSlide);
    DOM.modalImg.addEventListener("touchend", this.boundHandlers.handleMouseUp);
    DOM.modalImg.addEventListener(
      "touchcancel",
      this.boundHandlers.handleMouseUp
    );
  },

  /**
   * Slayt gösterisini devam ettirmek için fare/dokunma olayını işle
   */
  handleMouseUp() {
    clearTimeout(AppState.resumeTimeout);
    AppState.resumeTimeout = setTimeout(() => this.resumeSlide(), 1000);
  },

  /**
   * Modal için klavye olaylarını işle
   */
  handleKeydown(e) {
    // Escape ile kapat
    if (e.key === "Escape") this.closeModal();

    // Modal açıkken ok tuşlarıyla navigasyon
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
   * Tutarlı davranış için navigasyon işlemlerini yönet
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
   * Modal kapandığında event listener'ları temizle
   */
  cleanupImagePauseEvents() {
    if (!DOM.modalImg) return;

    const { pauseSlide, handleMouseUp } = this.boundHandlers;

    DOM.modalImg.removeEventListener("mousedown", pauseSlide);
    DOM.modalImg.removeEventListener("mouseup", handleMouseUp);
    DOM.modalImg.removeEventListener("mouseleave", handleMouseUp);
    DOM.modalImg.removeEventListener("touchstart", pauseSlide);
    DOM.modalImg.removeEventListener("touchend", handleMouseUp);
    DOM.modalImg.removeEventListener("touchcancel", handleMouseUp);
  },

  /**
   * Modalı kapat
   */
  closeModal() {
    if (!DOM.modalOverlay) return;

    DOM.modalOverlay.style.display = "none";
    clearInterval(AppState.autoSlideInterval);
    AppState.isSlideHeld = false;
    this.cleanupImagePauseEvents();

    window.removeEventListener("keydown", this.boundHandlers.keydownHandler);
    Helpers.removeFocusTrap(DOM.modalOverlay);

    // Scroll'u geri yüklemeden önce stilleri sıfırla
    DOM.body.style.overflow = "";
    DOM.body.style.position = "";
    DOM.body.style.top = "";
    DOM.body.style.width = "";

    // Scroll pozisyonunu geri yükle
    window.scrollTo({
      top: AppState.savedScrollPosition,
      behavior: "instant",
    });

    // URL hash yönetimi
    const hash = window.location.hash;
    if (hash.startsWith("#projects/")) {
      history.replaceState({}, "", "#projects");
    } else {
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
  },

  /**
   * Modal navigasyon olaylarını ayarla
   */
  setupModalEvents() {
    // Kapat butonu
    if (DOM.modalClose) {
      DOM.modalClose.addEventListener("click", () => this.closeModal());
    }

    // Navigasyon butonları
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
  },
};

// =================== NAVIGATION MODULE ===================
const NavigationModule = {
  // Bound handler'ları sakla
  boundHandlers: {
    scrollHandler: null,
    documentClickHandler: null,
  },

  /**
   * Navigasyon işlevselliğini başlat
   */
  initNavigation() {
    // Handler'ları bir kez bağla
    this.boundHandlers.scrollHandler = Helpers.debounce(
      this.handleScroll.bind(this)
    );
    this.boundHandlers.documentClickHandler =
      this.handleDocumentClick.bind(this);

    // Mobil menü toggle
    if (DOM.mobileMenuToggle) {
      DOM.mobileMenuToggle.addEventListener("click", () => {
        const isExpanded = DOM.body.classList.contains("mobile-menu-open");
        DOM.mobileMenuToggle.setAttribute(
          "aria-expanded",
          (!isExpanded).toString()
        );
        DOM.body.classList.toggle("mobile-menu-open");
      });
    }

    // Navigasyon linkleri
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

    // Menüyü dışarı tıklandığında kapat
    document.addEventListener("click", this.boundHandlers.documentClickHandler);

    this.setInitialActiveState();
    this.initScrollHandler();
  },

  /**
   * Dışarı tıklandığında mobil menüyü kapat
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
   * URL hash'ine göre başlangıç aktif durumunu ayarla
   */
  setInitialActiveState() {
    // Normal bölüm linklerini işle
    const hash = window.location.hash.split("/")[0] || "#home";
    const activeLink = document.querySelector(`.nav-link[href="${hash}"]`);

    if (activeLink) {
      DOM.navLinks.forEach((link) => link.classList.remove("active"));
      activeLink.classList.add("active");
    }
  },

  /**
   * Scroll olayı handler'ını başlat
   */
  initScrollHandler() {
    window.addEventListener("scroll", this.boundHandlers.scrollHandler);
  },

  /**
   * Scroll olaylarını işle
   */
  handleScroll() {
    const scrollPosition = window.scrollY;

    // Scroll pozisyonuna göre aktif nav linkini güncelle
    this.updateActiveNavOnScroll(scrollPosition);

    // Yukarı kaydırma butonunun görünürlüğünü değiştir
    if (DOM.scrollToTopBtn) {
      DOM.scrollToTopBtn.style.display = scrollPosition > 300 ? "flex" : "none";
    }
  },

  /**
   * Scroll pozisyonuna göre aktif navigasyon linkini güncelle
   * Optimizasyon: Hesaplamaları ve DOM işlemlerini daha verimli hale getirdim
   */
  updateActiveNavOnScroll(scrollPosition) {
    // Görünür bölümleri ve görünürlük oranlarını saklamak için dizi
    const visibleSections = [];
    const viewportHeight = window.innerHeight;

    // Tüm bölümleri kontrol et
    document.querySelectorAll("section[id]").forEach((section) => {
      // Bölümün viewport'taki konumunu al
      const rect = section.getBoundingClientRect();

      // Bölüm viewport içinde mi?
      if (rect.top < viewportHeight && rect.bottom > 0) {
        // Görünür yüksekliği hesapla (viewport içinde kalan kısım)
        const visibleHeight =
          Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);

        // Bölümün görünürlük yüzdesini hesapla
        const visiblePercent = (visibleHeight / viewportHeight) * 100;

        // Görünürlük yüzdesi belirli bir eşiğin üzerindeyse listeye ekle
        if (visiblePercent > 5) {
          visibleSections.push({
            id: section.id,
            visiblePercent: visiblePercent,
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
        const percentDifference = Math.abs(a.visiblePercent - b.visiblePercent);

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
      }
    }
  },

  /**
   * İç linkler için yumuşak kaydırma başlat
   */
  initSmoothScrolling() {
    DOM.internalLinks.forEach((link) => {
      // Modal butonlarını atla
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

            // URL'yi güncelle ama navigasyon tetiklemeden
            history.pushState(null, null, targetId);
          }
        }
      });
    });

    // Yukarı kaydırma butonu
    if (DOM.scrollToTopBtn) {
      DOM.scrollToTopBtn.addEventListener("click", () => {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      });
    }
  },

  /**
   * Event listener'ları temizle
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
  // Tip efekti zamanlayıcısını sakla
  typeEffectTimeout: null,

  /**
   * Typewriter efektini başlat
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

    const typeEffect = () => {
      const currentProfession = professions[currentProfessionIndex];

      if (isDeleting) {
        // Karakterleri sil
        DOM.professionText.textContent = currentProfession.substring(
          0,
          currentCharIndex - 1
        );
        currentCharIndex--;
        typingSpeed = CONFIG.typewriterDeleteSpeed;
      } else {
        // Karakterleri ekle
        DOM.professionText.textContent = currentProfession.substring(
          0,
          currentCharIndex + 1
        );
        currentCharIndex++;
        typingSpeed = CONFIG.typewriterSpeed;
      }

      // Kelime tam gösterildi - silmeye başla
      if (!isDeleting && currentCharIndex === currentProfession.length) {
        isDeleting = true;
        typingSpeed = CONFIG.typewriterPause;
      }
      // Kelime tamamen silindi - sonraki kelimeye geç
      else if (isDeleting && currentCharIndex === 0) {
        isDeleting = false;
        currentProfessionIndex =
          (currentProfessionIndex + 1) % professions.length;
        typingSpeed = CONFIG.typewriterDelay;
      }

      this.typeEffectTimeout = setTimeout(typeEffect, typingSpeed);
    };

    setTimeout(typeEffect, 1000);
  },

  /**
   * Telif hakkı yılını güncelle
   */
  updateCopyrightYear() {
    if (DOM.yearSpan) {
      DOM.yearSpan.textContent = new Date().getFullYear();
    }
  },

  /**
   * Animasyon zamanlayıcılarını temizle
   */
  cleanup() {
    clearTimeout(this.typeEffectTimeout);
    this.typeEffectTimeout = null;
  },
};

// =================== ROUTING MODULE ===================
const RoutingModule = {
  /**
   * Routing işlevselliğini başlat
   */
  initRouting() {
    // Yüklenirken proje hash'ini kontrol et
    const hash = window.location.hash;

    if (hash.startsWith("#projects/")) {
      const slug = hash.slice(10); // "#projects/" kısmını kaldır
      this.handleProjectRoute(slug);
    }

    // Tarayıcı ileri/geri butonlarını yönet
    window.addEventListener("popstate", this.handlePopState.bind(this));
  },

  /**
   * Tarayıcı geçmişi navigasyonu için popstate olaylarını işle
   */
  handlePopState(e) {
    if (e.state && e.state.slug) {
      const slug = e.state.slug;
      const savedScroll = e.state.scrollY || 0;

      // Modal zaten açık değilse işle
      if (DOM.modalOverlay.style.display !== "flex") {
        AppState.savedScrollPosition = savedScroll;
        this.handleProjectRoute(slug, false);
      }
    } else {
      // State'te slug yok, modal açıksa kapat
      if (DOM.modalOverlay.style.display === "flex") {
        ModalModule.closeModal();
      }
    }
  },

  /**
   * Proje rotasını işle - verilen slug için modal aç
   */
  handleProjectRoute(slug, useDelay = true) {
    const card = AppState.cards.find((c) => c.dataset.projectSlug === slug);

    if (card) {
      const openModal = () => {
        ModalModule.openModalFromCard(card);
      };

      // Sayfa yüklenirken tüm elementlerin hazır olduğundan emin olmak için gecikme ekle
      if (useDelay) {
        setTimeout(openModal, 500);
      } else {
        openModal();
      }
    }
  },
};

// =================== EVENT MODULE ===================
const EventModule = {
  /**
   * Filtre butonları için event listener'ları ayarla
   */
  setupFilterButtons() {
    DOM.filterButtons.forEach((button) => {
      // Başlangıç durumunu ayarla
      if (!button.classList.contains("active")) {
        button.setAttribute("aria-pressed", "false");
      }

      button.addEventListener("click", () => {
        // Aktif durumu güncelle
        DOM.filterButtons.forEach((btn) => {
          btn.classList.remove("active");
          btn.setAttribute("aria-pressed", "false");
        });

        button.classList.add("active");
        button.setAttribute("aria-pressed", "true");

        // Kartları filtrele
        CardModule.filterCards(button.dataset.filter);
      });
    });
  },

  /**
   * Tüm event listener'ları ayarla
   */
  setupAllEventListeners() {
    // Filtre butonlarını ayarla
    this.setupFilterButtons();

    // Responsive ayarlamalar için resize handler ekle
    window.addEventListener(
      "resize",
      Helpers.debounce(() => {
        // Gerekirse kart düzenini yeniden hesapla
        if (AppState.currentPage) {
          CardModule.showPage(AppState.currentPage);
        }
      }, 200)
    );
  },
};

// =================== SCROLL REVEAL MODULE ===================
const ScrollRevealModule = {
  observers: [],

  /**
   * Scroll reveal işlevselliğini başlat
   */
  init() {
    // IntersectionObserver destekleniyorsa
    if (!("IntersectionObserver" in window)) {
      this.fallbackReveal();
      return;
    }

    // Animate edilecek tüm bölümleri al
    const sections = document.querySelectorAll("section");

    // Intersection Observer'ı kur
    const observer = new IntersectionObserver(this.handleIntersect, {
      root: null,
      rootMargin: "0px",
      threshold: 0.15, // Bölümün %15'i görünür olduğunda tetikle
    });

    // Temizlik için observer'ı sakla
    this.observers.push(observer);

    // Her bölümü gözlemle
    sections.forEach((section) => {
      observer.observe(section);

      // Başlangıçta bölüm içeriğini gizle
      section.classList.add("reveal-section");

      // Bölüm içindeki animate edilecek elementleri bul
      const elementsToAnimate = section.querySelectorAll(".reveal-item");
      elementsToAnimate.forEach((el) => {
        // Element viewport'ta değilse hidden class ekle
        if (!this.isInViewport(el)) {
          el.classList.add("reveal-hidden");
        }
      });
    });
  },

  /**
   * Element viewport'ta mı kontrol et
   */
  isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  },

  /**
   * IntersectionObserver mevcut olmadığında fallback metodu
   */
  fallbackReveal() {
    document.querySelectorAll(".reveal-section, .reveal-item").forEach((el) => {
      el.classList.add("reveal-visible");
      el.classList.remove("reveal-hidden");
    });
  },

  /**
   * Intersection olaylarını işle
   */
  handleIntersect(entries, observer) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // Bölüme visible class ekle
        entry.target.classList.add("reveal-visible");

        // Çocukları kademeli şekilde animate et
        const elementsToAnimate = entry.target.querySelectorAll(".reveal-item");
        elementsToAnimate.forEach((el, index) => {
          setTimeout(() => {
            el.classList.add("reveal-visible");
          }, CONFIG.animationStaggerDelay * (index + 1)); // Kademeli efekt
        });

        // Bölüm göründükten sonra gözlemlemeyi durdur
        observer.unobserve(entry.target);
      }
    });
  },

  /**
   * Observer'ları temizle
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
   * Uygulamayı başlat
   */
  init() {
    try {
      // Tarayıcının otomatik scroll geri yüklemesini devre dışı bırak
      if ("scrollRestoration" in history) {
        history.scrollRestoration = "manual";
      }

      // Tarayıcı hash restorasyonunu engelle
      this.preventHashRestoration();

      // Kartları oluştur ve başlat
      CardModule.createCards();
      CardModule.initCardEvents();
      CardModule.filterCards("all");

      // Modal işleyicilerini başlat
      ModalModule.init();

      // Navigasyonu ayarla
      NavigationModule.initNavigation();
      NavigationModule.initSmoothScrolling();

      // Animasyon modüllerini başlat
      AnimationModule.initTypewriter();
      AnimationModule.updateCopyrightYear();
      ScrollRevealModule.init();

      // Routing'i başlat
      RoutingModule.initRouting();

      // Event listener'ları ayarla
      EventModule.setupAllEventListeners();

      console.log("Portfolio uygulaması başarıyla başlatıldı");
    } catch (error) {
      console.error("Uygulama başlatılırken hata oluştu:", error);
      this.criticalFallback();
    }
  },

  /**
   * Hash'in tekrar geri gelmesini engelle
   */
  preventHashRestoration() {
    // Hash varsa temizle - Sayfanın ilk yüklenmesi sırasında hemen çalışacak
    if (window.location.hash) {
      history.replaceState(
        null,
        null,
        window.location.pathname + window.location.search
      );
    }
  },

  /**
   * Temiz bir başlangıç için hash'i temizle ve sayfayı en üste kaydır
   */
  cleanHashAndScrollToTop() {
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
  },

  /**
   * Çoklu deneme ile scroll pozisyonunu zorla sıfırla
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
   * Kritik hatalar için acil durum geri dönüşü
   */
  criticalFallback() {
    try {
      // Tüm içeriği animasyonsuz göster
      document
        .querySelectorAll(".reveal-section, .reveal-item, .card-item, .hide")
        .forEach((el) => {
          el.style.opacity = "1";
          el.style.transform = "none";
          el.classList.add("reveal-visible");
          el.classList.remove("hide");
          el.style.display = "flex";
        });

      // Temel kart gösterimi
      if (DOM.cardsGrid && cardsData && cardsData.length) {
        CardModule.createCards();
      }

      // Navigasyonun çalıştığından emin ol
      NavigationModule.initSmoothScrolling();

      console.log("Acil durum geri dönüşü uygulandı");
    } catch (err) {
      console.error("Geri dönüş bile başarısız oldu:", err);
    }
  },

  /**
   * Tüm kaynakları ve event listener'ları temizle
   */
  cleanup() {
    // Tüm modül kaynaklarını temizle
    ScrollRevealModule.cleanup();
    AnimationModule.cleanup();
    NavigationModule.cleanup();

    // Tüm zamanlayıcıları temizle
    AppState.clearAllTimers();

    // Durumu sıfırla
    AppState.reset();

    console.log("Uygulama temizliği tamamlandı");
  },
};

// Sayfa yüklendiğinde uygulamayı başlat
document.addEventListener("DOMContentLoaded", () => {
  AppModule.init();
});

// Sayfa yenilenmeden önce temizlik yap
window.addEventListener("beforeunload", () => {
  AppModule.cleanup();
});
