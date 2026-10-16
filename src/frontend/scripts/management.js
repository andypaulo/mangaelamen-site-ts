import { mountLayout } from '/scripts/partials.js';
import { api } from '/scripts/api.js';
import { Badge, Button } from '/components/shared/components.js';

mountLayout({ title: 'Painel de Gerenciamento - Manga&Lamen', activeNav: 'admin' });

const tableBody = document.getElementById('tableBody');
const searchProduct = document.getElementById('searchProduct');
const categoryFilter = document.getElementById('categoryFilter');
const stockFilter = document.getElementById('stockFilter');
const resultsCount = document.getElementById('resultsCount');
const emptyTableState = document.getElementById('emptyTableState');

// ---------- Flash messages (antes vinham como `sucesso` / `erroExclusao` do EJS) ----------
function showFlash() {
  const success = sessionStorage.getItem('flashSuccess');
  if (success) {
    const el = document.getElementById('flashSuccess');
    document.getElementById('flashSuccessText').textContent = success;
    el.classList.remove('hidden');
    el.classList.add('flex');
    sessionStorage.removeItem('flashSuccess');
  }
}

// ---------- Toast ----------
let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3000);
}

// ---------- Render da linha da tabela (equivalente ao forEach do EJS) ----------
function productRow(item) {
  const imageSrc = item.image
    ? (item.image.startsWith('http') ? item.image : '/images/' + item.image)
    : '/images/sem-foto.jpg';
  const formattedPrice = Number(item.price).toFixed(2).replace('.', ',');

  let stockVariant = 'success';
  let stockLabel = `${item.stock} un.`;
  let stockTag = 'normal';
  if (item.stock <= 0) {
    stockVariant = 'danger';
    stockLabel = 'Esgotado';
    stockTag = 'zero';
  } else if (item.stock <= 5) {
    stockVariant = 'warning';
    stockLabel = `${item.stock} un. (baixo)`;
    stockTag = 'low';
  }

  const tr = document.createElement('tr');
  tr.className = 'border-b border-[#f2f2f2] hover:bg-[#fafafa] transition-colors';
  tr.dataset.id = item.id;
  tr.dataset.name = item.name.toLowerCase();
  tr.dataset.category = item.category ? item.category.name : '';
  tr.dataset.price = item.price;
  tr.dataset.stock = item.stock;
  tr.dataset.stockTag = stockTag;

  tr.innerHTML = `
    <td class="px-4 py-3">
      <img src="${imageSrc}" alt="${item.name}" class="w-10 h-14 object-cover rounded border border-[#eee]" />
    </td>
    <td class="px-4 py-3 font-medium text-[#111]">${item.name}</td>
    <td class="px-4 py-3">${Badge({ label: item.category ? item.category.name : '—', variant: 'neutral' })}</td>
    <td class="px-4 py-3 text-[#333]">R$ ${formattedPrice}</td>
    <td class="px-4 py-3">${Badge({ label: stockLabel, variant: stockVariant })}</td>
    <td class="px-4 py-3">
      <div class="flex justify-end gap-2">
        ${Button({ label: 'Editar', href: `/pages/admin/product/edit.html?id=${item.id}`, variant: 'outline', size: 'sm' })}
        ${Button({ label: 'Excluir', variant: 'danger-outline', size: 'sm', extraClass: 'btn-delete', id: `btn-delete-${item.id}` })}
      </div>
    </td>`;

  return tr;
}

function getRows() {
  return Array.from(tableBody.querySelectorAll('tr'));
}

// ---------- Busca, filtro ----------
function applyFilters() {
  const term = searchProduct.value.trim().toLowerCase();
  const category = categoryFilter.value;
  const stock = stockFilter.value;
  let visible = 0;

  getRows().forEach((row) => {
    const nameOk = !term || row.dataset.name.includes(term);
    const categoryOk = !category || row.dataset.category === category;
    const stockOk = !stock || row.dataset.stockTag === stock;
    const show = nameOk && categoryOk && stockOk;
    row.classList.toggle('hidden', !show);
    if (show) visible++;
  });

  resultsCount.textContent = `${visible} produto${visible !== 1 ? 's' : ''}`;
  emptyTableState.classList.toggle('hidden', visible !== 0);
}

searchProduct.addEventListener('input', applyFilters);
categoryFilter.addEventListener('change', applyFilters);
stockFilter.addEventListener('change', applyFilters);

// ---------- Ordenação ----------
let currentSort = { field: null, asc: true };
document.querySelectorAll('th[data-sort]').forEach((th) => {
  th.addEventListener('click', () => {
    const field = th.dataset.sort;
    const asc = currentSort.field === field ? !currentSort.asc : true;
    currentSort = { field, asc };

    document.querySelectorAll('.sort-icon').forEach((el) => (el.textContent = '↕'));
    th.querySelector('.sort-icon').textContent = asc ? '↑' : '↓';

    const rows = getRows();
    const attribute = field; 
    rows.sort((a, b) => {
      const va = attribute === 'name' ? a.dataset[attribute] : parseFloat(a.dataset[attribute]);
      const vb = attribute === 'name' ? b.dataset[attribute] : parseFloat(b.dataset[attribute]);
      if (va < vb) return asc ? -1 : 1;
      if (va > vb) return asc ? 1 : -1;
      return 0;
    });
    rows.forEach((row) => tableBody.appendChild(row));
  });
});

