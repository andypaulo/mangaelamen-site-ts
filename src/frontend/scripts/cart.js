// src/frontend/scripts/cart.js
// Controlador do Carrinho de Compras da Manga & Lamen

function formatPrice(value) {
  return Number(value || 0).toFixed(2).replace('.', ',');
}

function resolveImage(image) {
  if (!image) return '/images/no-photo.jpg';
  return image.startsWith('http') ? image : '/images/' + image;
}

const elements = {
  list: document.getElementById('cartItemsList'),
  loading: document.getElementById('cartLoadingState'),
  empty: document.getElementById('cartEmptyState'),
  unauth: document.getElementById('cartUnauthenticatedState'),
  subtotal: document.getElementById('summarySubtotal'),
  total: document.getElementById('summaryTotal'),
  totalItemsCount: document.getElementById('summaryTotalItems'),
  itemsWord: document.getElementById('summaryItemsWord'),
  btnFinalizar: document.getElementById('btnFinalizar'),
  alertBox: document.getElementById('cartAlert'),
  alertMessage: document.getElementById('cartAlertMessage'),
  alertClose: document.getElementById('cartAlertClose'),
  shippingSection: document.getElementById('shippingAddressSection'),
  shippingLoading: document.getElementById('shippingAddressLoading'),
  shippingError: document.getElementById('shippingAddressError'),
  shippingEmpty: document.getElementById('shippingAddressEmpty'),
  shippingList: document.getElementById('shippingAddressList'),
  btnRetryShipping: document.getElementById('btnRetryShippingAddresses'),
};

let hasCartItems = false;
let userAddresses = [];
let selectedAddressId = null;
let addressesLoaded = false;
let isCheckingOut = false;

