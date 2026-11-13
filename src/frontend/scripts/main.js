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
    ? `<a href="#" data-page="${page - 1}" class="btn-page w-11 h-11 rounded-xl border border-[#ded9d2] text-[#1c1c1f] flex justify-center items-center text-lg font-semibold bg-white shadow-xs hover:border-[#1c1c1f] hover:bg-[#fbf9f5] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200" title="Página anterior">←</a>`
    : `<div class="w-11 h-11 rounded-xl border border-[#e8e4de] text-[#bbb] flex justify-center items-center text-lg font-semibold bg-[#faf8f5] opacity-50 pointer-events-none">←</div>`;

  const rightArrow = page < totalPages
    ? `<a href="#" data-page="${page + 1}" class="btn-page w-11 h-11 rounded-xl border border-[#ded9d2] text-[#1c1c1f] flex justify-center items-center text-lg font-semibold bg-white shadow-xs hover:border-[#1c1c1f] hover:bg-[#fbf9f5] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200" title="Próxima página">→</a>`
    : `<div class="w-11 h-11 rounded-xl border border-[#e8e4de] text-[#bbb] flex justify-center items-center text-lg font-semibold bg-[#faf8f5] opacity-50 pointer-events-none">→</div>`;

  paginationWrapper.innerHTML = leftArrow + rightArrow;
  pageLabel.textContent = `Página ${page} de ${Math.max(totalPages, 1)}`;
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

  filterStatus.textContent = 'Carregando acervo...';

  try {
    const response = await fetch(`/api/storefront/products?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch products');
    const data = await response.json();

    renderProducts(data.products);
    renderPagination(data.pagination.currentPage, data.pagination.totalPages);
    currentPage = data.pagination.currentPage;

    filterStatus.textContent = data.pagination.totalProducts != null
      ? `${data.pagination.totalProducts} ${data.pagination.totalProducts === 1 ? 'título encontrado' : 'títulos encontrados'}`
      : '';

    if (data.stockWarning) {
      document.getElementById('stockWarningText').textContent = data.stockWarning;
      document.getElementById('stockWarningWrapper').classList.remove('hidden');
    }

    history.pushState(null, '', `?${params.toString()}`);
  } catch (error) {
    console.error(error);
    filterStatus.textContent = 'Não foi possível carregar o acervo neste momento.';
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
  const categoryName = item.category ? item.category.name : 'Geral';
  
  modalContent.innerHTML = `
    <div class="relative bg-[#f8f6f2] rounded-2xl p-6 flex items-center justify-center overflow-hidden border border-[#e8e4de]">
      <img src="${resolveImage(item.image)}" alt="${item.name}"
           class="w-full max-h-[380px] object-contain ${isSoldOut ? 'grayscale' : ''}" />
      ${isSoldOut ? '<span class="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Esgotado</span>' : ''}
    </div>
    <div class="flex flex-col gap-3.5">
      <div>
        <span class="inline-block text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-[#f0ece6] text-[#635f6d] mb-2">${categoryName}</span>
        <h3 class="font-poppins text-2xl font-bold text-[#111215] leading-snug">${item.name}</h3>
      </div>
      <p class="text-sm text-[#5c5b64] leading-relaxed">${item.description || 'Sem descrição cadastrada para este volume.'}</p>
      
      <div class="py-2 border-y border-[#f0ece6]">
        <span class="text-xs text-[#8a8793] uppercase font-semibold tracking-wider block">Preço à vista</span>
        <h4 class="font-poppins text-brandpink font-extrabold text-3xl">R$ ${formatPrice(item.price)}</h4>
        <p class="text-xs text-[#7c7a84] mt-1 font-medium">
          ${isSoldOut ? '⚠️ Item atualmente esgotado no estoque' : `✓ ${item.stock} ${item.stock === 1 ? 'unidade disponível' : 'unidades disponíveis'} para pronta entrega`}
        </p>
      </div>

      <div class="flex flex-col gap-2.5 mt-2">
        ${isSoldOut
          ? `<button class="w-full bg-[#e8e4de] text-[#999] text-sm font-semibold px-5 py-3 rounded-xl cursor-not-allowed" disabled>Volume Indisponível</button>`
          : `
            <button data-action="buy" data-id="${item.id}" class="w-full bg-[#111215] hover:bg-black text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer">Comprar Agora</button>
            <button data-action="add" data-id="${item.id}" class="w-full bg-brandpink hover:bg-brandpink-hover text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-md shadow-brandpink/20 transition-all active:scale-[0.98] cursor-pointer">+ Adicionar ao Carrinho</button>
          `}
        <a href="/pages/details/details.html?id=${item.id}" class="text-center text-xs font-semibold text-[#5c5b64] hover:text-[#111215] underline underline-offset-4 mt-2 transition-colors">Ver página completa com sinopse e detalhes →</a>
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
    } else if (response.status === 401) {
      if (confirm('Você precisa estar logado para comprar. Deseja entrar na sua conta agora?')) {
        window.location.href = '/pages/login/login.html';
      }
    } else {
      const data = await response.json().catch(() => null);
      alert(data?.message || 'Erro ao iniciar processo de compra do produto.');
    }
  } catch (error) {
    console.error(error);
    alert('Erro de conexão com o servidor.');
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
      alert('Produto adicionado ao carrinho com sucesso!');
    } else if (response.status === 401) {
      if (confirm('Você precisa estar logado para adicionar produtos ao carrinho. Deseja entrar na sua conta agora?')) {
        window.location.href = '/pages/login/login.html';
      }
    } else {
      const data = await response.json().catch(() => null);
      alert(data?.message || 'Erro ao adicionar produto.');
    }
  } catch (error) {
    console.error(error);
    alert('Erro de conexão com o servidor.');
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