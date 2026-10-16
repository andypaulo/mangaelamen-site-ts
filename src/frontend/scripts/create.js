import { mountLayout } from '../../js/partials.js';
import { api } from '../../js/api.js';
import { renderFormFields, popularCategorias, ativarPreviewImagem, lerDadosFormulario } from '../../js/produto-form.js';

mountLayout({ titulo: 'Cadastrar Produto - Manga&Lamen', navAtivo: 'admin' });

const formFieldsEl = document.getElementById('formFields');
const form = document.getElementById('formProduto');
const erroEl = document.getElementById('formErro');

async function init() {
  formFieldsEl.innerHTML = renderFormFields(null);

  const categorias = await api.listarCategorias();
  popularCategorias(categorias);
  ativarPreviewImagem();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  erroEl.classList.add('hidden');

  const dados = lerDadosFormulario(form);

  try {
    await api.criarProduto(dados);
    // Sem server-side flash message: usamos sessionStorage pra mostrar o
    // toast de sucesso depois do redirect na página de gerenciamento.
    sessionStorage.setItem('flashSucesso', 'Produto cadastrado com sucesso.');
    window.location.href = '/pages/admin/admin.html';
  } catch (err) {
    erroEl.textContent = err.message || 'Erro ao cadastrar produto.';
    erroEl.classList.remove('hidden');
  }
});

init();
