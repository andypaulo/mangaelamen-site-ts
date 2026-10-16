/**
 * scripts/admin.js
 * Roda em pages/admin.html. Depende de scripts/components/ui.js
 */
const corpoTabela = document.getElementById('corpoTabela');
const buscaProduto = document.getElementById('buscaProduto');
const filtroCategoria = document.getElementById('filtroCategoria');
const filtroEstoque = document.getElementById('filtroEstoque');
const contagemResultados = document.getElementById('contagemResultados');
const estadoVazioTabela = document.getElementById('estadoVazioTabela');

let toastTimer = null;
function mostrarToast(mensagem) {
  const toast = document.getElementById('toast');
  toast.textContent = mensagem;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3000);
}

function linhaProdutoHTML(item) {
  const imagemSrc = resolverImagem(item.image);
  const precoFormatado = formatarPreco(item.price);
  const nomeCategoria = item.category ? item.category.name : '—';

  let estoqueVariant = 'success';
  let estoqueLabel = `${item.stock} un.`;
  let estoqueTag = 'normal';
  if (item.stock <= 0) { estoqueVariant = 'danger'; estoqueLabel = 'Esgotado'; estoqueTag = 'zerado'; }
  else if (item.stock <= 5) { estoqueVariant = 'warning'; estoqueLabel = `${item.stock} un. (baixo)`; estoqueTag = 'baixo'; }

  return `
    <tr class="border-b border-[#f2f2f2] hover:bg-[#fafafa] transition-colors"
        data-id="${item.id}"
        data-nome="${item.name.toLowerCase()}"
        data-categoria="${nomeCategoria}"
        data-preco="${item.price}"
        data-estoque="${item.stock}"
        data-estoque-tag="${estoqueTag}">
      <td class="px-4 py-3"><img src="${imagemSrc}" alt="${item.name}" class="w-10 h-14 object-cover rounded border border-[#eee]" /></td>
      <td class="px-4 py-3 font-medium text-[#111]">${item.name}</td>
      <td class="px-4 py-3">${renderBadge({ label: nomeCategoria, variant: 'neutral' })}</td>
      <td class="px-4 py-3 text-[#333]">R$ ${precoFormatado}</td>
      <td class="px-4 py-3">${renderBadge({ label: estoqueLabel, variant: estoqueVariant })}</td>
      <td class="px-4 py-3">
        <div class="flex justify-end gap-2">
          ${renderButton({ label: 'Editar', href: `/pages/edit.html?id=${item.id}`, variant: 'outline', size: 'sm' })}
          ${renderButton({ label: 'Excluir', variant: 'danger-outline', size: 'sm', extraClass: 'btn-excluir' })}
        </div>
      </td>
    </tr>
  `;
}

function atualizarEstatisticas(produtos) {
  const total = produtos.length;
  let baixo = 0, zerado = 0, valorTotal = 0;

  produtos.forEach((p) => {
    if (p.stock <= 0) zerado++;
    else if (p.stock <= 5) baixo++;
    valorTotal += p.stock * p.price;
  });

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statBaixo').textContent = baixo;
  document.getElementById('statZerado').textContent = zerado;
  document.getElementById('statValor').textContent = 'R$ ' + valorTotal.toFixed(2).replace('.', ',');
}

function getLinhas() { return Array.from(corpoTabela.querySelectorAll('tr')); }

function aplicarFiltros() {
  const termo = buscaProduto.value.trim().toLowerCase();
  const categoria = filtroCategoria.value;
  const estoque = filtroEstoque.value;
  let visiveis = 0;

  getLinhas().forEach((linha) => {
    const nomeOk = !termo || linha.dataset.nome.includes(termo);
    const categoriaOk = !categoria || linha.dataset.categoria === categoria;
    const estoqueOk = !estoque || linha.dataset.estoqueTag === estoque;
    const mostrar = nomeOk && categoriaOk && estoqueOk;
    linha.classList.toggle('hidden', !mostrar);
    if (mostrar) visiveis++;
  });

  contagemResultados.textContent = `${visiveis} produto${visiveis !== 1 ? 's' : ''}`;
  estadoVazioTabela.classList.toggle('hidden', visiveis !== 0);
}

