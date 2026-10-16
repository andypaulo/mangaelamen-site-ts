// scripts/header-search.js
// Autocomplete da busca no header. O header vem de um include, então
// esperamos o evento "layoutReady" antes de procurar os elementos.

document.addEventListener('layoutReady', () => {
  const searchInput = document.getElementById('searchInput');
  const searchPreview = document.getElementById('searchPreview');
  const suggestionsList = document.getElementById('suggestionsList');

  if (!searchInput) return;

  searchInput.addEventListener('input', async function () {
    const term = this.value.trim();

    if (term.length < 2) {
      searchPreview.classList.add('hidden');
      return;
    }

    try {
      // Ajuste este endpoint para a rota real da sua API Fastify.
      const response = await fetch(`/api/storefront/suggestions?search=${encodeURIComponent(term)}`);
      const products = await response.json();

      if (products.length > 0) {
        suggestionsList.innerHTML = products
          .map(
            (product) => `
              <li class="px-[15px] py-[10px] border-b border-[#eee] cursor-pointer">
                <a href="/pages/details/details.html?id=${product.id}" class="no-underline text-[#333] block w-full">${product.name}</a>
              </li>
            `
          )
          .join('');
        searchPreview.classList.remove('hidden');
      } else {
        searchPreview.classList.add('hidden');
      }
    } catch (error) {
      console.error('Erro ao buscar sugestões:', error);
    }
  });

  document.addEventListener('click', (event) => {
    if (!searchInput.contains(event.target) && !searchPreview.contains(event.target)) {
      searchPreview.classList.add('hidden');
    }
  });
});