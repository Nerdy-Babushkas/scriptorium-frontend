document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById("loginForm");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");

    // 1. Create Message Box (Matches your original logic)
    const message = document.createElement("div");
    message.id = "loginMessage";
    message.className = "hidden mt-3 px-5 py-4 rounded-2xl border text-lg font-medium transition-all";
    loginForm.prepend(message);

    // 2. Hide errors on input
    [emailInput, passwordInput].forEach((input) => {
        input.addEventListener("input", () => {
            message.classList.add("hidden");
        });
    });

    // 3. Helper Functions
    function showError(text) {
        message.textContent = text;
        message.className = "mt-3 px-5 py-4 rounded-2xl border text-lg font-medium bg-red-500/10 border-red-400 text-red-300";
        message.classList.remove("hidden");
    }

    function showSuccess(text) {
        message.textContent = text;
        message.className = "mt-3 px-5 py-4 rounded-2xl border text-lg font-medium bg-green-500/10 border-green-400 text-green-300";
        message.classList.remove("hidden");
    }

    // 4. Main Submit Logic
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Reset messages
        message.classList.add("hidden");

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
            return showError("Password must include at least one special character (!@#$...).");
        }

        // --- BACKEND CONNECTION ---

        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerText;
        submitBtn.innerText = "LOGGING IN...";
        submitBtn.disabled = true;

        try {
            const response = await fetch("https://scriptorium-backend-six.vercel.app/api/user/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                // Save token
                localStorage.setItem("token", data.token);
                document.cookie = `token=${data.token}; path=/; max-age=86400; SameSite=Strict`;

                showSuccess("Login successful! Redirecting...");

                // Wait 4 seconds then redirect (Matches your original code)
                setTimeout(() => {
                    window.location.href = "/room";
                }, 4000); 
            } else {
                showError(data.message || "Login failed. Please check your credentials.");
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