let ordenacaoAtual = { campo: null, asc: true };
function ativarOrdenacao() {
  document.querySelectorAll('th[data-sort]').forEach((th) => {
    th.addEventListener('click', () => {
      const campo = th.dataset.sort;
      const asc = ordenacaoAtual.campo === campo ? !ordenacaoAtual.asc : true;
      ordenacaoAtual = { campo, asc };

      document.querySelectorAll('.sort-icon').forEach((el) => (el.textContent = '↕'));
      th.querySelector('.sort-icon').textContent = asc ? '↑' : '↓';

      const linhas = getLinhas();
      const atributo = campo === 'nome' ? 'nome' : campo === 'preco' ? 'preco' : 'estoque';
      linhas.sort((a, b) => {
        const va = atributo === 'nome' ? a.dataset[atributo] : parseFloat(a.dataset[atributo]);
        const vb = atributo === 'nome' ? b.dataset[atributo] : parseFloat(b.dataset[atributo]);
        if (va < vb) return asc ? -1 : 1;
        if (va > vb) return asc ? 1 : -1;
        return 0;
      });
      linhas.forEach((linha) => corpoTabela.appendChild(linha));
    });
  });
}

// ---------- Carregamento inicial ----------
async function carregarCategorias() {
  try {
    const response = await fetch('/api/categories');
    const categorias = await response.json();
    categorias.forEach((cat) => {
      const option = document.createElement('option');
      option.value = cat.name;
      option.textContent = cat.name;
      filtroCategoria.appendChild(option);
    });
  } catch (error) {
    console.error('Erro ao carregar categorias:', error);
  }
}

async function carregarProdutos() {
  try {
    // Sem paginação aqui — o painel do seller trabalha com o catálogo inteiro.
    const response = await fetch('/api/products?all=true');
    const data = await response.json();
    const produtos = data.produtos || data;

    corpoTabela.innerHTML = produtos.map(linhaProdutoHTML).join('');
    atualizarEstatisticas(produtos);
    aplicarFiltros();
    ativarOrdenacao();
  } catch (error) {
    console.error('Erro ao carregar produtos:', error);
    mostrarToast('Não foi possível carregar os produtos.');
  }
}

buscaProduto.addEventListener('input', aplicarFiltros);
filtroCategoria.addEventListener('change', aplicarFiltros);
filtroEstoque.addEventListener('change', aplicarFiltros);

// ---------- Exclusão via modal + AJAX ----------
const modalExcluir = document.getElementById('modalExcluir');
const nomeProdutoExcluir = document.getElementById('nomeProdutoExcluir');
const confirmarExclusao = document.getElementById('confirmarExclusao');
let produtoParaExcluir = null;

corpoTabela.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-excluir');
  if (!btn) return;
  const linha = btn.closest('tr');
  produtoParaExcluir = { id: linha.dataset.id, nome: linha.dataset.nome, linha };
  nomeProdutoExcluir.textContent = `"${produtoParaExcluir.nome}"`;
  modalExcluir.classList.remove('hidden');
});

document.getElementById('cancelarExclusao').addEventListener('click', () => {
  modalExcluir.classList.add('hidden');
  produtoParaExcluir = null;
});

modalExcluir.addEventListener('click', (e) => {
  if (e.target === modalExcluir) { modalExcluir.classList.add('hidden'); produtoParaExcluir = null; }
});

confirmarExclusao.addEventListener('click', async () => {
  if (!produtoParaExcluir) return;
  confirmarExclusao.disabled = true;
  confirmarExclusao.textContent = 'Excluindo...';

  try {
    const response = await fetch(`/api/products/${produtoParaExcluir.id}`, { method: 'DELETE' });

    if (response.ok) {
      produtoParaExcluir.linha.remove();
      mostrarToast('Produto excluído com sucesso.');
      atualizarEstatisticas(getLinhas().map((l) => ({ stock: parseFloat(l.dataset.estoque), price: parseFloat(l.dataset.preco) })));
      aplicarFiltros();
    } else {
      const textoErro = await response.text();
      mostrarToast(textoErro || 'Erro ao excluir produto.');
    }
  } catch (error) {
    console.error(error);
    mostrarToast('Erro de conexão com o servidor.');
  } finally {
    modalExcluir.classList.add('hidden');
    confirmarExclusao.disabled = false;
    confirmarExclusao.textContent = 'Confirmar exclusão';
    produtoParaExcluir = null;
  }
});

carregarCategorias();
carregarProdutos();
