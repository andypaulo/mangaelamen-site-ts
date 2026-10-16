/**
 * scripts/components/produto-card.js
 * Depende de renderButton/renderBadge/formatarPreco/resolverImagem (scripts/components/ui.js)
 * Espera um objeto `item` no formato retornado pela API: { id, name, description, price, stock, image, category }
 */
function renderProdutoCard(item) {
  const esgotado = item.stock <= 0;
  const nomeCategoria = item.category ? item.category.name : '—';
  const dataJson = encodeURIComponent(JSON.stringify(item));

  const badgeEsgotado = esgotado
    ? `<div class="absolute top-2.5 left-2.5 z-10">${renderBadge({ label: 'Esgotado', variant: 'danger-solid' })}</div>`
    : '';

  const acoes = esgotado
    ? renderButton({ label: 'Indisponível', variant: 'outline', fullWidth: true, disabled: true })
    : `
      ${renderButton({ label: 'Comprar Agora', variant: 'secondary', fullWidth: true, onclick: `comprarAgora(${item.id})` })}
      ${renderButton({ label: 'Adicionar ao Carrinho', variant: 'primary', fullWidth: true, onclick: `adicionarCarrinho(${item.id})` })}
    `;

  return `
    <div class="relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 flex flex-col ${esgotado ? 'opacity-75' : ''}">
      ${badgeEsgotado}

      <div class="relative group">
        <img src="${resolverImagem(item.image)}" alt="${item.name}"
             class="w-full aspect-[2/3] object-contain bg-white p-2 transition-transform duration-300 group-hover:scale-105 ${esgotado ? 'grayscale' : ''}" />

        <button type="button" data-produto="${dataJson}"
                class="btn-quick-view absolute top-2.5 right-2.5 bg-white/90 hover:bg-white text-[#111] text-xs font-semibold px-3 py-1.5 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          Visualização rápida
        </button>
      </div>

      <div class="p-4 flex flex-col flex-1">
        <a href="/pages/details.html?id=${item.id}" class="no-underline text-inherit flex-1">
          <h5 class="font-semibold text-[#111] text-base mb-1 line-clamp-2">${item.name}</h5>
          <p class="text-sm text-[#777] mb-2 line-clamp-2">${item.description || ''}</p>
          <div class="mb-2">${renderBadge({ label: nomeCategoria, variant: 'neutral' })}</div>
          <h4 class="text-brandpink font-bold text-xl mb-3">R$ ${formatarPreco(item.price)}</h4>
        </a>

        <div class="mt-auto flex flex-col gap-2">
          ${acoes}
        </div>
      </div>
    </div>
  `;
}
