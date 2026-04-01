document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  if (!token) return (window.location.href = "/login");

  const reflectionId = window.__REFLECTION_ID__;

  // --- ELEMENTS ---
  const loading = document.getElementById("loading");
  const container = document.getElementById("reflectionContainer");
  const itemTitle = document.getElementById("itemTitle");
  const itemImage = document.getElementById("itemImage");
  const itemDate = document.getElementById("itemDate");
  const reflectionText = document.getElementById("reflectionText");
  const reflectionBody = document.getElementById("reflectionBody");
  const moodTags = document.getElementById("moodTags");
  const moodEditor = document.getElementById("moodEditor");
  const moodBtnContainer = document.getElementById("moodBtnContainer");
  const moodBtns = moodBtnContainer.querySelectorAll(".mood-btn");
  const backBtn = document.getElementById("backBtn");
  const editBtn = document.getElementById("editBtn");
  const deleteBtn = document.getElementById("deleteBtn");
  const saveEditBtn = document.getElementById("saveEditBtn");
  const cancelEditBtn = document.getElementById("cancelEditBtn");

  // --- STATE ---
  let isEditing = false;
  let originalText = "";
  let currentMoods = []; // moods as loaded from the server
  let selectedMoods = []; // moods being edited

  // ─────────────────────────────────────────────
  // TOAST
  // ─────────────────────────────────────────────
  const toast = document.getElementById("toast");
  const toastIcon = document.getElementById("toastIcon");
  const toastTitle = document.getElementById("toastTitle");
  const toastMessage = document.getElementById("toastMessage");
  let toastTimer;

  function showToast(title, msg, type = "success") {
    clearTimeout(toastTimer);
    toastTitle.textContent = title;
    toastMessage.textContent = msg;
    toastIcon.textContent = type === "success" ? "✅" : "❌";
    const color =
      type === "success"
        ? "bg-[#064e3b] border-[#00C49A]"
        : "bg-[#450a0a] border-red-500";
    toast.className = `fixed bottom-8 right-8 flex items-center gap-4 px-6 py-4 ${color} border-l-4 rounded-xl shadow-2xl text-white transform transition-all duration-500 z-[100]`;
    toast.classList.remove("translate-y-40");
    toastTimer = setTimeout(() => toast.classList.add("translate-y-40"), 3500);
  }

  // ─────────────────────────────────────────────
  // CUSTOM CONFIRM MODAL
  // ─────────────────────────────────────────────
  const confirmModal = document.getElementById("confirmModal");
  const confirmBox = document.getElementById("confirmBox");
  const confirmTitle = document.getElementById("confirmTitle");
  const confirmMessage = document.getElementById("confirmMessage");
  const confirmOk = document.getElementById("confirmOk");
  const confirmCancel = document.getElementById("confirmCancel");

  /**
   * showConfirm({ title, message, okLabel, danger })
   * Returns a Promise<boolean> — true if the user clicked OK.
   */
  function showConfirm({
    title = "Are you sure?",
    message = "",
    okLabel = "Confirm",
    danger = false,
  } = {}) {
    return new Promise((resolve) => {
      confirmTitle.textContent = title;
      confirmMessage.textContent = message;
      confirmOk.textContent = okLabel;
      confirmOk.className = danger
        ? "px-5 py-2 rounded-full text-sm font-bold bg-red-600 text-white hover:bg-red-500 transition-all"
        : "px-5 py-2 rounded-full text-sm font-bold bg-[#00C49A] text-black hover:bg-white transition-all";

      confirmModal.classList.add("open");

      function cleanup(result) {
        confirmModal.classList.remove("open");
        confirmOk.removeEventListener("click", onOk);
        confirmCancel.removeEventListener("click", onCancel);
        resolve(result);
      }

      function onOk() {
        cleanup(true);
      }
      function onCancel() {
        cleanup(false);
      }

      confirmOk.addEventListener("click", onOk);
      confirmCancel.addEventListener("click", onCancel);
    });
  }

  // Close modal on backdrop click
  confirmModal.addEventListener("click", (e) => {
    if (e.target === confirmModal) confirmModal.classList.remove("open");
  });

  // ─────────────────────────────────────────────
  // MOOD BUTTONS
  // ─────────────────────────────────────────────
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

  /** Sync button visual state to a given moods array */
  function applyMoodSelection(moods) {
    moodBtns.forEach((btn) => {
      if (moods.includes(btn.dataset.mood)) {
        btn.classList.add("selected");
      } else {
        btn.classList.remove("selected");
      }
    });
  }

  /** Render read-only mood tag chips */
  function renderMoodTags(moods) {
    moodTags.innerHTML = "";
    moods.forEach((m) => {
      const span = document.createElement("span");
      span.className =
        "px-3 py-1 rounded-lg bg-[#00C49A]/20 text-sm md:text-base font-medium text-[#00C49A] hover:bg-[#00C49A]/30 transition-all";
      span.textContent = m;
      moodTags.appendChild(span);
    });
  }

  // ─────────────────────────────────────────────
  // ENTER EDIT MODE
  // ─────────────────────────────────────────────
  function enterEditMode() {
    isEditing = true;
    originalText = reflectionText.textContent;

    // Swap <p> for <textarea>
    const textarea = document.createElement("textarea");
    textarea.id = "reflectionEditTextarea";
    textarea.value = originalText;
    textarea.className =
      "w-full p-4 rounded-xl bg-black/20 border border-white/10 text-white/80 font-light text-lg focus:border-[#00C49A] focus:outline-none resize-none transition-all";
    textarea.style.minHeight = "160px";
    textarea.rows = 8;
    reflectionText.replaceWith(textarea);
    textarea.focus();

    // Swap mood chips for mood buttons
    selectedMoods = [...currentMoods];
    applyMoodSelection(selectedMoods);
    moodTags.classList.add("hidden");
    moodEditor.classList.remove("hidden");

    // Swap action buttons
    editBtn.classList.add("hidden");
    deleteBtn.classList.add("hidden");
    saveEditBtn.classList.remove("hidden");
    cancelEditBtn.classList.remove("hidden");
  }

  // ─────────────────────────────────────────────
  // EXIT EDIT MODE (cancel)
  // ─────────────────────────────────────────────
  function exitEditMode() {
    isEditing = false;

    // Restore <p>
    const p = document.createElement("p");
    p.id = "reflectionText";
    p.className =
      "text-white/80 text-lg md:text-xl font-light whitespace-pre-line leading-relaxed";
    p.textContent = originalText;
    const textarea = document.getElementById("reflectionEditTextarea");
    if (textarea) textarea.replaceWith(p);

    // Restore mood chips
    moodEditor.classList.add("hidden");
    moodTags.classList.remove("hidden");
    renderMoodTags(currentMoods);

    // Restore action buttons
    saveEditBtn.classList.add("hidden");
    cancelEditBtn.classList.add("hidden");
    editBtn.classList.remove("hidden");
    deleteBtn.classList.remove("hidden");
  }

  // ─────────────────────────────────────────────
  // BUTTON HANDLERS
  // ─────────────────────────────────────────────
  backBtn.addEventListener("click", () => window.history.back());

  editBtn.addEventListener("click", () => {
    if (!isEditing) enterEditMode();
  });

  cancelEditBtn.addEventListener("click", exitEditMode);

  saveEditBtn.addEventListener("click", async () => {
    const textarea = document.getElementById("reflectionEditTextarea");
    const newText = textarea ? textarea.value.trim() : "";

    if (newText.length < 30) {
      showToast(
        "Warning",
        "Reflection must be at least 30 characters.",
        "error",
      );
      return;
    }

    const confirmed = await showConfirm({
      title: "Save changes?",
      message: "Your reflection and mood tags will be updated.",
      okLabel: "Save",
      danger: false,
    });
    if (!confirmed) return;

    saveEditBtn.disabled = true;
    saveEditBtn.textContent = "Saving...";

    try {
      const res = await fetch(
        `https://scriptorium-backend-six.vercel.app/api/reflection/update/${reflectionId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `jwt ${token}`,
          },
          body: JSON.stringify({ text: newText, moodTags: selectedMoods }),
        },
      );

      if (res.ok) {
        // Commit new state
        currentMoods = [...selectedMoods];
        originalText = newText;
        exitEditMode();
        showToast("Saved!", "Your reflection has been updated.", "success");
      } else {
        const data = await res.json();
        showToast(
          "Error",
          data.message || "Failed to update reflection.",
          "error",
        );
      }
    } catch (e) {
      console.error(e);
      showToast("Network Error", "Could not reach the server.", "error");
    } finally {
      saveEditBtn.disabled = false;
      saveEditBtn.textContent = "💾 Save";
    }
  });

  deleteBtn.addEventListener("click", async () => {
    const confirmed = await showConfirm({
      title: "Delete this reflection?",
      message: "This action cannot be undone.",
      okLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;

    deleteBtn.disabled = true;
    deleteBtn.textContent = "Deleting...";

    try {
      const res = await fetch(
        `https://scriptorium-backend-six.vercel.app/api/reflection/remove/${reflectionId}`,
        {
          method: "DELETE",
          headers: { Authorization: `jwt ${token}` },
        },
      );

      if (res.ok) {
        showToast("Deleted", "Reflection removed.", "success");
        setTimeout(() => (window.location.href = "/reflections-history"), 1500);
      } else {
        const data = await res.json();
        showToast("Error", data.message || "Failed to delete.", "error");
        deleteBtn.disabled = false;
        deleteBtn.textContent = "🗑️ Delete";
      }
    } catch (e) {
      console.error(e);
      showToast("Network Error", "Could not reach the server.", "error");
      deleteBtn.disabled = false;
      deleteBtn.textContent = "🗑️ Delete";
    }
  });

  // ─────────────────────────────────────────────
  // LOAD REFLECTION
  // ─────────────────────────────────────────────
  function linkify(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(
      urlRegex,
      (url) =>
        `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-[#00C49A] underline hover:text-[#00E0B0]">${url}</a>`,
    );
  }

  try {
    const res = await fetch(
      `https://scriptorium-backend-six.vercel.app/api/reflection/${reflectionId}`,
      { headers: { Authorization: `jwt ${token}` } },
    );
    if (!res.ok) throw new Error("Failed to fetch reflection");
    const reflection = await res.json();

    loading.classList.add("hidden");
    container.classList.remove("hidden");

    itemTitle.textContent = reflection.metadata?.title || "Unknown Item";
    itemImage.src =
      reflection.metadata?.image || "https://via.placeholder.com/300";
    itemDate.textContent = new Date(reflection.date).toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      },
    );

    reflectionText.innerHTML = linkify(reflection.text || "");

    currentMoods = Array.isArray(reflection.moodTags)
      ? reflection.moodTags
      : [];
    renderMoodTags(currentMoods);
  } catch (e) {
    console.error(e);
    loading.textContent = "Failed to load reflection.";
  }
});
