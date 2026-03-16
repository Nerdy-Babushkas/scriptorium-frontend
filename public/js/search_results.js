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

  const API_BASE = "https://scriptorium-backend-six.vercel.app/api";
  let currentItemData = null;
  let currentType =
    new URLSearchParams(window.location.search).get("type") || "movies";

  updateTabs(currentType);
  const initialQuery = new URLSearchParams(window.location.search).get("q");
  if (initialQuery) {
    display.textContent = initialQuery;
    executeSearch(initialQuery, currentType);
  }

  function switchTab(type) {
    if (currentType === type) return;

    const url = new URL(window.location);
    url.searchParams.set("type", type);
    window.history.pushState({}, "", url);

    currentType = type;
    updateTabs(type);

    const typeInput = document.querySelector('input[name="type"]');
    if (typeInput) typeInput.value = type;

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

  async function executeSearch(query, type) {
    grid.innerHTML = "";
    empty.classList.add("hidden");
    loading.classList.remove("hidden");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_BASE}/${type === "movies" ? "movies" : type}/search?q=${encodeURIComponent(query)}`,
        {
          headers: { Authorization: `jwt ${token}` },
        },
      );
      const data = await res.json();
      loading.classList.add("hidden");
      const items = data.tracks || data.movies || data.books || [];
      if (items.length > 0) renderItems(items, type);
      else empty.classList.remove("hidden");
    } catch (e) {
      console.error(e);
      if (loading) loading.classList.add("hidden");
    }
  }

  function renderItems(items, type) {
    items.forEach((item) => {
      let title, subtitle, image, year;

      if (type === "music") {
        title = item.title;
        subtitle = item.artist?.name || "Unknown Artist";
        year = item.release?.date ? item.release.date.substring(0, 4) : "N/A";
        // RESTORED VINYL LOGIC
        image = item.coverUrl
          ? `<img src="${item.coverUrl}" class="h-48 w-48 shadow-2xl rounded-full animate-spin-slow object-cover border-4 border-[#1a1a1a]">`
          : `<div class="h-48 w-48 rounded-full bg-[#1a1a1a] flex items-center justify-center shadow-2xl border-4 border-[#333] relative">
                        <div class="absolute inset-0 rounded-full border-2 border-white/10" style="margin: 10px;"></div>
                        <div class="absolute inset-0 rounded-full border-2 border-white/10" style="margin: 25px;"></div>
                        <div class="absolute inset-0 rounded-full border-2 border-white/10" style="margin: 40px;"></div>
                        <div class="w-16 h-16 bg-[#00C49A] rounded-full flex items-center justify-center"><span class="text-2xl">🎵</span></div>
                       </div>`;
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

    document.querySelectorAll(".add-trigger-btn").forEach(
      (btn) =>
        (btn.onclick = (e) => {
          currentItemData = JSON.parse(
            decodeURIComponent(e.target.dataset.item),
          );
          modalTitle.textContent = e.target.dataset.title;
          modal.classList.remove("hidden");
          if (type === "movies") {
            btnSpecial.dataset.shelf = "watching";
            btnSpecialText.textContent = "Currently Watching";
          } else if (type === "music") {
            btnSpecial.dataset.shelf = "listening";
            btnSpecialText.textContent = "Currently Listening";
          } else {
            btnSpecial.dataset.shelf = "reading";
            btnSpecialText.textContent = "Currently Reading";
          }
        }),
    );
  }

  document.querySelectorAll(".shelf-btn").forEach(
    (btn) =>
      (btn.onclick = async (e) => {
        const shelf = e.currentTarget.dataset.shelf;
        modal.classList.add("hidden");
        try {
          const token = localStorage.getItem("token");
          const res = await fetch(
            `${API_BASE}/${currentType === "movies" ? "movies" : currentType}/shelf/add`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `jwt ${token}`,
              },
              body: JSON.stringify({ ...currentItemData, shelf }),
            },
          );
          if (res.ok) showToast("Success", `Saved to ${shelf}!`, "success");
        } catch (e) {
          showToast("Error", "Failed to save", "error");
        }
      }),
  );

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

  function showToast(title, msg, type) {
    const t = document.getElementById("toast");
    document.getElementById("toastTitle").textContent = title;
    document.getElementById("toastMessage").textContent = msg;
    t.className = `fixed bottom-8 right-8 flex items-center gap-4 px-6 py-4 bg-[#0f191e] border-l-4 ${type === "success" ? "border-[#00C49A]" : "border-red-500"} rounded-xl shadow-2xl text-white transform transition-all duration-500 z-[100]`;
    t.classList.remove("translate-y-40");
    setTimeout(() => t.classList.add("translate-y-40"), 3500);
  }
  document.getElementById("closeModal").onclick = () =>
    modal.classList.add("hidden");
});
