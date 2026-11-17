/**
 * profile-summary.js
 * Seção b): Resumo de pedidos, total gasto, data do último pedido e card do pedido em andamento.
 */

const STATUS_CONFIG = {
  CONFIRMED: {
    label: 'Confirmado',
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

function formatCurrency(val) {
  return Number(val || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatDate(isoString) {
  if (!isoString) return 'Nenhum pedido';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return isoString;
  }
}

function renderMiniTimeline(currentStatus, timelineEvents) {
  const currentStep = STATUS_CONFIG[currentStatus]?.step || 1;
  const eventsByStatus = {};
  (timelineEvents || []).forEach((ev) => {
    eventsByStatus[ev.status] = ev.createdAt;
  });

  return `
    <div class="relative grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#f0ece6]">
      ${ORDER_STEPS.map((step, idx) => {
        const stepNumber = idx + 1;
        const isCompleted = stepNumber <= currentStep;
        const isCurrent = stepNumber === currentStep;

        let dotClass = 'bg-[#e8e4de] text-[#8a8793]';
        let titleClass = 'text-[#8a8793]';

        if (isCurrent) {
          dotClass = 'bg-brandpink text-white ring-4 ring-brandpink/20';
          titleClass = 'text-[#111215] font-bold';
        } else if (isCompleted) {
          dotClass = 'bg-[#111215] text-white';
          titleClass = 'text-[#111215] font-semibold';
        }

        return `
          <div class="flex items-center gap-2">
            <div class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${dotClass}">
              ${isCompleted && !isCurrent ? '✓' : stepNumber}
            </div>
            <span class="text-xs ${titleClass}">
              ${step.label}
            </span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

export async function loadProfileSummary() {
  const container = document.getElementById('summarySection');
  if (!container) return;

  try {
    const res = await fetch('/api/profile/summary');
    if (!res.ok) throw new Error('Falha ao carregar resumo');

    const data = await res.json();

    const ordersCountEl = document.getElementById('summaryOrdersCount');
    const totalSpentEl = document.getElementById('summaryTotalSpent');
    const lastOrderEl = document.getElementById('summaryLastOrder');

    if (ordersCountEl) ordersCountEl.textContent = data.totalOrders;
    if (totalSpentEl) totalSpentEl.textContent = formatCurrency(data.totalSpent);
    if (lastOrderEl) lastOrderEl.textContent = formatDate(data.lastOrderDate);

    const activeContainer = document.getElementById('activeOrderContainer');
    if (!activeContainer) return;

    if (!data.activeOrder) {
      activeContainer.innerHTML = `
        <div class="p-6 bg-white border border-[#e8e4de] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center text-xl shrink-0">
              📦
            </div>
            <div>
              <p class="font-semibold text-sm text-[#111215]">Nenhum pedido em andamento</p>
              <p class="text-xs text-[#5c5b64]">Todos os seus pedidos anteriores já foram entregues.</p>
            </div>
          </div>
          <a href="/pages/orders/orders.html" class="inline-flex items-center gap-1.5 text-xs font-semibold text-brandpink hover:text-brandpink-hover transition-colors">
            Ver histórico completo →
          </a>
        </div>
      `;
    } else {
      const o = data.activeOrder;
      const statusConf = STATUS_CONFIG[o.status] || {
        label: o.status,
        badgeBg: 'bg-gray-100',
        badgeText: 'text-gray-700',
        badgeBorder: 'border-gray-200',
        dotColor: 'bg-gray-400'
      };

      activeContainer.innerHTML = `
        <div class="p-6 bg-white border border-brandpink/30 rounded-2xl shadow-sm">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="font-poppins font-bold text-base text-[#111215]">${o.shortId}</span>
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusConf.badgeBg} ${statusConf.badgeText} border ${statusConf.badgeBorder}">
                  <span class="w-1.5 h-1.5 rounded-full ${statusConf.dotColor}"></span>
                  ${statusConf.label}
                </span>
              </div>
              <p class="text-xs text-[#5c5b64]">${o.itemsCount} ${o.itemsCount === 1 ? 'item' : 'itens'} • ${formatCurrency(o.totalPrice)} • Pedido realizado em ${formatDate(o.createdAt)}</p>
            </div>
            <a href="/pages/orders/orders.html" class="inline-flex items-center gap-1 text-xs font-semibold text-brandpink hover:text-brandpink-hover transition-colors self-start sm:self-auto">
              Ver detalhes no histórico →
            </a>
          </div>

          ${renderMiniTimeline(o.status, o.timeline)}
        </div>
      `;
    }
  } catch (err) {
    console.error('Erro ao renderizar resumo:', err);
  }
}
