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
    // -----------------------------
    // HELPER: SAFE FETCH PER SHELF
    // Each shelf is fetched independently so one failure
    // does not block the entire dropdown from rendering.
    // -----------------------------
    async function safeFetch(url) {
      try {
        const res = await fetch(url, {
          headers: { Authorization: `jwt ${token}` },
        });
        if (!res.ok) return {};
        const data = await res.json();
        return data && typeof data === "object" ? data : {};
      } catch (err) {
        console.warn(`Shelf fetch failed for ${url}:`, err);
        return {};
      }
    }

    const [booksData, musicData, moviesData] = await Promise.all([
      safeFetch("https://scriptorium-backend-six.vercel.app/api/books/shelf"),
      safeFetch("https://scriptorium-backend-six.vercel.app/api/music/shelf"),
      safeFetch("https://scriptorium-backend-six.vercel.app/api/movies/shelf"),
    ]);

    // -----------------------------
    // NORMALIZE DATA
    // -----------------------------
    const rawBooks = [
      ...(Array.isArray(booksData.favorites) ? booksData.favorites : []),
      ...(Array.isArray(booksData.reading) ? booksData.reading : []),
      ...(Array.isArray(booksData.finished) ? booksData.finished : []),
    ];

    const rawTracks = [
      ...(Array.isArray(musicData.favorites) ? musicData.favorites : []),
      ...(Array.isArray(musicData.listening) ? musicData.listening : []),
      ...(Array.isArray(musicData.finished) ? musicData.finished : []),
    ];

    const rawMovies = [
      ...(Array.isArray(moviesData.favorites) ? moviesData.favorites : []),
      ...(Array.isArray(moviesData.watching) ? moviesData.watching : []),
      ...(Array.isArray(moviesData.watched) ? moviesData.watched : []),
    ];

    // -----------------------------
    // REMOVE DUPLICATES
    // -----------------------------
    const uniqueBooks = [...new Map(rawBooks.map((i) => [i._id, i])).values()];
    const uniqueTracks = [
      ...new Map(rawTracks.map((i) => [i._id, i])).values(),
    ];
    const uniqueMovies = [
      ...new Map(rawMovies.map((i) => [i._id, i])).values(),
    ];

    // -----------------------------
    // RESET DROPDOWN (always rebuild cleanly)
    // -----------------------------
    itemSelect.innerHTML = '<option value="">Select a memory...</option>';
    itemSelect.disabled = false;

    // -----------------------------
    // HANDLE EMPTY STATE
    // -----------------------------
    if (!uniqueBooks.length && !uniqueTracks.length && !uniqueMovies.length) {
      const opt = document.createElement("option");
      opt.text = "No items in your active shelves yet";
      opt.disabled = true;
      itemSelect.appendChild(opt);
      return;
    }

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
      const normalizedType = itemType === "music" ? "track" : itemType;
      const option = [...itemSelect.options].find((opt) => {
        try {
          const val = JSON.parse(opt.value);
          return val.id === itemId && val.type === normalizedType;
        } catch {
          return false;
        }
      });
      if (option) option.selected = true;
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

  // --- 6. REFLECTION TEMPLATES ---
  const TEMPLATES = [
    {
      id: "first-impressions",
      icon: "✨",
      iconBg: "rgba(255,218,109,0.12)",
      iconColor: "#FFDA6D",
      label: "First Impressions",
      description: "Capture your raw, unfiltered reaction",
      text:
        "My first impression was...\n\n" +
        "What immediately stood out to me was...\n\n" +
        "The moment I knew I was hooked (or not) was...\n\n" +
        "Compared to what I expected, it was...",
    },
    {
      id: "quote-reflection",
      icon: "💬",
      iconBg: "rgba(0,196,154,0.12)",
      iconColor: "#00C49A",
      label: "Quote & Meaning",
      description: "Anchor your thoughts around a memorable line",
      text:
        'A line that stayed with me: "..."\n\n' +
        "Why this resonated: ...\n\n" +
        "It made me think about my own life because...\n\n" +
        "If I had to pass this quote on to someone, I'd give it to someone who...",
    },
    {
      id: "emotional-journey",
      icon: "🌊",
      iconBg: "rgba(99,102,241,0.12)",
      iconColor: "#818cf8",
      label: "Emotional Journey",
      description: "Trace the feelings it stirred in you",
      text:
        "When I started, I felt...\n\n" +
        "The moment my emotions shifted was...\n\n" +
        "The scene / part that hit hardest was... because...\n\n" +
        "After finishing, I was left feeling...\n\n" +
        "I think it affected me this way because in my own life I...",
    },
    {
      id: "growth-lessons",
      icon: "🌱",
      iconBg: "rgba(34,197,94,0.12)",
      iconColor: "#4ade80",
      label: "Growth & Lessons",
      description: "What did you take away and learn?",
      text:
        "The biggest lesson I took from this was...\n\n" +
        "Something it challenged me to reconsider: ...\n\n" +
        "A belief it confirmed that I already held: ...\n\n" +
        "One thing I want to apply to my own life: ...\n\n" +
        "I would recommend this to someone who is going through...",
    },
    {
      id: "deep-dive",
      icon: "🔍",
      iconBg: "rgba(239,68,68,0.12)",
      iconColor: "#f87171",
      label: "Deep Dive",
      description: "A structured breakdown of craft & substance",
      text:
        "What worked really well: ...\n\n" +
        "What I felt could have been stronger: ...\n\n" +
        "The themes I noticed running through it: ...\n\n" +
        "How it fits into the creator's broader body of work: ...\n\n" +
        "My overall verdict in one sentence: ...",
    },
    {
      id: "would-i-recommend",
      icon: "📣",
      iconBg: "rgba(251,146,60,0.12)",
      iconColor: "#fb923c",
      label: "Would I Recommend?",
      description: "Write it like you're telling a friend",
      text:
        "I'd describe this to a friend as: ...\n\n" +
        "The type of person who would love this is someone who...\n\n" +
        "I'd tell them to pay attention to...\n\n" +
        "A word of warning though: ...\n\n" +
        "On a scale of 1–10 I'd give it a ___ because...",
    },
    {
      id: "then-vs-now",
      icon: "⏳",
      iconBg: "rgba(168,85,247,0.12)",
      iconColor: "#c084fc",
      label: "Then vs. Now",
      description: "Revisit something you've experienced before",
      text:
        "The last time I encountered this was...\n\n" +
        "Back then I thought / felt...\n\n" +
        "Experiencing it now, I notice...\n\n" +
        "What changed in me between then and now is...\n\n" +
        "Something that still hits the same: ...",
    },
  ];

  const templateBtn = document.getElementById("templateBtn");
  const templateDrawer = document.getElementById("templateDrawer");
  const templateOverlay = document.getElementById("templateOverlay");
  const closeTemplateDrawer = document.getElementById("closeTemplateDrawer");
  const templateList = document.getElementById("templateList");

  // Render template cards
  function renderTemplates() {
    templateList.innerHTML = "";
    TEMPLATES.forEach((tpl, i) => {
      const card = document.createElement("div");
      card.className =
        "template-card template-card-anim border border-white/8 rounded-xl p-4 flex items-start gap-3";
      card.style.animationDelay = `${i * 45}ms`;
      card.style.background = "rgba(255,255,255,0.03)";

      card.innerHTML = `
        <div class="template-icon" style="background: ${tpl.iconBg};">
          <span>${tpl.icon}</span>
        </div>
        <div class="flex-grow min-w-0">
          <div class="flex items-center justify-between gap-2">
            <h4 class="text-white text-sm font-bold leading-none">${tpl.label}</h4>
            <span class="template-use-btn px-2.5 py-1 rounded-full text-[10px] font-bold text-black shrink-0" style="background: ${tpl.iconColor};">Use this</span>
          </div>
          <p class="text-white/40 text-xs mt-1.5 leading-relaxed">${tpl.description}</p>
        </div>
      `;

      card.addEventListener("click", () => applyTemplate(tpl));
      templateList.appendChild(card);
    });
  }

  function openDrawer() {
    renderTemplates();
    templateDrawer.classList.add("open");
    templateOverlay.classList.add("open");
    templateBtn.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    templateDrawer.classList.remove("open");
    templateOverlay.classList.remove("open");
    templateBtn.classList.remove("active");
    document.body.style.overflow = "";
  }

  function applyTemplate(tpl) {
    // If textarea already has text, confirm before overwriting
    if (textArea.value.trim().length > 0) {
      const confirmed = confirm(
        "This will replace your current text. Continue?",
      );
      if (!confirmed) return;
    }

    closeDrawer();

    // Small delay so the drawer close animation plays first
    setTimeout(() => {
      textArea.value = tpl.text;

      // Trigger char count update
      const len = textArea.value.length;
      charCount.textContent = `${len} chars`;
      charCount.className =
        len < 30
          ? "absolute bottom-3 right-4 text-xs text-red-500"
          : "absolute bottom-3 right-4 text-xs text-white/30";

      // Flash the textarea border as a nice confirmation
      textArea.classList.add("fill-flash");
      setTimeout(() => textArea.classList.remove("fill-flash"), 850);

      // Focus and move cursor to the first blank
      textArea.focus();
      const firstBlank = textArea.value.indexOf("...");
      if (firstBlank !== -1) {
        textArea.setSelectionRange(firstBlank, firstBlank + 3);
      }
    }, 280);
  }

  templateBtn?.addEventListener("click", openDrawer);
  closeTemplateDrawer?.addEventListener("click", closeDrawer);
  templateOverlay?.addEventListener("click", closeDrawer);

  // Close on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && templateDrawer.classList.contains("open")) {
      closeDrawer();
    }
  });
});
