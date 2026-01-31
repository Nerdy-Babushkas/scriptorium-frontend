document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById("signupForm");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const confirmInput = document.getElementById("confirmPassword");
    const message = document.getElementById("formMessage");
    const submitBtn = document.getElementById("submitBtn");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // 1. Hide error messages when user types
    [emailInput, passwordInput, confirmInput].forEach((input) => {
        input.addEventListener("input", () => message.classList.add("hidden"));
    });

    // 2. Helper Functions
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

    // 3. Main Submit Logic
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        // Reset message
        message.classList.add("hidden");

        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value;
        const confirm = confirmInput.value;

        // --- USERNAME GENERATION (Matches your original code) ---
        const generatedUserName = email.split('@')[0]; 

        // --- VALIDATION ---
        
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
            return showError("Password must contain at least one uppercase letter.");
        }
        if (!/[a-z]/.test(password)) {
            return showError("Password must contain at least one lowercase letter.");
        }
        if (!/\d/.test(password)) {
            return showError("Password must contain at least one number.");
        }
        if (!/[!_@#$%^&*(),.?":{}|<>]/.test(password)) {
            return showError("Password must include at least one special character (!@#$...).");
        }

        // Confirm Password Match
        if (password !== confirm) { 
            return showError("Passwords do not match."); 
        }

        // --- BACKEND CALL ---
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = "Creating Account...";

        try {
            const response = await fetch('https://scriptorium-backend-six.vercel.app/api/user/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userName: generatedUserName, // Sending the extracted name
                    email: email,
                    password: password,
                    password2: confirm 
                })
            });

            const data = await response.json();

            if (response.ok) {
                showSuccess("Account created! Redirecting to login...");
                setTimeout(() => {
                    window.location.href = '/login';
                }, 1500);
            } else {
                showError(data.message || "Signup failed.");
            }

        } catch (err) {
            console.error(err);
            showError("Could not connect to the server.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
});