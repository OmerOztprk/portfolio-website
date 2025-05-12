import { cardsData } from "./cardsData.js";

/* =================== ELEMENTS =================== */
const filterButtons = document.querySelectorAll(".filter-btn");
const cardsGrid = document.querySelector(".cards-grid");
const paginationContainer = document.querySelector(".pagination");

const modalOverlay = document.querySelector(".modal-overlay");
const modalImg = document.querySelector(".modal-img");
const modalTitle = document.querySelector(".modal-title");
const modalTags = document.querySelector(".modal-tags");
const modalDescription = document.querySelector(".modal-description");
const modalClose = document.querySelector(".modal-close");
const prevBtn = document.querySelector(".gallery-nav.prev");
const nextBtn = document.querySelector(".gallery-nav.next");
const modalBtn1 = document.querySelector(".modal-buttons a:nth-child(1)");
const modalBtn2 = document.querySelector(".modal-buttons a:nth-child(2)");
const thumbsWrapper = document.querySelector(".modal-thumbs");

/* =================== GLOBAL STATE =================== */
const cardsPerPage = 6;
let cards = [];
let filteredCards = [];
let currentPage = 1;

let modalImageList = [];
let currentImageIndex = 0;
let autoSlideInterval;
let isSlideHeld = false;
let resumeTimeout;

/* =================== CREATE CARDS =================== */
const fallbackImage = "./assets/images/default.png"; // fallback image
cardsData.forEach((item) => {
  const card = document.createElement("div");
  card.className = "card-item";
  card.dataset.category = item.category;
  card.dataset.images = (
    item.images.length > 0 ? item.images : [fallbackImage]
  ).join(",");
  card.dataset.projectSlug = item.slug;

  const links = item.links
    .map(
      (l) => `<a href="${l.url}" target="_blank" class="card-link-item">
                <i class="${l.icon}"></i>
              </a>`
    )
    .join("");

  card.innerHTML = `
    <div class="card-image">
      <img src="${item.images[0] || fallbackImage}" alt="${
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
  cardsGrid.appendChild(card);
});

cards = Array.from(document.querySelectorAll(".card-item"));
filteredCards = [...cards];

/* =================== FILTERING =================== */
function filterCards(filter) {
  filteredCards = cards.filter(
    (c) => filter === "all" || c.dataset.category === filter
  );
  currentPage = 1;
  renderPagination();
  showPage(currentPage);
}

filterButtons.forEach((b, idx) => {
  if (!b.classList.contains("active")) {
    b.setAttribute("aria-pressed", "false");
  }
  b.addEventListener("click", () => {
    filterButtons.forEach((x) => {
      x.classList.remove("active");
      x.setAttribute("aria-pressed", "false");
    });
    b.classList.add("active");
    b.setAttribute("aria-pressed", "true");
    filterCards(b.dataset.filter);
  });
});

/* =================== PAGINATION =================== */
function renderPagination() {
  paginationContainer.innerHTML = "";
  const total = Math.ceil(filteredCards.length / cardsPerPage);

  const addBtn = (html, disabled, cb) => {
    const b = document.createElement("button");
    b.innerHTML = html;
    b.className = "page-btn";
    b.disabled = disabled;
    b.onclick = cb;
    paginationContainer.appendChild(b);
  };

  addBtn('<i class="fas fa-chevron-left"></i>', currentPage === 1, () => {
    currentPage--;
    showPage(currentPage);
    renderPagination();
  });

  const max = 3;
  let start = Math.max(1, currentPage - Math.floor(max / 2));
  let end = Math.min(total, start + max - 1);
  if (end - start + 1 < max) start = Math.max(1, end - max + 1);

  if (start > 1) {
    addPage(1);
    if (start > 2) paginationContainer.append(createDots());
  }
  for (let i = start; i <= end; i++) addPage(i);
  if (end < total) {
    if (end < total - 1) paginationContainer.append(createDots());
    addPage(total);
  }

  addBtn('<i class="fas fa-chevron-right"></i>', currentPage === total, () => {
    currentPage++;
    showPage(currentPage);
    renderPagination();
  });

  function addPage(n) {
    const btn = document.createElement("button");
    btn.textContent = n;
    btn.className = "page-btn";
    if (n === currentPage) btn.classList.add("active");
    btn.onclick = () => {
      currentPage = n;
      showPage(n);
      renderPagination();
    };
    paginationContainer.appendChild(btn);
  }

  function createDots() {
    const dots = document.createElement("span");
    dots.textContent = "…";
    dots.className = "pagination-dots";
    return dots;
  }
}

function showPage(page) {
  cards.forEach((c) => {
    c.style.display = "none";
    c.classList.add("hide");
  });
  const start = (page - 1) * cardsPerPage;
  filteredCards.slice(start, start + cardsPerPage).forEach((c) => {
    c.style.display = "flex";
    setTimeout(() => c.classList.remove("hide"), 50);
  });
}

/* =================== MODAL =================== */
function initModal(btn) {
  btn.addEventListener("click", () => {
    const card = btn.closest(".card-item");
    modalImageList = card.dataset.images.split(",");
    currentImageIndex = 0;
    updateModalContent(card);
    buildThumbs();
    modalOverlay.style.display = "flex";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    startSlide();
    setupImagePauseEvents();
    trapFocus(modalOverlay);
    const slug = card.dataset.projectSlug;
    history.pushState({ slug }, "", `#/${slug}`);
  });
}

