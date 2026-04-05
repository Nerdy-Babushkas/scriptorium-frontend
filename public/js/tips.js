export function initTips({ tips }) {
    const tipBox = document.getElementById("tipBox");
    const overlay = document.getElementById("tipOverlay");
    const tipContent = document.getElementById("tipContent");
    const dotsContainer = document.getElementById("tipDots");

    const nextBtn = document.getElementById("nextTip");
    const prevBtn = document.getElementById("prevTip");
    const closeBtn = document.getElementById("closeTip");
    const disableBtn = document.getElementById("disableTips");

    if (!nextBtn || !prevBtn || !closeBtn || !disableBtn) {
        console.log("Tip UI not found → skipping tips");
        return;
    }

    let current = 0;
 
    const BASE_URL = window.location.origin.includes("localhost")
        ? "http://localhost:3001"
        : "https://scriptorium-backend-six.vercel.app/api";


    function renderDots() {
        dotsContainer.innerHTML = "";
        tips.forEach((_, i) => {
            const dot = document.createElement("div");
            dot.style.width = "8px";
            dot.style.height = "8px";
            dot.style.borderRadius = "50%";
            dot.style.background =
                i === current ? "#FFD46D" : "rgba(255,255,255,0.3)";
            dotsContainer.appendChild(dot);
        });
    }

    function showTip(index) {
        tipContent.style.opacity = 0;

        setTimeout(() => {
            tipContent.innerHTML = tips[index];
            tipContent.style.opacity = 1;
            renderDots();
        }, 150);
    }

    function openModal() {
        overlay.style.display = "block";
        tipBox.style.display = "block";

        setTimeout(() => {
            tipBox.style.transform = "translateY(0)";
            tipBox.style.opacity = 1;
        }, 10);
    }

    function closeModal() {
        tipBox.style.transform = "translateY(40px)";
        tipBox.style.opacity = 0;

        setTimeout(() => {
            tipBox.style.display = "none";
            overlay.style.display = "none";
        }, 300);
    }

    // ✅ NEW: get user identifier
    const user = localStorage.getItem("userEmail") || "guest";

    function checkTips() {
        // ✅ UPDATED: user-specific key
        const showTips = localStorage.getItem(`showTips_${user}`);

        if (showTips !== "false") {
            openModal();
            showTip(current);
        }
    }

    nextBtn.onclick = () => {
        if (current < tips.length - 1) {
            current++;
            showTip(current);
        }
    };

    prevBtn.onclick = () => {
        if (current > 0) {
            current--;
            showTip(current);
        }
    };

    closeBtn.onclick = closeModal;

    // ✅ UPDATED: save per user
    disableBtn.onclick = () => {
        localStorage.setItem(`showTips_${user}`, "false");
        closeModal();
    };

    checkTips();
}