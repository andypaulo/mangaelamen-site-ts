// src/frontend/js/partials.js
//
// Converted from components/layout/{head,header,nav,footer}.ejs.
//
// IMPORTANT regarding head.ejs: it is a complete <head> (meta, title, fonts,
// favicon, css). This cannot be "injected" via JS after the page has already
// loaded (the browser has already processed the <head> at this point, so fonts/favicon
// would arrive late or not be applied at all). Therefore, the <head> of each
// HTML page below is written out in full (copied from head.ejs), only manually changing
// the <title> per page — it is the equivalent of the `title` that was previously
// passed in the include. header/nav/footer continue to be injected via JS
// because they belong to the <body>, which the browser does accept populating after load.

const NAV_ITEMS = [
  {
    key: 'contact',
    href: '/pages/homepage/index.html',
    label: 'Home',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 [filter:brightness(0)_invert(1)]">
      <path d="M 12 2.0996094 L 1 12 L 4 12 L 4 21 L 11 21 L 11 15 L 13 15 L 13 21 L 20 21 L 20 12 L 23 12 L 12 2.0996094 z M 12 4.7910156 L 18 10.191406 L 18 11 L 18 19 L 15 19 L 15 13 L 9 13 L 9 19 L 6 19 L 6 10.191406 L 12 4.7910156 z"></path>
    </svg>`,
  },
  {
    key: 'storefront',
    href: '/pages/vitrine/index.html',
    label: 'Manga',
    icon: `<img width="16" height="16" src="https://img.icons8.com/windows/32/book-stack.png" alt="book-stack" class="w-4 h-4 object-contain [filter:brightness(0)_invert(1)]" />`,
  },
  {
    key: 'cart',
    href: '/pages/cart/cart.html',
    label: 'Cart',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="w-4 h-4 [filter:brightness(0)_invert(1)]">
      <path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5M3.102 4l1.313 7h8.17l1.313-7zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4m7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4m-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2m7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2"></path>
    </svg>`,
  },
  {
    key: 'admin',
    href: '/pages/admin/admin.html',
    label: 'Admin',
    icon: `<img width="16" height="16" src="https://img.icons8.com/ios/50/user--v1.png" alt="user--v1" class="w-4 h-4 object-contain [filter:brightness(0)_invert(1)]" />`,
  },
];

export function renderHeader() {
  return `
    <header class="bg-[#111] p-[15px] text-center">
      <div class="relative w-[90%] mx-auto">
        <form method="get" action="/pages/storefront/index.html" id="searchForm">
          <input type="hidden" name="category" value="" />
          <input
            type="text"
            id="searchInput"
            name="search"
            placeholder="Search manga..."
            autocomplete="off"
            class="w-full px-[10px] py-[10px] rounded-[20px] border-none outline-none"
          />
        </form>

        <div
          id="searchPreview"
          class="hidden absolute top-full left-0 w-full bg-white rounded-b-[10px] shadow-[0_4px_10px_rgba(0,0,0,0.2)] z-[999] text-left"
        >
          <ul id="suggestionsList" class="list-none m-0 p-0"></ul>
        </div>
      </div>
    </header>`;
}

/** @param {'contact'|'storefront'|'cart'|'admin'} activeNav */
export function renderNav(activeNav = '') {
  const links = NAV_ITEMS.map(
    (item) => `
      <a href="${item.href}" class="flex items-center gap-1.5 text-white text-base no-underline transition-colors duration-200 hover:text-[#d3d3d3] ${
        item.key === activeNav ? 'font-semibold' : ''
      }">
        ${item.icon}
        ${item.label}
      </a>`
  ).join('');

  return `<nav class="bg-[#222] p-[10px] flex justify-around gap-5">${links}</nav>`;
}

export function renderFooter() {
  return `
    <footer class="bg-[#eee] p-[10px] flex justify-around fixed bottom-0 w-full opacity-[0.82] leading-[60px]">
      <p class="m-0 p-0">All rights reserved © - Mangá &amp; Lamen</p>
    </footer>`;
}

/** Binds the search with suggestions (behavior of the <script> inside header.ejs). */
function enableSearchSuggestions() {
  const input = document.getElementById('searchInput');
  const preview = document.getElementById('searchPreview');
  const list = document.getElementById('suggestionsList');
  if (!input) return;

  input.addEventListener('input', async function () {
    const term = this.value.trim();

    if (term.length < 2) {
      preview.classList.add('hidden');
      return;
    }

    try {
      const response = await fetch(`/api/storefront/suggestions?search=${encodeURIComponent(term)}`);
      const products = await response.json();

      if (products.length > 0) {
        list.innerHTML = products
          .map(
            (p) => `
              <li class="px-[15px] py-[10px] border-b border-[#eee] cursor-pointer">
                <a href="/pages/details/details.html?id=${p.id}" class="no-underline text-[#333] block w-full">
                  ${p.name}
                </a>
              </li>`
          )
          .join('');
        preview.classList.remove('hidden');
      } else {
        preview.classList.add('hidden');
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  });

  document.addEventListener('click', function (e) {
    if (!input.contains(e.target) && !preview.contains(e.target)) {
      preview.classList.add('hidden');
    }
  });
}

/**
 * Mounts header + nav in #app-header and footer in #app-footer, sets the title
 * and enables the search. Call at the top of each page-script (equivalent to including
 * head/header/nav/footer in EJS).
 */
export function mountLayout({ title = 'Manga&Lamen', activeNav = '' } = {}) {
  document.title = title;
  const headerEl = document.getElementById('app-header');
  const footerEl = document.getElementById('app-footer');
  if (headerEl) headerEl.innerHTML = renderHeader() + renderNav(activeNav);
  if (footerEl) footerEl.innerHTML = renderFooter();
  enableSearchSuggestions();
}