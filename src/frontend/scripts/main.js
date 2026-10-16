import { mountLayout } from '/scripts/partials.js';
import { api } from '/scripts/api.js';
import { ProductCard } from '/components/shared/components.js';

mountLayout({ title: 'Manga&Lamen - Storefront', activeNav: 'storefront' });

const productsGrid = document.getElementById('productsGrid');
const emptyState = document.getElementById('emptyState');
const filterStatus = document.getElementById('filterStatus');
const paginationWrapper = document.getElementById('paginationWrapper');
const pageLabel = document.getElementById('pageLabel');

const categoryEl = document.getElementById('category');
const minPriceEl = document.getElementById('minPrice');
const maxPriceEl = document.getElementById('maxPrice');
const sortByEl = document.getElementById('sortBy');

// Previously `currentPage` came from the controller. Now we read it from the URL
// (?page=2), with a fallback to 1 — this preserves the browser's "back" 
// behavior that the original history.pushState maintained.
const initialParams = new URLSearchParams(window.location.search);
let currentPage = Number(initialParams.get('page')) || 1;
let debounceTimer = null;

function formatPrice(value) {
  return Number(value).toFixed(2).replace('.', ',');
}

function resolveImage(image) {
  if (!image) return '/images/no-photo.jpg';
  return image.startsWith('http') ? image : '/images/' + image;
}

