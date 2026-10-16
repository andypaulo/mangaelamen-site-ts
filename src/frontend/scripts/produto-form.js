import { Input } from './components.js';

/**
 * Gera o HTML dos campos do formulário de produto.
 * @param {object|null} produto - null quando é criação
 */
export function renderFormFields(produto) {
  const p = produto || {};

  return `
    <div class="mb-5">
      ${Input({ name: 'name', label: 'Nome', value: p.name, required: true, extraClass: 'py-3 px-4 text-base' })}
    </div>

    <div class="mb-5">
      <label for="description" class="font-semibold text-[#222] mb-2 block">Descrição</label>
      <textarea id="description" name="description" rows="4"
                class="w-full border border-[#dcdcdc] rounded-lg px-4 py-3 focus:outline-none focus:border-brandpink focus:ring-2 focus:ring-brandpink/20">${p.description || ''}</textarea>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
      ${Input({ name: 'price', label: 'Preço (R$)', type: 'number', value: p.price ?? '', required: true, extraClass: 'py-3 px-4 text-base' })}
      ${Input({ name: 'stock', label: 'Estoque', type: 'number', value: p.stock ?? 0, required: true, extraClass: 'py-3 px-4 text-base' })}
    </div>

    <div class="mb-5">
      ${Input({ name: 'image', label: 'Imagem (URL ou nome do arquivo)', value: p.image, placeholder: 'sem-foto.jpg ou https://...', extraClass: 'py-3 px-4 text-base' })}
      <div class="mt-3 flex items-center gap-3">
        <img id="previewImagem"
             src="${p.image ? (p.image.startsWith('http') ? p.image : '/images/' + p.image) : '/images/sem-foto.jpg'}"
             alt="Pré-visualização" class="w-16 h-24 object-cover rounded border border-[#eee]" />
        <span class="text-xs text-[#888]">Pré-visualização da imagem</span>
      </div>
    </div>

    <div class="mb-6">
      <label for="categoryId" class="font-semibold text-[#222] mb-2 block">Categoria</label>
      <select id="categoryId" name="categoryId" required
              class="w-full border border-[#dcdcdc] rounded-lg px-4 py-3 focus:outline-none focus:border-brandpink focus:ring-2 focus:ring-brandpink/20">
        <option value="">Selecione</option>
      </select>
    </div>`;
}

/** Preenche o <select id="categoryId"> com as categorias vindas da API. */
export function popularCategorias(categorias, categoriaSelecionadaId) {
  const select = document.getElementById('categoryId');
  categorias.forEach((cat) => {
    const option = document.createElement('option');
    option.value = cat.id;
    option.textContent = cat.name;
    if (categoriaSelecionadaId === cat.id) option.selected = true;
    select.appendChild(option);
  });
}

/** Liga a pré-visualização da imagem ao digitar no campo `image`. */
export function ativarPreviewImagem() {
  const inputImagem = document.getElementById('image');
  const preview = document.getElementById('previewImagem');
  inputImagem.addEventListener('input', function () {
    const valor = this.value.trim();
    preview.src = valor ? (valor.startsWith('http') ? valor : '/images/' + valor) : '/images/sem-foto.jpg';
  });
}

/** Lê os valores atuais do formulário e devolve um objeto pronto pro fetch. */
export function lerDadosFormulario(form) {
  const formData = new FormData(form);
  return {
    name: formData.get('name'),
    description: formData.get('description'),
    price: Number(formData.get('price')),
    stock: Number(formData.get('stock')),
    image: formData.get('image'),
    categoryId: Number(formData.get('categoryId')),
  };
}
