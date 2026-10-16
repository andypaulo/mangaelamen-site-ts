/**
 * scripts/admin-form.js
 * Usado tanto em pages/admin-create.html quanto em pages/admin-edit.html?id=123.
 * O modo é detectado pela presença do parâmetro "id" na URL.
 */
const idProduto = new URLSearchParams(location.search).get('id');
const modoEdicao = Boolean(idProduto);

const form = document.getElementById('formProduto');
const tituloForm = document.getElementById('tituloForm');
const btnSubmit = document.getElementById('btnSubmit');
const formErro = document.getElementById('formErro');
const categorySelect = document.getElementById('categoryId');
const imagemInput = document.getElementById('image');
const previewImagem = document.getElementById('previewImagem');

function resolverImagemLocal(imagem) {
  if (!imagem) return '/images/sem-foto.jpg';
  return imagem.startsWith('http') ? imagem : '/images/' + imagem;
}

imagemInput.addEventListener('input', function () {
  previewImagem.src = resolverImagemLocal(this.value.trim());
});

async function carregarCategorias(categoryIdSelecionado) {
  try {
    const response = await fetch('/api/categories');
    const categories = await response.json();
    categories.forEach((cat) => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = cat.name;
      if (categoryIdSelecionado && cat.id === categoryIdSelecionado) option.selected = true;
      categorySelect.appendChild(option);
    });
  } catch (error) {
    console.error('Erro ao carregar categorias:', error);
  }
}

async function carregarProdutoParaEdicao() {
  try {
    const response = await fetch(`/api/products/${idProduto}`);
    if (!response.ok) throw new Error('Produto não encontrado');
    const product = await response.json();

    document.getElementById('name').value = product.name;
    document.getElementById('description').value = product.description || '';
    document.getElementById('price').value = product.price;
    document.getElementById('stock').value = product.stock;
    document.getElementById('image').value = product.image || '';
    previewImagem.src = resolverImagemLocal(product.image);

    await carregarCategorias(product.categoryId);
  } catch (error) {
    console.error(error);
    formErro.textContent = 'Não foi possível carregar os dados do produto.';
    formErro.classList.remove('hidden');
  }
}

function montarPayload() {
  return {
    name: document.getElementById('name').value.trim(),
    description: document.getElementById('description').value.trim(),
    price: parseFloat(document.getElementById('price').value),
    stock: parseInt(document.getElementById('stock').value, 10),
    image: document.getElementById('image').value.trim() || 'sem-foto.jpg',
    categoryId: parseInt(categorySelect.value, 10),
  };
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formErro.classList.add('hidden');
  btnSubmit.disabled = true;
  btnSubmit.textContent = modoEdicao ? 'Salvando...' : 'Cadastrando...';

  try {
    // Ajuste estes endpoints para as rotas reais da sua API Fastify.
    const url = modoEdicao ? `/api/products/${idProduto}` : '/api/products';
    const method = modoEdicao ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(montarPayload()),
    });

    if (response.ok) {
      window.location.href = '/pages/admin/admin.html';
    } else {
      const erro = await response.json().catch(() => ({}));
      formErro.textContent = erro.message || 'Erro ao salvar o produto.';
      formErro.classList.remove('hidden');
    }
  } catch (error) {
    console.error(error);
    formErro.textContent = 'Erro de conexão com o servidor.';
    formErro.classList.remove('hidden');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = modoEdicao ? 'Salvar Alterações' : 'Cadastrar Produto';
  }
});

// ---------- Inicialização ----------
if (modoEdicao) {
  tituloForm.textContent = 'Editar Produto';
  btnSubmit.textContent = 'Salvar Alterações';
  document.title = 'Editar Produto - Manga&Lamen';
  carregarProdutoParaEdicao();
} else {
  carregarCategorias();
}