// ---------- Exclusão via modal + fetch DELETE ----------
const deleteModal = document.getElementById('deleteModal');
const deleteProductName = document.getElementById('deleteProductName');
const confirmDeleteBtn = document.getElementById('confirmDelete');
let productToDelete = null;

tableBody.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-delete');
  if (!btn) return;
  const row = btn.closest('tr');
  productToDelete = { id: row.dataset.id, name: row.dataset.name, row };
  deleteProductName.textContent = `"${productToDelete.name}"`;
  deleteModal.classList.remove('hidden');
});

document.getElementById('cancelDelete').addEventListener('click', () => {
  deleteModal.classList.add('hidden');
  productToDelete = null;
});

deleteModal.addEventListener('click', (e) => {
  if (e.target === deleteModal) {
    deleteModal.classList.add('hidden');
    productToDelete = null;
  }
});

confirmDeleteBtn.addEventListener('click', async () => {
  if (!productToDelete) return;
  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.textContent = 'Excluindo...';

  try {
    await api.deleteProduct(productToDelete.id);
    productToDelete.row.remove();
    showToast('Produto excluído com sucesso.');
    updateStatistics();
    applyFilters();
  } catch (error) {
    console.error(error);
    showToast(error.message || 'Erro ao excluir produto.');
  } finally {
    deleteModal.classList.add('hidden');
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = 'Confirmar exclusão';
    productToDelete = null;
  }
});

// ---------- Estatísticas ----------
function updateStatistics() {
  const rows = getRows();
  const total = rows.length;
  let lowStock = 0,
    zeroStock = 0,
    totalValue = 0;

  rows.forEach((row) => {
    const stock = parseFloat(row.dataset.stock);
    const price = parseFloat(row.dataset.price);
    if (stock <= 0) zeroStock++;
    else if (stock <= 5) lowStock++;
    totalValue += stock * price;
  });

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statLow').textContent = lowStock;
  document.getElementById('statZero').textContent = zeroStock;
  document.getElementById('statValue').textContent = 'R$ ' + totalValue.toFixed(2).replace('.', ',');
}

// ---------- Carga inicial (antes era feita no controller/render do EJS) ----------
async function init() {
  showFlash();

  try {
    const [products, categories] = await Promise.all([api.listProducts(), api.listCategories()]);

    categories.forEach((cat) => {
      const option = document.createElement('option');
      option.value = cat.name;
      option.textContent = cat.name;
      categoryFilter.appendChild(option);
    });

    products.forEach((item) => tableBody.appendChild(productRow(item)));

    updateStatistics();
    applyFilters();
  } catch (error) {
    console.error(error);
    const el = document.getElementById('flashError');
    document.getElementById('flashErrorText').textContent = 'Não foi possível carregar os produtos.';
    el.classList.remove('hidden');
    el.classList.add('flex');
  }
}

// ===================== MODAL DE CATEGORIA =====================

const createCategoryModal = document.getElementById('createCategoryModal');
const newCategoryForm = document.getElementById('newCategoryForm');
const categoryNameInput = document.getElementById('categoryName');
const categoryError = document.getElementById('categoryError');
const btnSaveCategory = document.getElementById('btnSaveCategory');
const btnCancelCategory = document.getElementById('btnCancelCategory');
const btnOpenCategoryModal = document.getElementById('btnOpenCategoryModal'); 

// 1. Função para abrir o modal
function openCategoryModal() {
  if (!createCategoryModal) return; 
  newCategoryForm.reset();
  categoryError.classList.add('hidden');
  createCategoryModal.classList.remove('hidden');
  createCategoryModal.classList.add('flex');
  categoryNameInput.focus();
}

// 2. Evento do botão "Nova Categoria" para abrir o modal
if (btnOpenCategoryModal) {
  btnOpenCategoryModal.addEventListener('click', openCategoryModal);
}

// 3. Fechar modal no botão Cancelar
if (btnCancelCategory) {
  btnCancelCategory.addEventListener('click', () => {
    createCategoryModal.classList.add('hidden');
    createCategoryModal.classList.remove('flex');
  });
}

// 4. Fechar modal clicando fora da caixa (no backdrop escuro)
if (createCategoryModal) {
  createCategoryModal.addEventListener('click', (e) => {
    if (e.target === createCategoryModal) {
      btnCancelCategory.click();
    }
  });
}

// 5. Disparo do formulário para a API (Criar Categoria)
if (newCategoryForm) {
  newCategoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Limpa erros anteriores e bloqueia duplo-clique
    categoryError.classList.add('hidden');
    btnSaveCategory.disabled = true;
    btnSaveCategory.textContent = 'Salvando...';

    const name = categoryNameInput.value.trim();

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao criar categoria.');
      }

      // Sucesso! Esconde o modal e mostra notificação
      createCategoryModal.classList.add('hidden');
      createCategoryModal.classList.remove('flex');
      showToast('Categoria cadastrada com sucesso!');
      
      // Atualiza o select de filtros para já mostrar a categoria nova
      const option = document.createElement('option');
      option.value = data.name; 
      option.textContent = data.name;
      categoryFilter.appendChild(option);

    } catch (error) {
      categoryError.textContent = error.message;
      categoryError.classList.remove('hidden');
    } finally {
      // Restaura o botão
      btnSaveCategory.disabled = false;
      btnSaveCategory.textContent = 'Salvar';
    }
  });
}
// ==============================================================

init();