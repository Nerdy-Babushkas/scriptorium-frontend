document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("resultsGrid");
  const loading = document.getElementById("loadingState");
  const empty = document.getElementById("emptyState");
  const display = document.getElementById("queryDisplay");
  const modal = document.getElementById("shelfModal");
  const tabBooks = document.getElementById("tab-books");
  const tabMusic = document.getElementById("tab-music");
  const tabMovies = document.getElementById("tab-movies");
  const modalTitle = document.getElementById("modalBookTitle");
  const btnSpecial = document.getElementById("btn-reading");
  const btnSpecialText = document.getElementById("btn-reading-text");
  const titleInput = document.querySelector('input[name="title"]');

  const advancedToggle = document.getElementById("advancedSearchToggle");
  const advancedForm = document.getElementById("advancedSearch");
  const accordionIcon = document.getElementById("accordionIcon");
  const advancedBtn = document.getElementById("advancedSearchBtn");

  const btnWishlist = document.getElementById("btn-wishlist");
  const btnWishlistText = document.getElementById("btn-wishlist-text");
  const btnFinished = document.getElementById("btn-finished");
  const btnFinishedText = document.getElementById("btn-finished-text");

  const API_BASE = "https://scriptorium-backend-six.vercel.app/api";
  let currentPage = 1;
  let currentQueryParams = {};
  let currentItemData = null;

  // --- Remember last used search type across searches ---
  const urlType = new URLSearchParams(window.location.search).get("type");
  let currentType = urlType || localStorage.getItem("lastSearchType") || "movies";

  if (!urlType) {
    const url = new URL(window.location);
    url.searchParams.set("type", currentType);
    window.history.replaceState({}, "", url);
  }
  localStorage.setItem("lastSearchType", currentType);

  const PAGE_LIMITS = { movies: 10, music: 25, books: 20 };
  const MAX_PAGES = 10;

  const initialQuery = new URLSearchParams(window.location.search).get("q");

  // --- Advanced Toggle ---
  advancedToggle.onclick = () => {
    const isHidden = advancedForm.classList.toggle("hidden");
    accordionIcon.style.transform = isHidden ? "rotate(0deg)" : "rotate(180deg)";
  };

  // --- Toggle advanced fields by type ---
  function toggleAdvancedFields(type) {
    const movieFields = ["actor", "genre", "movieType", "movieYear"];
    const musicFields = ["artist", "release", "musicYear"];
    const bookFields  = ["author", "category", "publisher"];

    movieFields.forEach((name) => {
      const el = advancedForm.querySelector(`[name="${name}"]`);
      if (el) el.classList.toggle("hidden", type !== "movies");
    });
    musicFields.forEach((name) => {
      const el = advancedForm.querySelector(`[name="${name}"]`);
      if (el) el.classList.toggle("hidden", type !== "music");
    });
    bookFields.forEach((name) => {
      const el = advancedForm.querySelector(`[name="${name}"]`);
      if (el) el.classList.toggle("hidden", type !== "books");
    });
  }

  // --- Switch tabs ---
  function switchTab(type) {
    if (type === "movies") {
      advancedForm.classList.remove("hidden");
      accordionIcon.style.transform = "rotate(180deg)";
    } else {
      advancedForm.classList.add("hidden");
      accordionIcon.style.transform = "rotate(0deg)";
    }

    if (currentType === type) return;

    currentType = type;
    currentPage = 1;
    localStorage.setItem("lastSearchType", type);
    updateTabs(type);
    toggleAdvancedFields(type);

    const url = new URL(window.location);
    url.searchParams.set("type", type);
    window.history.pushState({}, "", url);

    const query = new URLSearchParams(window.location.search).get("q");
    if (query) executeSearch(query, type);
  }

  tabBooks.onclick  = (e) => { e.preventDefault(); switchTab("books"); };
  tabMusic.onclick  = (e) => { e.preventDefault(); switchTab("music"); };
  tabMovies.onclick = (e) => { e.preventDefault(); switchTab("movies"); };

  // --- Advanced Search ---
  advancedBtn.onclick = () => {
    const form = advancedForm;
    const title     = form.querySelector('input[name="title"]').value;
    const actor     = form.querySelector('input[name="actor"]')?.value     || "";
    const genre     = form.querySelector('input[name="genre"]')?.value     || "";
    const movieType = form.querySelector('select[name="movieType"]')?.value || "";
    const movieYear = form.querySelector('input[name="movieYear"]')?.value  || "";
    const artist    = form.querySelector('input[name="artist"]')?.value    || "";
    const release   = form.querySelector('input[name="release"]')?.value   || "";
    const musicYear = form.querySelector('input[name="musicYear"]')?.value  || "";
    const author    = form.querySelector('input[name="author"]')?.value    || "";
    const category  = form.querySelector('input[name="category"]')?.value  || "";
    const publisher = form.querySelector('input[name="publisher"]')?.value  || "";

    if (currentType === "movies") {
      currentQueryParams = { title, actor, genre, type: movieType, year: movieYear };
    } else if (currentType === "music") {
      currentQueryParams = { title, artist, release, year: musicYear };
    } else if (currentType === "books") {
      currentQueryParams = { title, author, category, publisher };
    }

    currentPage = 1;
    display.textContent = title || actor || genre || artist || author || category || publisher || "...";
    executeAdvancedSearch(currentQueryParams, currentType);
  };

  // --- Initial setup ---
  advancedForm.classList.add("hidden");
  accordionIcon.style.transform = "rotate(0deg)";

  if (initialQuery && titleInput) {
    titleInput.value = initialQuery;
    display.textContent = initialQuery;
    executeSearch(initialQuery, currentType);
  }

  updateTabs(currentType);
  toggleAdvancedFields(currentType);

  // --- Update tabs UI ---
  function updateTabs(type) {
    [
      { el: tabBooks,  key: "books"  },
      { el: tabMusic,  key: "music"  },
      { el: tabMovies, key: "movies" },
    ].forEach(({ el, key }) => {
      if (!el) return;
      el.classList.toggle("active", key === type);
    });
  }

  // --- Search logic ---
  async function executeSearch(query, type) {
    grid.innerHTML = "";
    empty.classList.remove("visible");
    loading.classList.add("visible");

    type = type.toLowerCase();

    if (type === "books" && /^\d+$/.test(query)) {
      query = `intitle:"${query}"`;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_BASE}/${type === "movies" ? "movies" : type}/search?q=${encodeURIComponent(query)}&page=${currentPage}`,
        { headers: { Authorization: `jwt ${token}` } }
      );
      const data = await res.json();
      loading.classList.remove("visible");

      const items = data.tracks || data.movies || data.books || [];
      if (items.length > 0) {
        renderItems(items, type);
        const limit = PAGE_LIMITS[type] || 20;
        const cappedTotal = Math.min(data.totalResults || limit, MAX_PAGES * limit);
        renderPagination(cappedTotal, limit);
      } else {
        empty.classList.add("visible");
      }
    } catch (err) {
      console.error(err);
      loading.classList.remove("visible");
    }
  }

  async function executeAdvancedSearch(params, type) {
    grid.innerHTML = "";
    empty.classList.remove("visible");
    loading.classList.add("visible");

    const limit = PAGE_LIMITS[type] || 20;
    try {
      const token = localStorage.getItem("token");
      const queryParams = new URLSearchParams(params);
      queryParams.set("page", currentPage);
      if (type === "music") queryParams.set("limit", limit);

      const url = `${API_BASE}/${type}/advanced/search?${queryParams.toString()}`;
      const res = await fetch(url, { headers: { Authorization: `jwt ${token}` } });
      const data = await res.json();
      loading.classList.remove("visible");

      let items = [];
      if (type === "music")       items = data.tracks || [];
      else if (type === "movies") items = data.movies || [];
      else                        items = data.books  || [];

      if (items.length > 0) {
        renderItems(items, type);
        const cappedTotal = Math.min(data.totalResults || limit, MAX_PAGES * limit);
        renderPagination(cappedTotal, limit);
      } else {
        empty.classList.add("visible");
      }
    } catch (err) {
      console.error(err);
      loading.classList.remove("visible");
    }
  }

  // --- Render items ---
  function renderItems(items, type) {
    grid.innerHTML = "";
    items.forEach((item) => {
      let title, subtitle, year, imgHtml, typeLabel;

      if (type === "music") {
        title     = item.title;
        subtitle  = item.artist?.name || "Unknown Artist";
        year      = item.release?.date?.substring(0, 4) || "N/A";
        typeLabel = "Music";
        imgHtml   = item.coverUrl
          ? `<img src="${item.coverUrl}" alt="${title}">`
          : `<span class="sr-card-img-placeholder">🎵</span>`;
        imgHtml = `<div class="sr-card-img sr-card-img--vinyl">${imgHtml}</div>`;
      } else if (type === "movies") {
        title     = item.title || item.Title;
        subtitle  = (item.type || item.Type || "Movie").toUpperCase();
        year      = item.year || item.Year || "N/A";
        typeLabel = "Movie";
        const poster = (item.poster || item.Poster) !== "N/A"
          ? (item.poster || item.Poster)
          : null;
        imgHtml = `<div class="sr-card-img">${
          poster
            ? `<img src="${poster}" alt="${title}">`
            : `<span class="sr-card-img-placeholder">🎬</span>`
        }</div>`;
      } else {
        title     = item.title;
        subtitle  = item.authors ? item.authors[0] : "Unknown Author";
        year      = item.publishedDate ? item.publishedDate.substring(0, 4) : "N/A";
        typeLabel = "Book";
        const thumb = item.imageLinks?.thumbnail || null;
        imgHtml = `<div class="sr-card-img">${
          thumb
            ? `<img src="${thumb}" alt="${title}">`
            : `<span class="sr-card-img-placeholder">📚</span>`
        }</div>`;
      }

      const card = document.createElement("div");
      card.className = "sr-card";
      card.innerHTML = `
        ${imgHtml}
        <div class="sr-card-body">
          <span class="sr-card-type">${typeLabel}</span>
          <h3 class="sr-card-title">${title}</h3>
          <p class="sr-card-sub">${subtitle}</p>
          <p class="sr-card-year">${year}</p>
          <button class="add-trigger-btn sr-add-btn"
                  data-item="${encodeURIComponent(JSON.stringify(item))}"
                  data-title="${title}">
            + Add to Library
          </button>
        </div>`;
      grid.appendChild(card);
    });

    document.querySelectorAll(".add-trigger-btn").forEach((btn) => {
      btn.onclick = (e) => {
        currentItemData = JSON.parse(decodeURIComponent(e.currentTarget.dataset.item));
        modalTitle.textContent = e.currentTarget.dataset.title;
        modal.classList.add("visible");

        if (type === "movies") {
          btnSpecial.dataset.shelf     = "watching";
          btnSpecialText.textContent   = "Currently Watching";
          btnWishlist.dataset.shelf    = "watchlist";
          btnWishlistText.textContent  = "Watchlist";
          btnFinished.dataset.shelf    = "watched";
          btnFinishedText.textContent  = "Watched";
        } else if (type === "music") {
          btnSpecial.dataset.shelf     = "listening";
          btnSpecialText.textContent   = "Currently Listening";
          btnWishlist.dataset.shelf    = "wishlist";
          btnWishlistText.textContent  = "Wishlist";
          btnFinished.dataset.shelf    = "finished";
          btnFinishedText.textContent  = "Finished";
        } else {
          btnSpecial.dataset.shelf     = "reading";
          btnSpecialText.textContent   = "Currently Reading";
          btnWishlist.dataset.shelf    = "wishlist";
          btnWishlistText.textContent  = "Wishlist";
          btnFinished.dataset.shelf    = "finished";
          btnFinishedText.textContent  = "Finished";
        }
      };
    });
  }

  // --- Shelf buttons ---
  document.querySelectorAll(".shelf-btn").forEach((btn) => {
    btn.onclick = async (e) => {
      const shelf = e.currentTarget.dataset.shelf;
      modal.classList.remove("visible");
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/${currentType}/shelf/add`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `jwt ${token}` },
          body: JSON.stringify({ ...currentItemData, shelf }),
        });
        if (res.ok) showToast("Saved!", `Added to ${shelf}`, "success");
        else        showToast("Error",  "Failed to save",    "error");
      } catch (err) {
        showToast("Error", "Failed to save", "error");
      }
    };
  });

  // --- Toast ---
  function showToast(title, msg, type) {
    const t = document.getElementById("toast");
    document.getElementById("toastTitle").textContent   = title;
    document.getElementById("toastMessage").textContent = msg;
    t.style.borderLeftColor = type === "success" ? "var(--teal)" : "var(--rose)";
    t.style.transform = "translateY(0)";
    setTimeout(() => { t.style.transform = "translateY(160px)"; }, 3500);
  }

  document.getElementById("closeModal").onclick = () => modal.classList.remove("visible");

  // --- Pagination ---
  function renderPagination(totalResults, limit = 20) {
    const container = document.getElementById("pagination");
    container.innerHTML = "";
    const totalPages = Math.min(Math.ceil(totalResults / limit), MAX_PAGES);

    if (totalPages <= 1) {
      container.classList.remove("visible");
      return;
    }
    container.classList.add("visible");

    const makeBtn = (label, page, isActive, isDisabled) => {
      const btn = document.createElement("button");
      btn.textContent = label;
      btn.className   = `sr-page-btn${isActive ? " active" : ""}`;
      btn.disabled    = isDisabled;
      if (!isDisabled) btn.onclick = () => { currentPage = page; changePage(); };
      return btn;
    };

    container.appendChild(makeBtn("←", currentPage - 1, false, currentPage === 1));

    const pages = new Set([1, totalPages]);
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
      pages.add(i);
    }
    const sorted = [...pages].sort((a, b) => a - b);

    let lastPage = 0;
    for (const p of sorted) {
      if (lastPage && p - lastPage > 1) {
        const ellipsis = document.createElement("span");
        ellipsis.textContent = "…";
        ellipsis.className   = "sr-page-ellipsis";
        container.appendChild(ellipsis);
      }
      container.appendChild(makeBtn(p, p, p === currentPage, false));
      lastPage = p;
    }

    container.appendChild(makeBtn("→", currentPage + 1, false, currentPage === totalPages));
  }

  function changePage() {
    window.scrollTo({ top: 0, behavior: "smooth" });
    const query = new URLSearchParams(window.location.search).get("q");
    if (Object.keys(currentQueryParams).length > 0) {
      executeAdvancedSearch(currentQueryParams, currentType);
    } else if (query) {
      executeSearch(query, currentType);
    }
  }
});