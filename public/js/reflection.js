document.addEventListener("DOMContentLoaded", () => {
  // --- ELEMENTS ---
  const itemSelect = document.getElementById("itemSelect");
  const moodBtns = document.querySelectorAll(".mood-btn");
  const textArea = document.getElementById("reflectionText");
  const charCount = document.getElementById("charCount");
  const saveBtn = document.getElementById("saveBtn");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  const editModeIndicator = document.getElementById("editModeIndicator");

  const historyList = document.getElementById("historyList");
  const loadingHistory = document.getElementById("loadingHistory");
  const emptyHistory = document.getElementById("emptyHistory");
  const historyFooter = document.getElementById("historyFooter");

  const params = new URLSearchParams(window.location.search);
  const itemId = params.get("itemId");
  const itemType = params.get("itemType");

  // State
  let selectedMoods = [];
  let editingId = null;
  let reflectionsMap = {};
  const token = localStorage.getItem("token");

  if (!token) window.location.href = "/login";

  // --- 1. INITIALIZATION ---
  loadDropdownItems();
  loadHistory();

  // --- 2. DROPDOWN POPULATION ---
  async function loadDropdownItems() {
    try {
      // -----------------------------
      // FETCH ALL DATA
      // -----------------------------
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

      // -----------------------------
      // NORMALIZE DATA
      // -----------------------------
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

      // -----------------------------
      // REMOVE DUPLICATES
      // -----------------------------
      const uniqueBooks = [
        ...new Map(rawBooks.map((i) => [i._id, i])).values(),
      ];
      const uniqueTracks = [
        ...new Map(rawTracks.map((i) => [i._id, i])).values(),
      ];
      const uniqueMovies = [
        ...new Map(rawMovies.map((i) => [i._id, i])).values(),
      ];

      // -----------------------------
      // HANDLE EMPTY STATE
      // -----------------------------
      if (!uniqueBooks.length && !uniqueTracks.length && !uniqueMovies.length) {
        itemSelect.innerHTML = "";
        const opt = document.createElement("option");
        opt.text = "No items in your active shelves";
        itemSelect.appendChild(opt);
        itemSelect.disabled = true;
        return;
      }

      // -----------------------------
      // RESET DROPDOWN
      // -----------------------------
      itemSelect.innerHTML = '<option value="">Select a memory...</option>';

      // -----------------------------
      // HELPER: APPEND GROUP
      // -----------------------------
      function appendGroup(label, items, type) {
        if (!items.length) return;

        const group = document.createElement("optgroup");
        group.label = label;

        items.forEach((item) => {
          const opt = document.createElement("option");

          opt.value = JSON.stringify({
            id: item._id,
            type,
            title: item.title,
            image:
              type === "movie"
                ? item.poster
                : type === "book"
                  ? item.imageLinks?.thumbnail
                  : item.coverUrl,
          });

          opt.text =
            type === "track"
              ? `${item.title} - ${item.artist?.name || "Unknown"}`
              : item.title;

          group.appendChild(opt);
        });

        itemSelect.appendChild(group);
      }

      // -----------------------------
      // BUILD DROPDOWN
      // -----------------------------
      appendGroup("Movies", uniqueMovies, "movie");
      appendGroup("Books", uniqueBooks, "book");
      appendGroup("Music", uniqueTracks, "track");

      // -----------------------------
      // AUTO-SELECT FROM URL
      // -----------------------------
      if (itemId && itemType) {
        const option = [...itemSelect.options].find((opt) => {
          try {
            const val = JSON.parse(opt.value);
            return val.id === itemId && val.type === itemType;
          } catch {
            return false;
          }
        });

        if (option) {
          option.selected = true;
        }
      }
    } catch (error) {
      console.error("Dropdown error:", error);
      showToast("Error", "Failed to load shelf items", "error");
    }
  }

  // --- 3. UI INTERACTIONS ---
  moodBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mood = btn.dataset.mood;
      if (selectedMoods.includes(mood)) {
        selectedMoods = selectedMoods.filter((m) => m !== mood);
        btn.classList.remove("selected");
      } else if (selectedMoods.length < 3) {
        selectedMoods.push(mood);
        btn.classList.add("selected");
      }
    });
  });

  textArea.addEventListener("input", () => {
    const len = textArea.value.length;
    charCount.textContent = `${len} chars`;
    charCount.className =
      len < 30
        ? "absolute bottom-3 right-4 text-xs text-red-500"
        : "absolute bottom-3 right-4 text-xs text-white/30";
  });

  cancelEditBtn.addEventListener("click", resetForm);

  saveBtn.addEventListener("click", async () => {
    const text = textArea.value.trim();
    const itemVal = itemSelect.value;

    if (!itemVal) return showToast("Warning", "Please select an item", "error");
    if (text.length < 30)
      return showToast(
        "Warning",
        "Reflection must be at least 30 characters",
        "error",
      );

    const itemData = JSON.parse(itemVal);
    const payload = {
      text: text,
      moodTags: selectedMoods,
      itemId: itemData.id,
      itemType: itemData.type,
      metadata: { title: itemData.title, image: itemData.image },
    };

    saveBtn.disabled = true;
    saveBtn.textContent = "Processing...";

    try {
      let url = "https://scriptorium-backend-six.vercel.app/api/reflection/add";
      let method = "POST";

      if (editingId) {
        url = `https://scriptorium-backend-six.vercel.app/api/reflection/update/${editingId}`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `jwt ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(
          "Success",
          editingId ? "Reflection updated" : "Reflection saved",
          "success",
        );
        resetForm();
        loadHistory();
      } else {
        const data = await res.json();
        showToast("Error", data.message || "Action failed", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Error", "Network error", "error");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Reflection";
    }
  });

  // --- 4. HISTORY ---
  async function loadHistory(page = 1, limit = 4) {
    loadingHistory.classList.remove("hidden");
    historyList.innerHTML = "";
    historyList.classList.add("hidden");
    emptyHistory.classList.add("hidden");

    try {
      const res = await fetch(
        `https://scriptorium-backend-six.vercel.app/api/reflection/user?page=${page}&limit=${limit}`,
        {
          headers: { Authorization: `jwt ${token}` },
        },
      );
      const data = await res.json();
      loadingHistory.classList.add("hidden");

      const reflections = data.reflections || [];

      if (reflections.length === 0) {
        emptyHistory.classList.remove("hidden");
        historyFooter.classList.add("hidden"); // hide footer if empty
      } else {
        historyList.classList.remove("hidden");
        historyFooter.classList.remove("hidden"); // SHOW the button
        reflections.forEach((ref) => {
          reflectionsMap[ref._id] = ref;
          renderCard(ref);
        });
      }

      // Optional: pagination info
      console.log(
        `Showing page ${data.page} of reflections, total: ${data.total}`,
      );
    } catch (e) {
      console.error(e);
      loadingHistory.innerHTML = "Failed to load history";
    }
  }
  function renderCard(ref) {
    const date = new Date(ref.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const title = ref.metadata?.title || "Unknown Item";

    let typeIcon = "📖";
    if (ref.itemType === "track") typeIcon = "🎵";
    else if (ref.itemType === "movie") typeIcon = "🎬";

    const div = document.createElement("div");
    div.className =
      "history-card bg-white/5 border border-white/5 rounded-xl p-4 hover:border-[#00C49A]/50 transition-all group flex gap-4 cursor-pointer";

    div.innerHTML = `
          <div class="w-16 h-20 shrink-0 rounded-lg overflow-hidden border border-white/10 bg-black/40">
              <img src="${ref.metadata?.image || "https://via.placeholder.com/50"}" class="w-full h-full object-cover">
          </div>
          <div class="flex-grow min-w-0">
              <div class="flex justify-between items-start mb-1">
                  <h4 class="text-[#00C49A] text-sm font-bold truncate pr-2">${title}</h4>
                  <span class="text-white/30 text-xs whitespace-nowrap">${date}</span>
              </div>
              <p class="text-white/80 text-sm line-clamp-2 mb-2 font-light">"${ref.text}"</p>
              <div class="flex justify-between items-center mt-2">
                  <div class="flex flex-wrap gap-2">
                      <span class="text-xs">${typeIcon}</span>
                      ${ref.moodTags.map((m) => `<span class="px-2 py-0.5 rounded-md bg-white/10 text-[10px] text-white/60">${m}</span>`).join("")}
                  </div>
                  <div class="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button class="text-white/50 hover:text-white" onclick="editRef('${ref._id}')">✏️</button>
                      <button class="text-red-500/50 hover:text-red-500" onclick="deleteRef('${ref._id}')">🗑️</button>
                      <button class="text-[#00C49A]/80 hover:text-[#00C49A] text-xs font-bold" onclick="viewRef('${ref._id}')">View Reflection</button>
                  </div>
              </div>
          </div>
      `;

    // Clicking anywhere on the card except the edit/delete/view buttons goes to history
    div.addEventListener("click", (e) => {
      const targetClasses = e.target.classList;
      if (
        !e.target.closest("button") // ignore clicks on buttons
      ) {
        window.location.href = "/reflection/" + ref._id;
      }
    });

    historyList.appendChild(div);
  }

  window.viewRef = (id) => {
    window.location.href = `/reflection/${id}`;
  };

  window.deleteRef = async (id) => {
    if (!confirm("Delete this entry?")) return;
    try {
      const res = await fetch(
        `https://scriptorium-backend-six.vercel.app/api/reflection/remove/${id}`,
        {
          method: "DELETE",
          headers: { Authorization: `jwt ${token}` },
        },
      );
      if (res.ok) {
        showToast("Success", "Deleted", "success");
        loadHistory();
      }
    } catch (e) {
      console.error(e);
    }
  };

  window.editRef = (id) => {
    const ref = reflectionsMap[id];
    if (!ref) return;

    editingId = ref._id;
    textArea.value = ref.text;
    selectedMoods = ref.moodTags || [];

    moodBtns.forEach((btn) => {
      btn.classList.toggle(
        "selected",
        selectedMoods.includes(btn.dataset.mood),
      );
    });

    for (let i = 0; i < itemSelect.options.length; i++) {
      try {
        const optVal = JSON.parse(itemSelect.options[i].value);
        const currentId = ref.itemId || ref.item;

        if (optVal.id === currentId) {
          itemSelect.selectedIndex = i;
          break;
        }
      } catch (e) {}
    }

    editModeIndicator.classList.remove("hidden");
    cancelEditBtn.classList.remove("hidden");
    saveBtn.textContent = "Update Reflection";

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  function resetForm() {
    editingId = null;
    textArea.value = "";
    itemSelect.selectedIndex = 0;
    selectedMoods = [];
    moodBtns.forEach((btn) => btn.classList.remove("selected"));
    charCount.textContent = "0 chars";
    editModeIndicator.classList.add("hidden");
    cancelEditBtn.classList.add("hidden");
    saveBtn.textContent = "Save Reflection";
  }

  function showToast(title, msg, type) {
    const toast = document.getElementById("toast");
    document.getElementById("toastTitle").textContent = title;
    document.getElementById("toastMessage").textContent = msg;
    const color =
      type === "success"
        ? "bg-[#064e3b] border-[#00C49A]"
        : "bg-[#450a0a] border-red-500";
    toast.className = `fixed bottom-8 right-8 flex items-center gap-4 px-6 py-4 ${color} border-l-4 rounded-xl shadow-2xl text-white transform transition-all duration-500 z-[100]`;
    toast.classList.remove("translate-y-40");
    setTimeout(() => toast.classList.add("translate-y-40"), 3500);
  }

  document
    .getElementById("viewFullHistoryBtn")
    ?.addEventListener("click", () => {
      window.location.href = "/reflections-history";
    });

  // --- 5. HISTORY PANEL REDIRECT ON OUTSIDE CLICK ---
  // Select the history panel
  const historyPanel = document.querySelector(".lg\\:col-span-5");

  // Make it feel interactive
  if (historyPanel) {
    historyPanel.style.cursor = "pointer"; // change cursor
    historyPanel.addEventListener("mouseenter", () => {
      historyPanel.style.opacity = "0.95"; // optional subtle effect
    });
    historyPanel.addEventListener("mouseleave", () => {
      historyPanel.style.opacity = "1"; // back to normal
    });
  }

  historyPanel?.addEventListener("click", (e) => {
    // If the click is outside any card
    if (!e.target.closest(".history-card")) {
      window.location.href = "/reflections-history";
    }
  });
});