function formatCep(cep) {
  const digits = String(cep || '').replace(/\D/g, '').slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

function updateCheckoutButtonState() {
  if (!elements.btnFinalizar) return;
  elements.btnFinalizar.disabled = !hasCartItems || !selectedAddressId || isCheckingOut;
}

function renderShippingAddresses() {
  if (!elements.shippingList || !elements.shippingEmpty || !elements.shippingLoading || !elements.shippingError) return;

  elements.shippingLoading.classList.add('hidden');
  elements.shippingError.classList.add('hidden');
  elements.shippingList.innerHTML = '';

  if (userAddresses.length === 0) {
    selectedAddressId = null;
    elements.shippingList.classList.add('hidden');
    elements.shippingEmpty.classList.remove('hidden');
    updateCheckoutButtonState();
    return;
  }

  elements.shippingEmpty.classList.add('hidden');
  elements.shippingList.classList.remove('hidden');

  const hasCurrentSelection = userAddresses.some((a) => a.id === selectedAddressId);
  if (!hasCurrentSelection) {
    const defaultAddr = userAddresses.find((a) => a.isDefault) || userAddresses[0];
    selectedAddressId = defaultAddr ? defaultAddr.id : null;
  }

  userAddresses.forEach((addr) => {
    const labelEl = document.createElement('label');
    const isSelected = addr.id === selectedAddressId;
    labelEl.className = `flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
      isSelected
        ? 'border-brandpink bg-[#fff9fc]'
        : 'border-[#e8e4de] bg-[#fbf9f5] hover:border-[#d0cbc2]'
    }`;

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'shippingAddressId';
    radio.value = addr.id;
    radio.checked = isSelected;
    radio.className = 'mt-1 accent-brandpink cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brandpink';
    radio.addEventListener('change', () => {
      selectedAddressId = addr.id;
      renderShippingAddresses();
    });

    const info = document.createElement('div');
    info.className = 'flex flex-col gap-0.5 min-w-0 flex-1';

    const headerRow = document.createElement('div');
    headerRow.className = 'flex flex-wrap items-center gap-2';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'font-poppins font-semibold text-sm text-[#111215] break-words';
    nameSpan.textContent = addr.recipientName;
    headerRow.appendChild(nameSpan);

    if (addr.label) {
      const labelBadge = document.createElement('span');
      labelBadge.className = 'text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#ece8e1] text-[#5c5b64]';
      labelBadge.textContent = addr.label;
      headerRow.appendChild(labelBadge);
    }

    if (addr.isDefault) {
      const defaultBadge = document.createElement('span');
      defaultBadge.className = 'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brandpink text-white';
      defaultBadge.textContent = 'Padrão';
      headerRow.appendChild(defaultBadge);
    }

    info.appendChild(headerRow);

    const line1 = document.createElement('span');
    line1.className = 'text-xs text-[#3c3b42] break-words';
    const complementPart = addr.complement ? ` — ${addr.complement}` : '';
    line1.textContent = `${addr.street}, ${addr.number}${complementPart}`;
    info.appendChild(line1);

    const line2 = document.createElement('span');
    line2.className = 'text-xs text-[#635f6d] break-words';
    line2.textContent = `${addr.neighborhood} — ${addr.city}/${addr.state} • CEP ${formatCep(addr.cep)}`;
    info.appendChild(line2);

    labelEl.appendChild(radio);
    labelEl.appendChild(info);
    elements.shippingList.appendChild(labelEl);
  });

  updateCheckoutButtonState();
}

async function loadShippingAddresses() {
  if (!elements.shippingSection) return;

  if (elements.shippingLoading) elements.shippingLoading.classList.remove('hidden');
  if (elements.shippingError) elements.shippingError.classList.add('hidden');
  if (elements.shippingEmpty) elements.shippingEmpty.classList.add('hidden');
  if (elements.shippingList) elements.shippingList.classList.add('hidden');

  try {
    const res = await fetch('/api/profile/addresses');
    if (res.status === 401) {
      addressesLoaded = false;
      userAddresses = [];
      selectedAddressId = null;
      elements.shippingSection.classList.add('hidden');
      updateCheckoutButtonState();
      return;
    }

    if (!res.ok) {
      throw new Error('Falha ao carregar endereços.');
    }

    const data = await res.json();
    userAddresses = Array.isArray(data) ? data : [];
    addressesLoaded = true;
    renderShippingAddresses();
  } catch (err) {
    console.error('Erro ao buscar endereços:', err);
    addressesLoaded = false;
    userAddresses = [];
    selectedAddressId = null;
    if (elements.shippingLoading) elements.shippingLoading.classList.add('hidden');
    if (elements.shippingError) elements.shippingError.classList.remove('hidden');
    updateCheckoutButtonState();
  }
}

if (elements.btnRetryShipping) {
  elements.btnRetryShipping.addEventListener('click', loadShippingAddresses);
}

function showAlert(message, type = 'error') {
  if (!elements.alertBox) return;
  elements.alertMessage.textContent = message;
  elements.alertBox.className = `mb-6 p-4 rounded-xl text-sm font-medium border flex items-center justify-between gap-3 animate-in fade-in ${
    type === 'error'
      ? 'bg-red-50 text-red-800 border-red-200'
      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
  }`;
  elements.alertBox.classList.remove('hidden');
}

function hideAlert() {
  if (elements.alertBox) {
    elements.alertBox.classList.add('hidden');
  }
}

if (elements.alertClose) {
  elements.alertClose.addEventListener('click', hideAlert);
}

// ==================== CARREGAR CARRINHO ====================
export async function carregarCarrinho() {
  hideAlert();
  if (elements.loading) elements.loading.classList.remove('hidden');
  if (elements.empty) elements.empty.classList.add('hidden');
  if (elements.unauth) elements.unauth.classList.add('hidden');

  try {
    const response = await fetch('/api/cart');

    if (response.status === 401) {
      hasCartItems = false;
      if (elements.loading) elements.loading.classList.add('hidden');
      if (elements.list) elements.list.innerHTML = '';
      if (elements.shippingSection) elements.shippingSection.classList.add('hidden');
      if (elements.unauth) elements.unauth.classList.remove('hidden');
      updateCheckoutButtonState();
      atualizarResumo(0, 0);
      return;
    }

    if (!response.ok) {
      throw new Error('Falha ao carregar itens do carrinho.');
    }

    const data = await response.json();
    const items = data.items || [];
    const total = data.totalPrice ?? data.total ?? 0;

    if (elements.loading) elements.loading.classList.add('hidden');

    if (items.length === 0) {
      hasCartItems = false;
      if (elements.list) elements.list.innerHTML = '';
      if (elements.shippingSection) elements.shippingSection.classList.add('hidden');
      if (elements.empty) elements.empty.classList.remove('hidden');
      updateCheckoutButtonState();
      atualizarResumo(0, 0);
      return;
    }

    hasCartItems = true;
    renderizarItens(items);
    const totalQuantidade = items.reduce((acc, i) => acc + i.quantidade, 0);
    atualizarResumo(total, totalQuantidade);

    if (elements.shippingSection) {
      elements.shippingSection.classList.remove('hidden');
      if (!addressesLoaded) {
        await loadShippingAddresses();
      } else {
        renderShippingAddresses();
      }
    }
    updateCheckoutButtonState();
  } catch (error) {
    console.error('Erro ao buscar carrinho:', error);
    if (elements.loading) elements.loading.classList.add('hidden');
    showAlert('Não foi possível carregar o carrinho. Tente novamente mais tarde.');
  }
}

// ==================== RENDERIZAR ITENS ====================
function renderizarItens(items) {
  if (!elements.list) return;

  elements.list.innerHTML = items
    .map((item) => {
      const precoUnit = formatPrice(item.preco);
      const subtotal = formatPrice(item.subtotal || item.preco * item.quantidade);
      const categoryName = item.categoria || 'Geral';
      const imgSrc = resolveImage(item.imagem);

      return `
      <article
        class="bg-white border border-[#e8e4de] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-5 transition-all hover:border-[#d0cbc2]"
        data-cart-item-id="${item.id}"
      >
        <!-- Foto + Detalhes do Mangá -->
        <div class="flex items-center gap-4 sm:gap-5 w-full sm:w-auto">
          <a href="/pages/details/details.html?id=${item.produtoId}" class="shrink-0 group">
            <img
              src="${imgSrc}"
              alt="${item.nome}"
              class="w-20 h-28 sm:w-24 sm:h-36 object-cover rounded-xl border border-[#ece8e1] bg-[#f5f0e8] shadow-xs transition-transform group-hover:scale-102"
              loading="lazy"
            />
          </a>

          <div class="flex flex-col gap-1 min-w-0">
            <span class="inline-block self-start text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#f0ece6] text-[#635f6d]">
              ${categoryName}
            </span>
            <a
              href="/pages/details/details.html?id=${item.produtoId}"
              class="font-poppins font-bold text-base sm:text-lg text-[#111215] hover:text-brandpink transition-colors line-clamp-2"
            >
              ${item.nome}
            </a>
            <div class="text-xs text-[#7c7a84] font-medium flex items-center gap-2 mt-0.5">
              <span>Unitário: R$ ${precoUnit}</span>
              <span>•</span>
              <span class="${item.estoque <= 3 ? 'text-amber-600 font-semibold' : ''}">${item.estoque} un. em estoque</span>
            </div>
          </div>
        </div>

        <!-- Controles: Quantidade + Subtotal + Excluir -->
        <div class="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-[#f0ece6]">
          
          <!-- Seletor de Quantidade -->
          <div class="flex items-center gap-1.5 bg-[#f5f0e8] border border-[#e8e4de] rounded-xl p-1 shadow-inner">
            <button
              type="button"
              class="btn-diminuir w-8 h-8 rounded-lg bg-white hover:bg-[#eae5dd] text-[#111215] font-bold text-sm flex items-center justify-center transition-colors cursor-pointer shadow-xs active:scale-95"
              data-produto-id="${item.produtoId}"
              aria-label="Diminuir quantidade"
            >
              −
            </button>
            <input
              type="number"
              class="quantidade-input w-12 text-center font-bold text-sm bg-transparent text-[#111215] border-none focus:outline-none"
              value="${item.quantidade}"
              min="1"
              max="${item.estoque}"
              data-produto-id="${item.produtoId}"
              aria-label="Quantidade"
            />
            <button
              type="button"
              class="btn-aumentar w-8 h-8 rounded-lg bg-white hover:bg-[#eae5dd] text-[#111215] font-bold text-sm flex items-center justify-center transition-colors cursor-pointer shadow-xs active:scale-95"
              data-produto-id="${item.produtoId}"
              aria-label="Aumentar quantidade"
            >
              +
            </button>
          </div>

          <!-- Subtotal do Item -->
          <div class="text-right min-w-[90px]">
            <span class="block text-[11px] text-[#8a8793] uppercase font-semibold">Subtotal</span>
            <span class="font-poppins font-extrabold text-base sm:text-lg text-[#111215]">
              R$ ${subtotal}
            </span>
          </div>

          <!-- Botão Excluir -->
          <button
            type="button"
            class="btn-excluir text-[#8a8793] hover:text-red-600 p-2.5 rounded-xl hover:bg-red-50 transition-all cursor-pointer"
            data-produto-id="${item.produtoId}"
            title="Remover do carrinho"
            aria-label="Remover ${item.nome} do carrinho"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2m-6 5v6m4-6v6"/>
            </svg>
          </button>

        </div>
      </article>
      `;
    })
    .join('');

  configurarEventosItens();
}

// ==================== CONFIGURAR EVENTOS ====================
function configurarEventosItens() {
  // Alteração direta no input
  document.querySelectorAll('.quantidade-input').forEach((input) => {
    input.addEventListener('change', async function () {
      const produtoId = Number(this.getAttribute('data-produto-id'));
      let novaQtd = parseInt(this.value, 10);

      if (isNaN(novaQtd) || novaQtd < 1) {
        novaQtd = 1;
        this.value = '1';
      }

      await alterarQuantidade(produtoId, novaQtd);
    });
  });

  // Botões de diminuir quantidade (-)
  document.querySelectorAll('.btn-diminuir').forEach((btn) => {
    btn.addEventListener('click', async function () {
      const produtoId = Number(this.getAttribute('data-produto-id'));
      const input = document.querySelector(`.quantidade-input[data-produto-id="${produtoId}"]`);
      if (!input) return;

      const atual = parseInt(input.value, 10) || 1;
      if (atual > 1) {
        input.value = String(atual - 1);
        await alterarQuantidade(produtoId, atual - 1);
      }
    });
  });

  // Botões de aumentar quantidade (+)
  document.querySelectorAll('.btn-aumentar').forEach((btn) => {
    btn.addEventListener('click', async function () {
      const produtoId = Number(this.getAttribute('data-produto-id'));
      const input = document.querySelector(`.quantidade-input[data-produto-id="${produtoId}"]`);
      if (!input) return;

      const atual = parseInt(input.value, 10) || 1;
      input.value = String(atual + 1);
      await alterarQuantidade(produtoId, atual + 1);
    });
  });

  // Botões de exclusão
  document.querySelectorAll('.btn-excluir').forEach((btn) => {
    btn.addEventListener('click', async function () {
      const produtoId = Number(this.getAttribute('data-produto-id'));
      await excluirItem(produtoId);
    });
  });
}

// ==================== REGRAS DE ALTERAÇÃO E EXCLUSÃO ====================
async function alterarQuantidade(produtoId, novaQuantidade) {
  hideAlert();
  try {
    const response = await fetch('/api/cart/alterar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ produtoId, novaQuantidade })
    });

    if (response.ok) {
      await carregarCarrinho();
    } else {
      const data = await response.json().catch(() => ({}));
      showAlert(data.message || 'Erro ao atualizar quantidade. Verifique o estoque disponível.');
      await carregarCarrinho();
    }
  } catch (error) {
    console.error('Erro ao atualizar quantidade:', error);
    showAlert('Erro de conexão ao atualizar quantidade.');
    await carregarCarrinho();
  }
}

