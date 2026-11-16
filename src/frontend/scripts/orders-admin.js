/**
 * scripts/orders-admin.js
 * Gerenciamento de pedidos no painel administrativo.
 * Transição de estados atômica e avanço visual sem recarregar a página inteira.
 * Sem uso de localStorage/sessionStorage.
 */

const NEXT_STATUS_CONFIG = {
  CONFIRMED: {
    next: 'PREPARING',
    btnText: 'Avançar para Em Preparação →',
    btnClass: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
  PREPARING: {
    next: 'SHIPPED',
    btnText: 'Avançar para Enviado →',
    btnClass: 'bg-purple-600 hover:bg-purple-700 text-white',
  },
  SHIPPED: {
    next: 'DELIVERED',
    btnText: 'Avançar para Entregue →',
    btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  },
  DELIVERED: {
    next: null,
    btnText: 'Pedido Entregue ✓',
    btnClass: 'bg-gray-200 text-gray-500 cursor-not-allowed',
  },
};

const STATUS_BADGES = {
  CONFIRMED: '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Confirmado</span>',
  PREPARING: '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Em preparação</span>',
  SHIPPED: '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">Enviado</span>',
  DELIVERED: '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Entregue</span>',
};

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

function showFlash(type, message) {
  const successEl = document.getElementById('flashSuccess');
  const errorEl = document.getElementById('flashError');
  const successText = document.getElementById('flashSuccessText');
  const errorText = document.getElementById('flashErrorText');

  if (successEl) successEl.classList.add('hidden');
  if (errorEl) errorEl.classList.add('hidden');

  if (type === 'success' && successEl && successText) {
    successText.textContent = message;
    successEl.classList.remove('hidden');
    setTimeout(() => successEl.classList.add('hidden'), 5000);
  } else if (errorEl && errorText) {
    errorText.textContent = message;
    errorEl.classList.remove('hidden');
    setTimeout(() => errorEl.classList.add('hidden'), 5000);
  }
}

function updateMetrics(orders) {
  const totalEl = document.getElementById('statTotalOrders');
  const confirmedEl = document.getElementById('statConfirmed');
  const inTransitEl = document.getElementById('statInTransit');
  const deliveredEl = document.getElementById('statDelivered');

  if (totalEl) totalEl.textContent = String(orders.length);
  if (confirmedEl) confirmedEl.textContent = String(orders.filter((o) => o.status === 'CONFIRMED').length);
  if (inTransitEl) inTransitEl.textContent = String(orders.filter((o) => o.status === 'PREPARING' || o.status === 'SHIPPED').length);
  if (deliveredEl) deliveredEl.textContent = String(orders.filter((o) => o.status === 'DELIVERED').length);
}

function renderOrdersTable(orders) {
  const tbody = document.getElementById('ordersTableBody');
  const emptyState = document.getElementById('emptyOrdersState');
  if (!tbody || !emptyState) return;

  if (orders.length === 0) {
    tbody.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  tbody.innerHTML = orders.map((order) => {
    const transition = NEXT_STATUS_CONFIG[order.status] || {
      next: null,
      btnText: order.status,
      btnClass: 'bg-gray-200 text-gray-500 cursor-not-allowed',
    };
    const badgeHtml = STATUS_BADGES[order.status] || `<span class="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">${order.status}</span>`;
    const isCompleted = !transition.next;

    return `
      <tr class="border-b border-[#f2f2f2] hover:bg-[#fafafa] transition-colors" data-order-id="${order.id}">
        <td class="px-4 py-3 font-mono font-bold text-[#111]">
          ${getShortOrderId(order.id)}
        </td>
        <td class="px-4 py-3">
          <div class="flex flex-col">
            <span class="font-medium text-[#111]">${order.customer?.name || 'Cliente'}</span>
            <span class="text-xs text-[#777]">${order.customer?.email || ''}</span>
          </div>
        </td>
        <td class="px-4 py-3 text-xs text-[#555]">
          ${formatDate(order.createdAt)}
        </td>
        <td class="px-4 py-3 text-xs font-semibold text-[#444]">
          ${order.itemsCount} ${order.itemsCount === 1 ? 'item' : 'itens'}
        </td>
        <td class="px-4 py-3 font-semibold text-[#111]">
          R$ ${formatPrice(order.totalPrice)}
        </td>
        <td class="px-4 py-3 status-cell">
          ${badgeHtml}
        </td>
        <td class="px-4 py-3 text-right action-cell">
          <button
            type="button"
            class="advance-btn text-xs font-semibold px-3 py-1.5 rounded-lg transition-all shadow-xs ${transition.btnClass}"
            data-order-id="${order.id}"
            data-target-status="${transition.next || ''}"
            ${isCompleted ? 'disabled' : ''}
          >
            ${transition.btnText}
          </button>
        </td>
      </tr>
    `;
  }).join('');

  attachButtonEvents();
}

function attachButtonEvents() {
  document.querySelectorAll('.advance-btn:not([disabled])').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const button = e.currentTarget;
      const orderId = button.getAttribute('data-order-id');
      const targetStatus = button.getAttribute('data-target-status');

      if (!orderId || !targetStatus) return;

      const originalText = button.innerHTML;
      button.disabled = true;
      button.innerHTML = '<span class="animate-spin inline-block mr-1">↻</span> Salvando...';

      try {
        const res = await fetch(`/api/admin/orders/${orderId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: targetStatus }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || `Erro ao atualizar (${res.status})`);
        }

        const data = await res.json();
        showFlash('success', `Pedido atualizado para: ${targetStatus}`);

        // Atualiza a lista completa sem recarregar a tela inteira
        await carregarPedidosAdmin();
      } catch (err) {
        console.error('Erro ao avançar status:', err);
        showFlash('error', err.message || 'Falha na comunicação com o servidor.');
        button.disabled = false;
        button.innerHTML = originalText;
      }
    });
  });
}

async function carregarPedidosAdmin() {
  try {
    const res = await fetch('/api/admin/orders');
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        window.location.replace('/pages/login/login.html');
        return;
      }
      throw new Error(`Erro ao carregar lista de pedidos (${res.status})`);
    }

    const orders = await res.json();
    updateMetrics(orders);
    renderOrdersTable(orders);
  } catch (err) {
    console.error('Erro ao carregar pedidos admin:', err);
    showFlash('error', 'Não foi possível carregar os pedidos.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  carregarPedidosAdmin();
  const reloadBtn = document.getElementById('btnReloadOrders');
  if (reloadBtn) {
    reloadBtn.addEventListener('click', carregarPedidosAdmin);
  }
});
document.addEventListener('layoutReady', carregarPedidosAdmin);
