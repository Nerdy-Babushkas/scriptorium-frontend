            document.addEventListener('DOMContentLoaded', () => {
                const profileBtn = document.getElementById('profile-menu-btn');
                const dropdown = document.getElementById('profile-dropdown');

                if (profileBtn && dropdown) {
                    // Toggle menu on click
                    profileBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        dropdown.classList.toggle('hidden');
                    });

                    // Close menu when clicking anywhere else
                    document.addEventListener('click', (e) => {
                        if (!profileBtn.contains(e.target) && !dropdown.contains(e.target)) {
                            dropdown.classList.add('hidden');
                        }
                    });
                }
            });