function renderProducts(products) {
  if (!products || products.length === 0) {
    productsGrid.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');
  productsGrid.innerHTML = products.map(ProductCard).join('');
}

function renderPagination(page, totalPages) {
  const leftArrow = page > 1
    ? `<a href="#" data-page="${page - 1}" class="btn-page w-[42px] h-[42px] rounded-full border-[3px] border-[#4a4a4a] text-[#4a4a4a] flex justify-center items-center text-xl font-bold bg-white transition-transform duration-300 hover:scale-[1.08] hover:text-[#111] hover:border-[#111]">←</a>`
    : `<div class="w-[42px] h-[42px] rounded-full border-[3px] border-[#4a4a4a] text-[#4a4a4a] flex justify-center items-center text-xl font-bold bg-white opacity-30 pointer-events-none">←</div>`;

  const rightArrow = page < totalPages
    ? `<a href="#" data-page="${page + 1}" class="btn-page w-[42px] h-[42px] rounded-full border-[3px] border-[#4a4a4a] text-[#4a4a4a] flex justify-center items-center text-xl font-bold bg-white transition-transform duration-300 hover:scale-[1.08] hover:text-[#111] hover:border-[#111]">→</a>`
    : `<div class="w-[42px] h-[42px] rounded-full border-[3px] border-[#4a4a4a] text-[#4a4a4a] flex justify-center items-center text-xl font-bold bg-white opacity-30 pointer-events-none">→</div>`;

  paginationWrapper.innerHTML = leftArrow + rightArrow;
  pageLabel.textContent = `Page ${page} of ${Math.max(totalPages, 1)}`;
}

async function loadProducts({ resetPage = false } = {}) {
  if (resetPage) currentPage = 1;

  const paramsObj = {
    page: currentPage
  };
  
  if (categoryEl.value) paramsObj.categoryId = categoryEl.value;
  if (minPriceEl.value) paramsObj.minPrice = minPriceEl.value;
  if (maxPriceEl.value) paramsObj.maxPrice = maxPriceEl.value;
  if (sortByEl.value) paramsObj.sortBy = sortByEl.value;

  const params = new URLSearchParams(paramsObj);

  filterStatus.textContent = 'Loading products...';

  try {
    const response = await fetch(`/api/storefront/products?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch products');
    const data = await response.json();

    renderProducts(data.products);
    renderPagination(data.pagination.currentPage, data.pagination.totalPages);
    currentPage = data.pagination.currentPage;

    filterStatus.textContent = data.pagination.totalProducts != null
      ? `${data.pagination.totalProducts} product${data.pagination.totalProducts !== 1 ? 's' : ''} found`
      : '';

    if (data.stockWarning) {
      document.getElementById('stockWarningText').textContent = data.stockWarning;
      document.getElementById('stockWarningWrapper').classList.remove('hidden');
    }

    history.pushState(null, '', `?${params.toString()}`);
  } catch (error) {
    console.error(error);
    filterStatus.textContent = 'Could not load products at this moment.';
  }
}

function debounceLoadProducts() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => loadProducts({ resetPage: true }), 350);
}

categoryEl.addEventListener('change', () => loadProducts({ resetPage: true }));
sortByEl.addEventListener('change', () => loadProducts({ resetPage: true }));
minPriceEl.addEventListener('input', debounceLoadProducts);
maxPriceEl.addEventListener('input', debounceLoadProducts);

document.getElementById('btnClearFilters').addEventListener('click', () => {
  categoryEl.value = '';
  minPriceEl.value = '';
  maxPriceEl.value = '';
  sortByEl.value = 'relevance';
  loadProducts({ resetPage: true });
});

document.getElementById('filterForm').addEventListener('submit', (e) => e.preventDefault());

paginationWrapper.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-page');
  if (!btn) return;
  e.preventDefault();
  currentPage = Number(btn.dataset.page);
  loadProducts();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ---------- Quick View ----------
const modalQuickView = document.getElementById('modalQuickView');
const modalContent = document.getElementById('modalContent');

function openQuickView(item) {
  const isSoldOut = item.stock <= 0;
  const categoryName = item.category ? item.category.name : '—';
  
  modalContent.innerHTML = `
    <img src="${resolveImage(item.image)}" alt="${item.name}"
         class="w-full aspect-[2/3] object-contain bg-white rounded-lg ${isSoldOut ? 'grayscale' : ''}" />
    <div class="flex flex-col gap-3">
      <span class="inline-block w-fit bg-[#eee] text-[#555] text-xs font-medium px-2.5 py-1 rounded-full">${categoryName}</span>
      <h3 class="text-2xl font-bold text-[#111]">${item.name}</h3>
      <p class="text-sm text-[#666] leading-relaxed">${item.description || ''}</p>
      <h4 class="text-brandpink font-bold text-2xl">R$ ${formatPrice(item.price)}</h4>
      <p class="text-xs text-[#888]">${isSoldOut ? 'Sold Out' : `${item.stock} unit${item.stock !== 1 ? 's' : ''} in stock`}</p>
      <div class="flex flex-col gap-2 mt-2">
        ${isSoldOut
          ? `<button class="w-full bg-[#ccc] text-white text-sm font-semibold px-5 py-2.5 rounded-lg cursor-not-allowed" disabled>Unavailable</button>`
          : `
            <button data-action="buy" data-id="${item.id}" class="w-full bg-[#111] hover:bg-black text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors">Buy Now</button>
            <button data-action="add" data-id="${item.id}" class="w-full bg-brandpink hover:bg-brandpink-hover text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors">Add to Cart</button>
          `}
        <a href="/pages/details/details.html?id=${item.id}" class="text-center text-sm text-[#666] underline underline-offset-2 mt-1">View full product page</a>
      </div>
    </div>`;
    
  modalQuickView.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeQuickView() {
  modalQuickView.classList.add('hidden');
  document.body.style.overflow = '';
}

document.addEventListener('click', (e) => {
  const btnQuickView = e.target.closest('.btn-quick-view');
  if (btnQuickView) {
    e.preventDefault();
    const item = JSON.parse(decodeURIComponent(btnQuickView.dataset.quickView));
    openQuickView(item);
    return;
  }

  // "Buy Now" / "Add to Cart" buttons on cards and in the modal
  // (Previously inline onclick; now using data-attributes + delegated listener, 
  // since production HTML/JS shouldn't use inline JS).
  const actionBtn = e.target.closest('[data-action="buy"], [data-action="add"]');
  if (actionBtn) {
    e.preventDefault();
    const productId = Number(actionBtn.dataset.id);
    if (actionBtn.dataset.action === 'buy') buyNow(productId);
    else addToCart(productId);
  }
});

document.getElementById('closeModal').addEventListener('click', closeQuickView);
modalQuickView.addEventListener('click', (e) => { if (e.target === modalQuickView) closeQuickView(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeQuickView(); });

// ---------- Purchase Actions ----------
async function buyNow(productId) {
  try {
    const response = await fetch('/api/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
    });
    if (response.ok) {
      window.location.href = '/pages/cart/cart.html';
    } else {
      const errorText = await response.text();
      alert(errorText || 'Error starting the checkout process.');
    }
  } catch (error) {
    console.error(error);
    alert('Server connection error.');
  }
}

async function addToCart(productId) {
  try {
    const response = await fetch('/api/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
    });
    if (response.ok) {
      alert('Product added to the cart!');
    } else {
      const errorText = await response.text();
      alert(errorText || 'Error adding product.');
    }
  } catch (error) {
    console.error(error);
    alert('Server connection error.');
  }
}

// ---------- Initial Load ----------
async function init() {
  categoryEl.value = initialParams.get('categoryId') || '';
  minPriceEl.value = initialParams.get('minPrice') || '';
  maxPriceEl.value = initialParams.get('maxPrice') || '';
  sortByEl.value = initialParams.get('sortBy') || 'relevance';

  const categories = await api.listCategories();
  categories.forEach((cat) => {
    const option = document.createElement('option');
    option.value = cat.name;
    option.textContent = cat.name;
    if (cat.name === categoryEl.value) option.selected = true;
    categoryEl.appendChild(option);
  });

  await loadProducts();
}

init();