console.log("NAVBAR JS LOADED");

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('profile-btn');
  const menu = document.getElementById('profile-menu');

  if (!btn || !menu) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('active');
  });

  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && !btn.contains(e.target)) {
      menu.classList.remove('active');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      menu.classList.remove('active');
    }
  });
});