// scripts/nav-active.js
// Destaca o link do nav correspondente à página atual (cor amarela da marca).
// Espera o evento "layoutReady", já que o nav vem de um include.

document.addEventListener('layoutReady', () => {
  const pageMatchers = [
    { page: 'vitrine', test: (path) => path === '/' || path.includes('/pages/vitrine/') },
    { page: 'homepage', test: (path) => path.includes('/pages/homepage/') },
    { page: 'cart', test: (path) => path.includes('/pages/cart/') },
    { page: 'admin', test: (path) => path.includes('/pages/admin/') },
    { page: 'login', test: (path) => path.includes('/pages/login/') },
  ];

  const currentPath = window.location.pathname;
  const activePage = pageMatchers.find((matcher) => matcher.test(currentPath));
  if (!activePage) return;

  const activeLink = document.querySelector(`.nav-link[data-page="${activePage.page}"]`);
  if (!activeLink) return;

  activeLink.classList.remove('text-white');
  activeLink.classList.add('text-brandyellow', 'font-semibold');
});