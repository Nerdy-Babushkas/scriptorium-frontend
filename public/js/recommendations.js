/* ---------------- LOADING MESSAGES ---------------- */
const messages = [
  "Babushka AI is knitting your recommendations",
  "Warming up the projector",
  "Searching through forgotten cinema",
  "Matching your soul with films",
  "Adding a touch of nostalgia",
  "Don't rush the babushka, she's an artist",
  "Almost ready… patience",
];

let msgIndex = 0;
let interval = null;

function startLoadingMessages() {
  interval = setInterval(() => {
    const el = document.getElementById("loadingText");
    if (!el) return;

    msgIndex = (msgIndex + 1) % messages.length;
    el.innerHTML = messages[msgIndex] + '<span class="dots"></span>';
  }, 2200);
}

function stopLoadingMessages() {
  if (interval) clearInterval(interval);
}

/* ---------------- FETCH ---------------- */
async function fetchRecommendations() {
  const grid = document.getElementById("recommendationsGrid");
  const empty = document.getElementById("recommendationsEmpty");
  const loading = document.getElementById("recommendationsLoading");

  try {
    const token = localStorage.getItem("token");

    const res = await fetch(
      "https://scriptorium-backend-six.vercel.app/api/recommendations/movies",
      {
        method: "GET",
        headers: {
          Authorization: `jwt ${token}`,
        },
      },
    );

    const data = await res.json();
    const movies = data.recommendations || [];

    /* fade out loading */
    loading.classList.add("fade-out");

    setTimeout(() => {
      loading.style.display = "none";
      stopLoadingMessages();
    }, 400);

    grid.innerHTML = "";

    /* EMPTY */
    if (!Array.isArray(movies) || !movies.length) {
      showEmptyState();
    }

    /* RENDER */
    movies.forEach((movie, index) => {
      if (!movie || typeof movie !== "object") return;

      const card = document.createElement("div");
      card.className = "movie-card";

      card.style.opacity = "0";
      card.style.transform = "translateY(12px)";

      card.innerHTML = `
                <div style="padding:10px;">
                    <img src="${movie.poster || "https://via.placeholder.com/300x450?text=No+Image"}"
                         class="movie-poster"/>

                    <strong>${movie.title || "No title"}</strong><br/>
                    <small>${movie.year || "?"} • ${movie.director || "Unknown"}</small><br/>
                    <em>${movie.reason || "No reason provided"}</em>
                </div>
            `;

      grid.appendChild(card);

      setTimeout(() => {
        card.style.transition = "all 0.35s ease";
        card.style.opacity = "1";
        card.style.transform = "translateY(0)";
      }, index * 90);
    });
  } catch (err) {
    console.error(err);

    loading.style.display = "none";
    empty.style.display = "block";
    empty.textContent = "Failed to load recommendations.";
  }
}

/* ---------------- EMPTY STATE ---------------- */
function showEmptyState(message) {
  const grid = document.getElementById("recommendationsGrid");
  const empty = document.getElementById("recommendationsEmpty");
  const loading = document.getElementById("recommendationsLoading");

  loading.style.display = "none";

  grid.innerHTML = ""; // clear grid

  empty.style.display = "flex";
  empty.style.flexDirection = "column";
  empty.style.alignItems = "center";
  empty.style.justifyContent = "center";
  empty.style.marginTop = "3rem";

  // Set dramatic crying sheep GIF
  empty.innerHTML = `
    <img src="/assets/sorry-sheep.gif" alt="Sorry sheep" style="width:200px; max-width:50%; margin-bottom:1rem;"/>
    <p style="color:#FFDA6D; font-size:1.25rem; font-weight:500; text-align:center;">
      Babushka AI could not find any movies to stitch together for you 😔
    </p>
  `;
}

/* ---------------- INIT ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  startLoadingMessages();
  fetchRecommendations();
});
