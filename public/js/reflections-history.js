// public/js/reflection-history.js
document.addEventListener("DOMContentLoaded", async () => {
  const historyContainer = document.getElementById("historyContainer");
  const loading = document.getElementById("loading");
  const emptyHistory = document.getElementById("emptyHistory");
  const token = localStorage.getItem("token");
  const params = new URLSearchParams(window.location.search);
  const highlightId = params.get("ref");

  if (!token) return (window.location.href = "/login");

  try {
    const res = await fetch(
      "https://scriptorium-backend-six.vercel.app/api/reflection/user?limit=5",
      {
        headers: { Authorization: `jwt ${token}` },
      },
    );

    if (!res.ok) throw new Error("Failed to fetch reflections");

    const data = await res.json();
    const reflections = data.reflections || [];

    loading.classList.add("hidden");

    if (reflections.length === 0) {
      emptyHistory.classList.remove("hidden");
      return;
    }

    historyContainer.classList.remove("hidden");

    reflections.forEach((ref) => {
      const div = document.createElement("div");
      div.className =
        "bg-white/5 border border-white/5 rounded-xl p-4 flex gap-4 cursor-pointer animate-slide-up hover:border-[#00C49A]/50 transition-all";

      if (ref._id === highlightId) {
        div.classList.add("highlighted");
        setTimeout(
          () => div.scrollIntoView({ behavior: "smooth", block: "center" }),
          100,
        );
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
          <p class="text-white/80 text-sm line-clamp-3 mb-2 font-light">"${ref.text}"</p>
          <div class="flex flex-wrap gap-2 mb-2">
            ${ref.moodTags?.map((m) => `<span class="px-2 py-0.5 rounded-md bg-white/10 text-[10px] text-white/60">${m}</span>`).join("") || ""}
          </div>
          <button class="px-3 py-1 text-xs rounded-full border border-white/10 hover:bg-white/10 text-white/80 transition-all"
              onclick="window.location.href='/reflection/${ref._id}'">
              View Reflection
          </button>
        </div>
      `;

      // Clicking anywhere except the button navigates
      div.addEventListener("click", (e) => {
        if (e.target.tagName.toLowerCase() !== "button") {
          window.location.href = `/reflection/${ref._id}`;
        }
      });

      historyContainer.appendChild(div);
    });
  } catch (e) {
    console.error(e);
    loading.textContent = "Failed to load reflections";
  }
});
