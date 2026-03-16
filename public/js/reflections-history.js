document.addEventListener("DOMContentLoaded", async () => {
  const historyContainer = document.getElementById("historyContainer");
  const loading = document.getElementById("loading");
  const emptyHistory = document.getElementById("emptyHistory");
  const itemSelect = document.getElementById("itemSelect");

  const prevBtn = document.getElementById("prevPage");
  const nextBtn = document.getElementById("nextPage");
  const pageIndicator = document.getElementById("pageIndicator");
  const pagination = document.getElementById("pagination");

  const token = localStorage.getItem("token");

  const params = new URLSearchParams(window.location.search);
  const highlightId = params.get("ref");

  if (!token) return (window.location.href = "/login");

  let page = 1;
  const limit = 5;

  // -----------------------------
  // RENDER REFLECTIONS
  // -----------------------------
  function renderReflections(reflections) {
    historyContainer.innerHTML = "";

    if (!reflections || reflections.length === 0) {
      historyContainer.classList.add("hidden");
      emptyHistory.classList.remove("hidden");
      pagination.classList.add("hidden");
      return;
    }

    emptyHistory.classList.add("hidden");
    historyContainer.classList.remove("hidden");

    reflections.forEach((ref) => {
      const div = document.createElement("div");

      div.className =
        "bg-white/5 border border-white/5 rounded-xl p-4 flex gap-4 cursor-pointer animate-slide-up hover:border-[#00C49A]/50 transition-all";

      if (ref._id === highlightId) {
        div.classList.add("highlighted");

        setTimeout(() => {
          div.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      }

      const title = ref.metadata?.title || "Unknown Item";
      const image = ref.metadata?.image || "https://via.placeholder.com/50";

      const dateStr = new Date(ref.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      div.innerHTML = `
        <div class="w-16 h-20 shrink-0 rounded-lg overflow-hidden border border-white/10 bg-black/40">
            <img src="${image}" class="w-full h-full object-cover">
        </div>

        <div class="flex-grow min-w-0">

            <div class="flex justify-between items-start mb-1">
                <h4 class="text-[#00C49A] text-sm font-bold truncate pr-2">${title}</h4>
                <span class="text-white/30 text-xs whitespace-nowrap">${dateStr}</span>
            </div>

            <p class="text-white/80 text-sm line-clamp-3 mb-2 font-light">
                "${ref.text}"
            </p>

            <div class="flex flex-wrap gap-2 mb-2">
                ${
                  ref.moodTags
                    ?.map(
                      (m) =>
                        `<span class="px-2 py-0.5 rounded-md bg-white/10 text-[10px] text-white/60">${m}</span>`,
                    )
                    .join("") || ""
                }
            </div>

            <button
              class="px-3 py-1 text-xs rounded-full border border-white/10 hover:bg-white/10 text-white/80 transition-all"
              onclick="window.location.href='/reflection/${ref._id}'"
            >
              View Reflection
            </button>

        </div>
      `;

      div.addEventListener("click", (e) => {
        if (e.target.tagName.toLowerCase() !== "button") {
          window.location.href = `/reflection/${ref._id}`;
        }
      });

      historyContainer.appendChild(div);
    });
  }

  // -----------------------------
  // UPDATE PAGINATION
  // -----------------------------
  function updatePagination(reflectionCount) {
    pageIndicator.textContent = `Page ${page}`;

    prevBtn.disabled = page === 1;
    nextBtn.disabled = reflectionCount < limit;

    pagination.classList.remove("hidden");
  }

  // -----------------------------
  // LOAD ALL REFLECTIONS
  // -----------------------------
  async function loadAllReflections() {
    loading.classList.remove("hidden");

    try {
      const res = await fetch(
        `https://scriptorium-backend-six.vercel.app/api/reflection/user?page=${page}&limit=${limit}`,
        {
          headers: { Authorization: `jwt ${token}` },
        },
      );

      const data = await res.json();
      const reflections = data.reflections || [];

      renderReflections(reflections);
      updatePagination(reflections.length);
    } catch (err) {
      console.error("Reflection fetch error:", err);
    }

    loading.classList.add("hidden");
  }

  // -----------------------------
  // FILTER BY ITEM
  // -----------------------------
  async function loadItemReflections(itemId, itemType) {
    loading.classList.remove("hidden");

    try {
      const res = await fetch(
        `https://scriptorium-backend-six.vercel.app/api/reflection/item/${itemId}?itemType=${itemType}`,
        {
          headers: { Authorization: `jwt ${token}` },
        },
      );

      const reflections = await res.json();

      renderReflections(reflections);

      // hide pagination for filtered results
      pagination.classList.add("hidden");
    } catch (err) {
      console.error("Item reflection error:", err);
    }

    loading.classList.add("hidden");
  }

  // -----------------------------
  // LOAD DROPDOWN ITEMS
  // -----------------------------
  async function loadDropdownItems() {
    try {
      const [booksRes, musicRes, moviesRes] = await Promise.all([
        fetch("https://scriptorium-backend-six.vercel.app/api/books/shelf", {
          headers: { Authorization: `jwt ${token}` },
        }),
        fetch("https://scriptorium-backend-six.vercel.app/api/music/shelf", {
          headers: { Authorization: `jwt ${token}` },
        }),
        fetch("https://scriptorium-backend-six.vercel.app/api/movies/shelf", {
          headers: { Authorization: `jwt ${token}` },
        }),
      ]);

      const booksData = await booksRes.json();
      const musicData = await musicRes.json();
      const moviesData = await moviesRes.json();

      const rawBooks = [
        ...(booksData.favorites || []),
        ...(booksData.reading || []),
        ...(booksData.finished || []),
      ];

      const rawTracks = [
        ...(musicData.favorites || []),
        ...(musicData.listening || []),
        ...(musicData.finished || []),
      ];

      const rawMovies = [
        ...(moviesData.favorites || []),
        ...(moviesData.watching || []),
        ...(moviesData.watched || []),
      ];

      const uniqueBooks = [
        ...new Map(rawBooks.map((i) => [i._id, i])).values(),
      ];
      const uniqueTracks = [
        ...new Map(rawTracks.map((i) => [i._id, i])).values(),
      ];
      const uniqueMovies = [
        ...new Map(rawMovies.map((i) => [i._id, i])).values(),
      ];

      function appendGroup(label, items, type) {
        if (!items.length) return;

        const group = document.createElement("optgroup");
        group.label = label;

        items.forEach((item) => {
          const opt = document.createElement("option");

          opt.value = JSON.stringify({
            id: item._id,
            type,
          });

          opt.text =
            type === "track"
              ? `${item.title} - ${item.artist?.name || "Unknown"}`
              : item.title;

          group.appendChild(opt);
        });

        itemSelect.appendChild(group);
      }

      appendGroup("Movies", uniqueMovies, "movie");
      appendGroup("Books", uniqueBooks, "book");
      appendGroup("Music", uniqueTracks, "track");
    } catch (err) {
      console.error("Dropdown load error:", err);
    }
  }

  // -----------------------------
  // FILTER EVENT
  // -----------------------------
  itemSelect.addEventListener("change", async () => {
    page = 1;

    if (!itemSelect.value) {
      return loadAllReflections();
    }

    const { id, type } = JSON.parse(itemSelect.value);
    loadItemReflections(id, type);
  });

  // -----------------------------
  // PAGINATION EVENTS
  // -----------------------------
  prevBtn.addEventListener("click", async () => {
    if (page > 1) {
      page--;
      await loadAllReflections();
    }
  });

  nextBtn.addEventListener("click", async () => {
    page++;
    await loadAllReflections();
  });

  // -----------------------------
  // INIT
  // -----------------------------
  await loadDropdownItems();
  await loadAllReflections();
});