/* === Modal Content Update === */
function updateModalContent(card) {
  modalImg.src = modalImageList[currentImageIndex];
  modalTitle.textContent = card.querySelector(".card-title").textContent;
  modalTags.textContent = card.querySelector(".card-tags").textContent;
  modalDescription.textContent =
    card.querySelector(".card-description").textContent;
  const links = card.querySelectorAll(".card-link-item");
  modalBtn1.href = links[0]?.href || "#";
  modalBtn2.href = links[1]?.href || "#";
  highlightThumb(currentImageIndex);
}

/* === Modal Thumbnails === */
function buildThumbs() {
  if (!thumbsWrapper) return;
  thumbsWrapper.innerHTML = "";
  modalImageList.forEach((src, i) => {
    const t = document.createElement("img");
    t.src = src;
    t.loading = "lazy";
    t.className = "modal-thumb";
    t.dataset.index = i;
    t.onclick = () => {
      pauseSlide();
      currentImageIndex = i;
      modalImg.src = src;
      highlightThumb(i);
      clearTimeout(resumeTimeout);
      resumeTimeout = setTimeout(resumeSlide, 2000);
    };
    thumbsWrapper.appendChild(t);
  });
  highlightThumb(currentImageIndex);
}

function highlightThumb(i) {
  if (!thumbsWrapper) return;
  thumbsWrapper
    .querySelectorAll(".modal-thumb")
    .forEach((t) =>
      t.classList.toggle("active", Number(t.dataset.index) === i)
    );
}

/* === Modal Slide & Image Controls === */
function setupImagePauseEvents() {
  modalImg.addEventListener("mousedown", pauseSlide);
  modalImg.addEventListener("mouseup", handleMouseUp);
  modalImg.addEventListener("mouseleave", handleMouseUp);
  modalImg.addEventListener("touchstart", pauseSlide);
  modalImg.addEventListener("touchend", handleMouseUp);
  modalImg.addEventListener("touchcancel", handleMouseUp);
}

function handleMouseUp() {
  clearTimeout(resumeTimeout);
  resumeTimeout = setTimeout(resumeSlide, 1000);
}

function startSlide() {
  clearInterval(autoSlideInterval);
  autoSlideInterval = setInterval(nextImage, 3000);
}

function pauseSlide() {
  isSlideHeld = true;
  clearInterval(autoSlideInterval);
}

function resumeSlide() {
  if (modalOverlay.style.display === "flex" && isSlideHeld) {
    isSlideHeld = false;
    startSlide();
  }
}

function nextImage() {
  currentImageIndex = (currentImageIndex + 1) % modalImageList.length;
  modalImg.src = modalImageList[currentImageIndex];
  highlightThumb(currentImageIndex);
}

function prevImage() {
  currentImageIndex =
    (currentImageIndex - 1 + modalImageList.length) % modalImageList.length;
  modalImg.src = modalImageList[currentImageIndex];
  highlightThumb(currentImageIndex);
}

