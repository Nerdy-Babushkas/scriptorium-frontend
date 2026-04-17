document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  const toggle = document.getElementById("togglePassword");

  // Show/Hide Password Logic
  toggle.addEventListener("click", () => {
    const type =
      passwordInput.getAttribute("type") === "password" ? "text" : "password";
    passwordInput.setAttribute("type", type);

    toggle.textContent = type === "password" ? "👁" : "⌣";
  });

  // 1. Create Message Box (Matches your original logic)
  const message = document.createElement("div");
  message.id = "loginMessage";
  message.className =
    "hidden mt-3 px-5 py-4 rounded-2xl border text-lg font-medium transition-all";
  loginForm.prepend(message);

  // Show verification email notice if redirected from signup
  const params = new URLSearchParams(window.location.search);
  if (params.get("registered") === "true") {
    showInfo(
      "Account created! A verification email has been sent — please check your inbox before logging in.",
    );

    // Clean the URL so the message doesn't reappear on refresh
    window.history.replaceState({}, "", "/login");
  }

  // 2. Hide errors on input
  [emailInput, passwordInput].forEach((input) => {
    input.addEventListener("input", () => {
      message.classList.add("hidden");
      message.style.cssText = "";
    });
  });

  // 3. Helper Functions
  function showError(text) {
    message.textContent = text;
    message.style.cssText = "";
    message.className =
      "mt-3 px-5 py-4 rounded-2xl border text-lg font-medium bg-red-500/10 border-red-400 text-red-300";
    message.classList.remove("hidden");
  }

  function showSuccess(text) {
    message.textContent = text;
    message.style.cssText = "";
    message.className =
      "mt-3 px-5 py-4 rounded-2xl border text-lg font-medium bg-green-500/10 border-green-400 text-green-300";
    message.classList.remove("hidden");
  }

  function showInfo(text) {
    message.textContent = text;
    message.className =
      "mt-3 px-5 py-4 rounded-2xl border text-lg font-medium bg-blue-500/10 border-blue-400 text-blue-300";
    message.classList.remove("hidden");
    message.style.background = "rgba(59,130,246,0.1)";
    message.style.borderColor = "#60a5fa";
    message.style.color = "#93c5fd";
    message.style.setProperty("display", "block", "important");
  }

  // 4. Main Submit Logic
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Reset messages
    message.classList.add("hidden");
    message.style.cssText = "";

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // --- VALIDATION (Restored from your original code) ---

    // Email Check
    if (!emailRegex.test(email)) {
      return showError("Please enter a valid email address.");
    }

    // Password Length
    if (password.length < 8) {
      return showError("Password must be at least 8 characters long.");
    }

    // Password Complexity Checks
    if (!/[A-Z]/.test(password)) {
      return showError("Password must include at least one uppercase letter.");
    }
    if (!/[a-z]/.test(password)) {
      return showError("Password must include at least one lowercase letter.");
    }
    if (!/\d/.test(password)) {
      return showError("Password must include at least one number.");
    }
    if (!/[!_@#$%^&*(),.?":{}|<>]/.test(password)) {
      return showError(
        "Password must include at least one special character (!@#$...).",
      );
    }

    // --- BACKEND CONNECTION ---

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerText;
    submitBtn.innerText = "LOGGING IN...";
    submitBtn.disabled = true;

    try {
      const response = await fetch(
        "https://scriptorium-backend-six.vercel.app/api/user/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        },
      );

      const data = await response.json();

      if (response.ok) {
        // Save token
        localStorage.setItem("token", data.token);
        document.cookie = `token=${data.token}; path=/; max-age=86400; SameSite=Strict`;

        showSuccess("Login successful! Redirecting...");
        window.location.href = "/room";
      } else if (data.message && data.message.toLowerCase().includes("verif")) {
        // Email not verified — show friendly info, not a red error
        showInfo(
          "Your email isn't verified yet. We've sent a new verification link — please check your inbox.",
        );

        // Trigger resend in the background
        fetch(
          "https://scriptorium-backend-six.vercel.app/api/user/resend-verification",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          },
        ).catch(() => {});
      } else {
        showError(
          data.message || "Login failed. Please check your credentials.",
        );
      }
    } catch (error) {
      console.error("Login Error:", error);
      showError("Unable to connect to the server.");
    } finally {
      submitBtn.innerText = originalBtnText;
      submitBtn.disabled = false;
    }
  });
});
