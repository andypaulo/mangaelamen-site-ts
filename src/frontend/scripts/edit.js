import { mountLayout } from '../../js/partials.js';
import { api } from '../../js/api.js';
import { renderFormFields, popularCategorias, ativarPreviewImagem, lerDadosFormulario } from '../../js/produto-form.js';

mountLayout({ titulo: 'Editar Produto - Manga&Lamen', navAtivo: 'admin' });

const formFieldsEl = document.getElementById('formFields');
const form = document.getElementById('formProduto');
const erroEl = document.getElementById('formErro');

// Antes o :id vinha da rota do Fastify (/admin/produtos/:id/editar) e o EJS
// já recebia `produto` pronto. Numa página estática, lemos o id da query
// string (?id=123) e buscamos os dados via fetch.
const params = new URLSearchParams(window.location.search);
const produtoId = params.get('id');

async function init() {
  if (!produtoId) {
    erroEl.textContent = 'Produto não informado.';
    erroEl.classList.remove('hidden');
    return;
  }

  const [produto, categorias] = await Promise.all([
    api.obterProduto(produtoId),
    api.listarCategorias(),
  ]);

  document.getElementById('produtoId').value = produto.id;
  formFieldsEl.innerHTML = renderFormFields(produto);
  popularCategorias(categorias, produto.categoryId);
  ativarPreviewImagem();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  erroEl.classList.add('hidden');

  const dados = lerDadosFormulario(form);

  try {
    await api.editarProduto(produtoId, dados);
    sessionStorage.setItem('flashSucesso', 'Produto atualizado com sucesso.');
    window.location.href = '/pages/admin/admin.html';
  } catch (err) {
    erroEl.textContent = err.message || 'Erro ao salvar alterações.';
    erroEl.classList.remove('hidden');
  }
});

init();