/* === Modal Close & Events === */
modalClose.onclick = closeModal;
prevBtn.onclick = () => {
  pauseSlide();
  prevImage();
  clearTimeout(resumeTimeout);
  resumeTimeout = setTimeout(resumeSlide, 2000);
};
nextBtn.onclick = () => {
  pauseSlide();
  nextImage();
  clearTimeout(resumeTimeout);
  resumeTimeout = setTimeout(resumeSlide, 2000);
};

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
  if (e.key === "ArrowLeft" && modalOverlay.style.display === "flex") {
    pauseSlide();
    prevImage();
    clearTimeout(resumeTimeout);
    resumeTimeout = setTimeout(resumeSlide, 2000);
  }
  if (e.key === "ArrowRight" && modalOverlay.style.display === "flex") {
    pauseSlide();
    nextImage();
    clearTimeout(resumeTimeout);
    resumeTimeout = setTimeout(resumeSlide, 2000);
  }
});

function cleanupImagePauseEvents() {
  modalImg.removeEventListener("mousedown", pauseSlide);
  modalImg.removeEventListener("mouseup", handleMouseUp);
  modalImg.removeEventListener("mouseleave", handleMouseUp);
  modalImg.removeEventListener("touchstart", pauseSlide);
  modalImg.removeEventListener("touchend", handleMouseUp);
  modalImg.removeEventListener("touchcancel", handleMouseUp);
}

function closeModal() {
  modalOverlay.style.display = "none";
  clearInterval(autoSlideInterval);
  isSlideHeld = false;
  cleanupImagePauseEvents();
  document.body.style.overflow = "";
  document.body.style.position = "";
  document.body.style.width = "";
  const url = new URL(window.location.href);
  url.hash = "";
  history.replaceState({}, "", url.toString());
}

/* =================== CARD EVENTS =================== */
function initCardEvents() {
  document.querySelectorAll(".view-details-btn").forEach(initModal);
}

/* =================== MODAL FOCUS TRAP =================== */
function trapFocus(element) {
  const focusable = element.querySelectorAll(
    'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  element.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  });
}

/* =================== HASH ROUTING =================== */
window.addEventListener("DOMContentLoaded", () => {
  const hash = window.location.hash;
  if (hash.startsWith("#/")) {
    const slug = hash.slice(2);
    const card = [...cards].find((c) => c.dataset.projectSlug === slug);
    if (card) {
      const btn = card.querySelector(".view-details-btn");
      if (btn) btn.click();
    }
  }
});

window.addEventListener("popstate", (e) => {
  if (e.state && e.state.slug) {
    const slug = e.state.slug;
    const card = [...cards].find((c) => c.dataset.projectSlug === slug);
    if (card) {
      const btn = card.querySelector(".view-details-btn");
      if (btn) btn.click();
    }
  } else {
    closeModal();
  }
});

/* =================== APP INIT =================== */
initCardEvents();
filterCards("all");

/* =================== HEADER FUNCTIONS =================== */
document.addEventListener("DOMContentLoaded", () => {
  const mobileMenuToggle = document.querySelector(".mobile-menu-toggle");
  const body = document.body;
  const navLinks = document.querySelectorAll(".nav-link");

  mobileMenuToggle?.addEventListener("click", () => {
    body.classList.toggle("mobile-menu-open");
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      body.classList.remove("mobile-menu-open");

      navLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
    });
  });

  document.addEventListener("click", (e) => {
    if (
      body.classList.contains("mobile-menu-open") &&
      !e.target.closest(".nav-links") &&
      !e.target.closest(".mobile-menu-toggle")
    ) {
      body.classList.remove("mobile-menu-open");
    }
  });

  function setInitialActiveState() {
    const hash = window.location.hash || "#home";
    const activeLink = document.querySelector(`.nav-link[href="${hash}"]`);

    if (activeLink) {
      navLinks.forEach((l) => l.classList.remove("active"));
      activeLink.classList.add("active");
    }
  }

  setInitialActiveState();

  window.addEventListener("scroll", () => {
    if (!window.requestAnimationFrame) {
      return;
    }

    window.requestAnimationFrame(() => {
      const scrollPosition = window.scrollY;
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

      if (currentSection !== "") {
        const shouldBeActive = document.querySelector(
          `.nav-link[href="${currentSection}"]`
        );

        if (shouldBeActive && !shouldBeActive.classList.contains("active")) {
          navLinks.forEach((l) => l.classList.remove("active"));
          shouldBeActive.classList.add("active");
        }
      }
    });
  });
});
