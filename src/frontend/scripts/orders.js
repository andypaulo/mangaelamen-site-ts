/**
 * scripts/orders.js
 * Página "Minhas Compras" — visualização de pedidos e linha do tempo de estados.
 * Sem uso de localStorage/sessionStorage para estado: dados obtidos via API.
 */

// Mapeamento dos 4 estados com descrições e estilos
const STATUS_CONFIG = {
  CONFIRMED: {
    label: 'Pedido confirmado',
    step: 1,
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200',
    dotColor: 'bg-blue-600',
  },
  PREPARING: {
    label: 'Em preparação',
    step: 2,
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-200',
    dotColor: 'bg-amber-500',
  },
  SHIPPED: {
    label: 'Enviado',
    step: 3,
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-200',
    dotColor: 'bg-purple-600',
  },
  DELIVERED: {
    label: 'Entregue',
    step: 4,
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    dotColor: 'bg-emerald-600',
  },
};

const ORDER_STEPS = [
  { key: 'CONFIRMED', label: 'Confirmado' },
  { key: 'PREPARING', label: 'Em preparação' },
  { key: 'SHIPPED', label: 'Enviado' },
  { key: 'DELIVERED', label: 'Entregue' },
];

function formatPrice(val) {
  return Number(val || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

function getShortOrderId(uuid) {
  if (!uuid) return '#—';
  const clean = uuid.replace(/-/g, '');
  return '#' + clean.substring(0, 8).toUpperCase();
}

function getStatusBadge(status) {
  const conf = STATUS_CONFIG[status];
  if (!conf) {
    return `
      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
        <span class="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
        ${status || 'Desconhecido'}
      </span>
    `;
  }
  return `
    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${conf.badgeBg} ${conf.badgeText} border ${conf.badgeBorder}">
      <span class="w-1.5 h-1.5 rounded-full ${conf.dotColor}"></span>
      ${conf.label}
    </span>
  `;
}

function renderTimeline(currentStatus, timelineEvents) {
  const currentStep = STATUS_CONFIG[currentStatus]?.step || 1;
  const eventsByStatus = {};
  (timelineEvents || []).forEach((ev) => {
    eventsByStatus[ev.status] = ev.createdAt;
  });

  return `
    <div class="pt-5 mt-5 border-t border-[#f0ece6]">
      <h3 class="text-xs font-bold text-[#8a8793] uppercase tracking-wider mb-4">
        Acompanhamento da Entrega
      </h3>

      <div class="relative grid grid-cols-2 sm:grid-cols-4 gap-4">
        ${ORDER_STEPS.map((step, idx) => {
          const stepNumber = idx + 1;
          const isCompleted = stepNumber <= currentStep;
          const isCurrent = stepNumber === currentStep;
          const eventDate = eventsByStatus[step.key];

          let dotClass = 'bg-[#e8e4de] text-[#8a8793]';
          let lineClass = 'border-[#e8e4de]';
          let titleClass = 'text-[#8a8793]';

          if (isCurrent) {
            dotClass = 'bg-brandpink text-white ring-4 ring-brandpink/20';
            lineClass = 'border-brandpink';
            titleClass = 'text-[#111215] font-bold';
          } else if (isCompleted) {
            dotClass = 'bg-[#111215] text-white';
            lineClass = 'border-[#111215]';
            titleClass = 'text-[#111215] font-semibold';
          }

          return `
            <div class="flex flex-col items-start gap-1.5">
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${dotClass}">
                  ${isCompleted && !isCurrent ? '✓' : stepNumber}
                </div>
                <span class="text-xs ${titleClass}">
                  ${step.label}
                </span>
              </div>
              <span class="text-[11px] text-[#727785] pl-8">
                ${eventDate ? formatDate(eventDate) : (isCompleted ? 'Concluído' : 'Aguardando')}
              </span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderOrderCard(order) {
  const shortId = getShortOrderId(order.id);
  const itemsCount = order.items.reduce((acc, item) => acc + item.quantity, 0);

  return `
    <article class="bg-white border border-[#e8e4de] rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col gap-5 hover:border-[#d5cfc5] transition-all">
      <!-- Topo do Card: Número, Data, Status e Total -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#f0ece6] pb-4">
        <div class="flex flex-wrap items-center gap-3">
          <span class="font-poppins font-extrabold text-lg text-[#111215]">
            ${shortId}
          </span>
          <span class="text-xs text-[#727785]">
            Realizado em ${formatDate(order.createdAt)}
          </span>
          ${getStatusBadge(order.status)}
        </div>

        <div class="flex items-baseline gap-2 self-start sm:self-auto">
          <span class="text-xs text-[#727785]">${itemsCount} ${itemsCount === 1 ? 'volume' : 'volumes'}</span>
          <span class="font-poppins font-bold text-xl text-brandpink">
            R$ ${formatPrice(order.totalPrice)}
          </span>
        </div>
      </div>

      <!-- Lista de Itens do Pedido -->
      <div class="flex flex-col gap-3">
        ${order.items.map((item) => {
          const imgSrc = item.productImage?.startsWith('http')
            ? item.productImage
            : `/assets/public/images/${item.productImage || 'sem-foto.jpg'}`;

          return `
            <div class="flex items-center justify-between gap-4 py-2">
              <div class="flex items-center gap-3 min-w-0">
                <img
                  src="${imgSrc}"
                  alt="${item.productName}"
                  class="w-12 h-16 object-cover rounded-lg border border-[#e8e4de] bg-[#f4f1eb] shrink-0"
                  onerror="this.src='/assets/public/images/sem-foto.jpg';"
                />
                <div class="flex flex-col min-w-0">
                  <h4 class="font-poppins font-medium text-sm text-[#111215] truncate" title="${item.productName}">
                    ${item.productName}
                  </h4>
                  <span class="text-xs text-[#727785]">
                    ${item.quantity} × R$ ${formatPrice(item.priceAtPurchase)}
                  </span>
                </div>
              </div>

              <div class="text-right shrink-0">
                <span class="font-semibold text-sm text-[#111215]">
                  R$ ${formatPrice(item.subtotal)}
                </span>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Linha do Tempo de Estados -->
      ${renderTimeline(order.status, order.timeline)}
    </article>
  `;
}

async function carregarCompras() {
  const loadingEl = document.getElementById('ordersLoadingState');
  const unauthEl = document.getElementById('ordersUnauthenticatedState');
  const emptyEl = document.getElementById('ordersEmptyState');
  const listEl = document.getElementById('ordersList');

  if (!loadingEl || !unauthEl || !emptyEl || !listEl) return;

  loadingEl.classList.remove('hidden');
  unauthEl.classList.add('hidden');
  emptyEl.classList.add('hidden');
  listEl.innerHTML = '';

  try {
    const res = await fetch('/api/orders');

    if (res.status === 401) {
      loadingEl.classList.add('hidden');
      unauthEl.classList.remove('hidden');
      return;
    }

    if (!res.ok) {
      throw new Error(`Erro ao buscar pedidos (${res.status})`);
    }

    const orders = await res.json();
    loadingEl.classList.add('hidden');

    if (!Array.isArray(orders) || orders.length === 0) {
      emptyEl.classList.remove('hidden');
      return;
    }

    listEl.innerHTML = orders.map(renderOrderCard).join('');
  } catch (error) {
    console.error('Erro ao carregar compras:', error);
    loadingEl.classList.add('hidden');
    emptyEl.classList.remove('hidden');
  }
}

document.addEventListener('DOMContentLoaded', carregarCompras);
document.addEventListener('layoutReady', carregarCompras);