async function excluirItem(produtoId) {
  if (!confirm('Tem certeza que deseja remover este item do carrinho?')) {
    return;
  }

  hideAlert();
  try {
    const response = await fetch('/api/cart/excluir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ produtoId })
    });

    if (response.ok) {
      await carregarCarrinho();
    } else {
      const data = await response.json().catch(() => ({}));
      showAlert(data.message || 'Erro ao tentar excluir o item do carrinho.');
    }
  } catch (error) {
    console.error('Erro ao excluir item:', error);
    showAlert('Erro na comunicação com o servidor.');
  }
}

// ==================== FINALIZAR COMPRA ====================
if (elements.btnFinalizar) {
  elements.btnFinalizar.addEventListener('click', async function () {
    if (isCheckingOut) return;

    if (!selectedAddressId) {
      showAlert('Selecione um endereço de entrega antes de finalizar a compra.');
      return;
    }

    if (!confirm('Deseja realmente finalizar a sua compra?')) {
      return;
    }

    isCheckingOut = true;
    const btn = elements.btnFinalizar;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `
      <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      <span>Processando compra...</span>
    `;

    try {
      const response = await fetch('/api/cart/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addressId: selectedAddressId })
      });

      if (response.ok) {
        window.location.href = '/pages/orders/orders.html';
      } else {
        const data = await response.json().catch(() => ({}));
        const erroMsg = data.message || 'Erro ao processar pedido.';
        showAlert('Atenção: ' + erroMsg);
        await carregarCarrinho();
      }
    } catch (error) {
      console.error('Erro ao finalizar compra:', error);
      showAlert('Erro ao processar comunicação com o servidor.');
    } finally {
      isCheckingOut = false;
      btn.innerHTML = originalText;
      updateCheckoutButtonState();
    }
  });
}

// ==================== ATUALIZAR RESUMO ====================
function atualizarResumo(total, totalItens = 0) {
  if (elements.subtotal) elements.subtotal.textContent = `R$ ${formatPrice(total)}`;
  if (elements.total) elements.total.textContent = `R$ ${formatPrice(total)}`;
  if (elements.totalItemsCount) elements.totalItemsCount.textContent = String(totalItens);
  if (elements.itemsWord) elements.itemsWord.textContent = totalItens === 1 ? 'item' : 'itens';
}

// ==================== INICIALIZAÇÃO COM GUARD ====================
let _cartInitialized = false;

async function initCarrinho() {
  if (_cartInitialized) return;
  _cartInitialized = true;
  try {
    await carregarCarrinho();
  } catch (e) {
    _cartInitialized = false;
    throw e;
  }
}

document.addEventListener('DOMContentLoaded', initCarrinho);
document.addEventListener('layoutReady', initCarrinho);
