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
  const urlType = new URLSearchParams(window.location.search).get("type");
  let currentType =
    urlType || localStorage.getItem("lastSearchType") || "movies";

  // If type wasn't in the URL, inject it so the URL stays canonical
  if (!urlType) {
    const url = new URL(window.location);
    url.searchParams.set("type", currentType);
    window.history.replaceState({}, "", url);
  }

  // Always persist the resolved type so the next search remembers it
  localStorage.setItem("lastSearchType", currentType);

  const initialQuery = new URLSearchParams(window.location.search).get("q");

  // --- Advanced Toggle ---
  advancedToggle.onclick = () => {
    const isHidden = advancedForm.classList.toggle("hidden");
    accordionIcon.style.transform = isHidden
      ? "rotate(0deg)"
      : "rotate(180deg)";
  };

  // --- Toggle advanced fields by type ---
  function toggleAdvancedFields(type) {
    const movieFields = ["actor", "genre", "movieType", "movieYear"];
    const musicFields = ["artist", "release", "musicYear"];
    const bookFields = ["author", "category", "publisher"];

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

  tabBooks.onclick = (e) => {
    e.preventDefault();
    switchTab("books");
  };
  tabMusic.onclick = (e) => {
    e.preventDefault();
    switchTab("music");
  };
  tabMovies.onclick = (e) => {
    e.preventDefault();
    switchTab("movies");
  };

  // --- Advanced Search ---
  advancedBtn.onclick = () => {
    const form = advancedForm;
    const title = form.querySelector('input[name="title"]').value;
    const actor = form.querySelector('input[name="actor"]')?.value || "";
    const genre = form.querySelector('input[name="genre"]')?.value || "";
    const movieType =
      form.querySelector('select[name="movieType"]')?.value || "";
    const movieYear =
      form.querySelector('input[name="movieYear"]')?.value || "";
    const artist = form.querySelector('input[name="artist"]')?.value || "";
    const release = form.querySelector('input[name="release"]')?.value || "";
    const musicYear =
      form.querySelector('input[name="musicYear"]')?.value || "";
    const author = form.querySelector('input[name="author"]')?.value || "";
    const category = form.querySelector('input[name="category"]')?.value || "";
    const publisher =
      form.querySelector('input[name="publisher"]')?.value || "";

    if (currentType === "movies") {
      currentQueryParams = {
        title,
        actor,
        genre,
        type: movieType,
        year: movieYear,
      };
    } else if (currentType === "music") {
      currentQueryParams = { title, artist, release, year: musicYear };
    } else if (currentType === "books") {
      currentQueryParams = { title, author, category, publisher };
    }

    currentPage = 1;
    display.textContent =
      title ||
      actor ||
      genre ||
      artist ||
      author ||
      category ||
      publisher ||
      "...";
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
    const active =
      "bg-[#00C49A]/20 text-[#00C49A] border-[#00C49A] shadow-[0_0_10px_rgba(0,196,154,0.2)]";
    const inactive = "text-white/50 hover:text-white border-transparent";
    const tabs = { books: tabBooks, music: tabMusic, movies: tabMovies };
    Object.keys(tabs).forEach((key) => {
      if (tabs[key])
        tabs[key].className =
          `px-6 py-1.5 rounded-full border font-medium text-sm transition-all ${key === type ? active : inactive}`;
    });
  }

  // --- Search logic ---
  async function executeSearch(query, type) {
    grid.innerHTML = "";
    empty.classList.add("hidden");
    loading.classList.remove("hidden");

    type = type.toLowerCase();

    if (type === "books" && /^\d+$/.test(query)) {
      query = `"${query}"`;
      query = `intitle:${query}`;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_BASE}/${type === "movies" ? "movies" : type}/search?q=${encodeURIComponent(query)}&page=${currentPage}`,
        { headers: { Authorization: `jwt ${token}` } },
      );
      const data = await res.json();
      loading.classList.add("hidden");

      const items = data.tracks || data.movies || data.books || [];
      if (items.length > 0) {
        renderItems(items, type);
        renderPagination(data.totalResults || 20);
      } else empty.classList.remove("hidden");
    } catch (err) {
      console.error(err);
      loading.classList.add("hidden");
    }
  }

  async function executeAdvancedSearch(params, type) {
    grid.innerHTML = "";
    empty.classList.add("hidden");
    loading.classList.remove("hidden");

    const pageLimits = { movies: 10, music: 25, books: 20 };
    const limit = pageLimits[type];
    try {
      const token = localStorage.getItem("token");
      const queryParams = new URLSearchParams(params);
      queryParams.set("page", currentPage); // set() never duplicates
      if (type === "music") queryParams.set("limit", limit); // only music needs this

      const url = `${API_BASE}/${type}/advanced/search?${queryParams.toString()}`;
      const res = await fetch(url, {
        headers: { Authorization: `jwt ${token}` },
      });
      const data = await res.json();
      loading.classList.add("hidden");

      let items = [];
      if (type === "music") items = data.tracks || [];
      else if (type === "movies") items = data.movies || [];
      else items = data.books || [];

      if (items.length > 0) {
        renderItems(items, type);
        renderPagination(data.totalResults || 0, limit);
      } else empty.classList.remove("hidden");
    } catch (err) {
      console.error(err);
      loading.classList.add("hidden");
    }
  }

  // --- Render items ---
  function renderItems(items, type) {
    grid.innerHTML = "";
    items.forEach((item) => {
      let title, subtitle, year, image;

      if (type === "music") {
        title = item.title;
        subtitle = item.artist?.name || "Unknown Artist";
        year = item.release?.date?.substring(0, 4) || "N/A";
        image = item.coverUrl
          ? `<img src="${item.coverUrl}" class="h-48 w-48 rounded-full shadow-2xl animate-spin-slow">`
          : `<div class="h-48 w-48 rounded-full bg-[#1a1a1a] flex items-center justify-center shadow-2xl"><span class="text-2xl">🎵</span></div>`;
      } else if (type === "movies") {
        title = item.title || item.Title;
        subtitle = (item.type || item.Type || "Movie").toUpperCase();
        year = item.year || item.Year || "N/A";
        const poster =
          (item.poster || item.Poster) !== "N/A"
            ? item.poster || item.Poster
            : "https://via.placeholder.com/300x450?text=No+Poster";
        image = `<img src="${poster}" class="h-48 w-auto shadow-2xl rounded-md transition-transform group-hover:scale-105">`;
      } else {
        title = item.title;
        subtitle = item.authors ? item.authors[0] : "Unknown Author";
        year = item.publishedDate ? item.publishedDate.substring(0, 4) : "N/A";
        const thumb =
          item.imageLinks?.thumbnail ||
          "https://via.placeholder.com/150x220?text=No+Cover";
        image = `<img src="${thumb}" class="h-48 w-auto shadow-2xl rounded-md transition-transform group-hover:scale-105">`;
      }

      const card = document.createElement("div");
      card.className =
        "group bg-[#0f191e] border border-white/10 rounded-2xl overflow-hidden hover:border-[#00C49A] transition-all flex flex-col hover:shadow-lg animate-fade-in-down";
      card.innerHTML = `
        <div class="relative p-6 flex justify-center bg-black/20 overflow-hidden">${image}</div>
        <div class="p-5 flex-grow flex flex-col">
          <h3 class="text-white font-bold truncate">${title}</h3>
          <p class="text-[#00C49A] text-sm">${subtitle}</p>
          <p class="text-white/40 text-xs mb-4">${year}</p>
          <div class="mt-auto">
            <button class="add-trigger-btn w-full py-3 bg-[#1a2c33] text-white border border-white/10 rounded-xl font-bold hover:bg-[#00C49A] hover:text-[#05181c]"
                    data-item="${encodeURIComponent(JSON.stringify(item))}" data-title="${title}">
              + Add to Library
            </button>
          </div>
        </div>`;
      grid.appendChild(card);
    });

    document.querySelectorAll(".add-trigger-btn").forEach((btn) => {
      btn.onclick = (e) => {
        currentItemData = JSON.parse(decodeURIComponent(e.target.dataset.item));
        modalTitle.textContent = e.target.dataset.title;
        modal.classList.remove("hidden");

        if (type === "movies") {
          btnSpecial.dataset.shelf = "watching";
          btnSpecialText.textContent = "Currently Watching";
          btnWishlist.dataset.shelf = "watchlist";
          btnWishlistText.textContent = "Watchlist";
          btnFinished.dataset.shelf = "watched";
          btnFinishedText.textContent = "Watched";
        } else if (type === "music") {
          btnSpecial.dataset.shelf = "listening";
          btnSpecialText.textContent = "Currently Listening";
          btnWishlist.dataset.shelf = "wishlist";
          btnWishlistText.textContent = "Wishlist";
          btnFinished.dataset.shelf = "finished";
          btnFinishedText.textContent = "Finished";
        } else {
          btnSpecial.dataset.shelf = "reading";
          btnSpecialText.textContent = "Currently Reading";
          btnWishlist.dataset.shelf = "wishlist";
          btnWishlistText.textContent = "Wishlist";
          btnFinished.dataset.shelf = "finished";
          btnFinishedText.textContent = "Finished";
        }
      };
    });
  }

  // --- Shelf buttons ---
  document.querySelectorAll(".shelf-btn").forEach((btn) => {
    btn.onclick = async (e) => {
      const shelf = e.currentTarget.dataset.shelf;
      modal.classList.add("hidden");
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/${currentType}/shelf/add`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `jwt ${token}`,
          },
          body: JSON.stringify({ ...currentItemData, shelf }),
        });
        if (res.ok) showToast("Success", `Saved to ${shelf}!`, "success");
      } catch (err) {
        showToast("Error", "Failed to save", "error");
      }
    };
  });

  // --- Toast ---
  function showToast(title, msg, type) {
    const t = document.getElementById("toast");
    document.getElementById("toastTitle").textContent = title;
    document.getElementById("toastMessage").textContent = msg;
    t.className = `fixed bottom-8 right-8 flex items-center gap-4 px-6 py-4 bg-[#0f191e] border-l-4 ${
      type === "success" ? "border-[#00C49A]" : "border-red-500"
    } rounded-xl shadow-2xl text-white transform transition-all duration-500 z-[100]`;
    t.classList.remove("translate-y-40");
    setTimeout(() => t.classList.add("translate-y-40"), 3500);
  }

  document.getElementById("closeModal").onclick = () =>
    modal.classList.add("hidden");

  function renderPagination(totalResults, limit = 20) {
    const container = document.getElementById("pagination");
    container.innerHTML = "";
    const totalPages = Math.ceil(totalResults / limit);

    if (totalPages <= 1) {
      container.classList.add("hidden");
      return;
    }

    container.classList.remove("hidden");

    const btnClass = (active) =>
      `px-4 py-2 rounded-full text-sm font-medium border transition-all ${
        active
          ? "bg-[#00C49A]/20 text-[#00C49A] border-[#00C49A]"
          : "text-white/50 border-white/10 hover:text-white hover:border-white/30"
      }`;

    // Build page window: always show first, last, current ±2
    const pages = new Set([1, totalPages]);
    for (
      let i = Math.max(1, currentPage - 2);
      i <= Math.min(totalPages, currentPage + 2);
      i++
    ) {
      pages.add(i);
    }
    const sorted = [...pages].sort((a, b) => a - b);

    // Prev button
    const prev = document.createElement("button");
    prev.textContent = "←";
    prev.className = btnClass(false);
    prev.disabled = currentPage === 1;
    prev.onclick = () => {
      currentPage--;
      changePage();
    };
    container.appendChild(prev);

    let lastPage = 0;
    for (const p of sorted) {
      if (lastPage && p - lastPage > 1) {
        const ellipsis = document.createElement("span");
        ellipsis.textContent = "…";
        ellipsis.className = "text-white/30 px-2";
        container.appendChild(ellipsis);
      }

      const btn = document.createElement("button");
      btn.textContent = p;
      btn.className = btnClass(p === currentPage);
      btn.onclick = () => {
        currentPage = p;
        changePage();
      };
      container.appendChild(btn);
      lastPage = p;
    }

    // Next button
    const next = document.createElement("button");
    next.textContent = "→";
    next.className = btnClass(false);
    next.disabled = currentPage === totalPages;
    next.onclick = () => {
      currentPage++;
      changePage();
    };
    container.appendChild(next);
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
