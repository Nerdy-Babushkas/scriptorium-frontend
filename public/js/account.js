// --- TOAST NOTIFICATION HELPER ---
function showToast(title, message, isError = false) {
  const toast = document.getElementById("toast");
  const toastTitle = document.getElementById("toastTitle");
  const toastMessage = document.getElementById("toastMessage");

  toastTitle.textContent = title;
  toastMessage.textContent = message;

  // Adjust colors based on success or error
  if (isError) {
    toast.classList.replace("border-[#00C49A]", "border-red-500");
    toastTitle.classList.replace("text-[#00C49A]", "text-red-500");
  } else {
    toast.classList.replace("border-red-500", "border-[#00C49A]");
    toastTitle.classList.replace("text-red-500", "text-[#00C49A]");
  }

  // Slide in
  toast.classList.remove("translate-y-40");

  // Slide out after 3.5 seconds
  setTimeout(() => {
    toast.classList.add("translate-y-40");
  }, 3500);
}
// Helper to get the token
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `JWT ${token}`, // Must match your passport strategy: .fromAuthHeaderWithScheme("jwt")
  };
};

// --- UPDATE PROFILE ---
document.getElementById("profileForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    userName: document.getElementById("userName").value,
    ai_info: document.getElementById("aiRecommendations").checked,
  };

  try {
    const res = await fetch(
      "https://scriptorium-backend-six.vercel.app/api/user/account",
      {
        method: "PATCH",
        headers: getAuthHeaders(), // Use the helper here
        body: JSON.stringify(data),
      },
    );

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || "Failed to update profile");

    showToast("Success", "Profile updated successfully!");
  } catch (err) {
    showToast("Update Failed", err.message, true);
  }
});

// --- UPDATE PASSWORD ---
document
  .getElementById("passwordForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      oldPassword: document.getElementById("oldPassword").value,
      newPassword: document.getElementById("newPassword").value,
    };

    try {
      const res = await fetch(
        "https://scriptorium-backend-six.vercel.app/api/user/account/password",
        {
          method: "PATCH",
          headers: getAuthHeaders(), // Use the helper here
          body: JSON.stringify(data),
        },
      );

      const result = await res.json();
      if (!res.ok)
        throw new Error(result.message || "Failed to update password");

      showToast("Success", result.message || "Password updated successfully!");
      document.getElementById("passwordForm").reset();
    } catch (err) {
      showToast("Security Alert", err.message, true);
    }
  });
