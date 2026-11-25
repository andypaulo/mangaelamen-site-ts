/**
 * profile-addresses.js
 * Seção E: Meus Endereços (cadastro manual, edição, exclusão e definição de padrão).
 * Sem localStorage/sessionStorage; renderização 100% via DOM/textContent.
 */

const MAX_ADDRESSES = 5;

const FIELD_MAP = {
  label: { inputId: 'addrLabel', errorId: 'errAddrLabel' },
  recipientName: { inputId: 'addrRecipientName', errorId: 'errAddrRecipientName' },
  cep: { inputId: 'addrCep', errorId: 'errAddrCep' },
  street: { inputId: 'addrStreet', errorId: 'errAddrStreet' },
  number: { inputId: 'addrNumber', errorId: 'errAddrNumber' },
  complement: { inputId: 'addrComplement', errorId: 'errAddrComplement' },
  neighborhood: { inputId: 'addrNeighborhood', errorId: 'errAddrNeighborhood' },
  city: { inputId: 'addrCity', errorId: 'errAddrCity' },
  state: { inputId: 'addrState', errorId: 'errAddrState' },
};

const VALID_UFS = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]);

let addressesCache = [];
let editingAddressId = null;
let deletingAddress = null;
let isSubmittingForm = false;
let isDeleting = false;
let isSettingDefaultId = null;
let activeModal = null;
let lastFocusedElement = null;

function formatCep(cep) {
  const digits = String(cep || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length > 5) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return digits;
}

function setFeedback(elementId, message, type = 'error') {
  const el = document.getElementById(elementId);
  if (!el) return;

  if (!message) {
    el.classList.add('hidden');
    el.textContent = '';
    return;
  }

  el.textContent = message;
  el.classList.remove(
    'hidden',
    'text-red-700',
    'bg-red-50',
    'border-red-200',
    'text-emerald-700',
    'bg-emerald-50',
    'border-emerald-200'
  );

  if (type === 'success') {
    el.classList.add('text-emerald-700', 'bg-emerald-50', 'border-emerald-200');
  } else {
    el.classList.add('text-red-700', 'bg-red-50', 'border-red-200');
  }
}

function clearFieldErrors() {
  Object.values(FIELD_MAP).forEach(({ inputId, errorId }) => {
    const errEl = document.getElementById(errorId);
    const inputEl = document.getElementById(inputId);
    if (errEl) {
      errEl.textContent = '';
      errEl.classList.add('hidden');
    }
    if (inputEl) {
      inputEl.removeAttribute('aria-invalid');
    }
  });
}

function setFieldError(field, message) {
  const entry = FIELD_MAP[field];
  if (!entry) return;
  const errEl = document.getElementById(entry.errorId);
  const inputEl = document.getElementById(entry.inputId);
  if (errEl) {
    errEl.textContent = message;
    errEl.classList.remove('hidden');
  }
  if (inputEl) {
    inputEl.setAttribute('aria-invalid', 'true');
  }
}

function getFocusableElements(container) {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => el.offsetParent !== null);
}

function openModal(modalEl, initialFocusEl, triggerEl) {
  if (!modalEl) return;
  lastFocusedElement = triggerEl || document.activeElement;
  activeModal = modalEl;
  modalEl.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  requestAnimationFrame(() => {
    if (initialFocusEl && typeof initialFocusEl.focus === 'function') {
      initialFocusEl.focus();
    } else {
      const focusables = getFocusableElements(modalEl);
      if (focusables[0]) focusables[0].focus();
    }
  });
}

function closeActiveModal() {
  if (!activeModal) return;
  activeModal.classList.add('hidden');
  activeModal = null;
  document.body.style.overflow = '';

  const targetToFocus = lastFocusedElement;
  lastFocusedElement = null;
  if (targetToFocus && typeof targetToFocus.focus === 'function') {
    targetToFocus.focus();
  }
}

function setupModalAccessibility() {
  document.addEventListener('keydown', (e) => {
    if (!activeModal) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      if (activeModal.id === 'addressFormModal' && isSubmittingForm) return;
      if (activeModal.id === 'deleteAddressModal' && isDeleting) return;
      closeActiveModal();
      return;
    }

    if (e.key === 'Tab') {
      const focusables = getFocusableElements(activeModal);
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first || !activeModal.contains(document.activeElement)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last || !activeModal.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  });
}

function updateHeaderLimitState(count) {
  const badge = document.getElementById('addressesCountBadge');
  const addBtn = document.getElementById('btnAddAddress');
  const limitNotice = document.getElementById('addressesLimitNotice');

  if (badge) {
    badge.textContent = `${count}/${MAX_ADDRESSES}`;
  }

  const reachedLimit = count >= MAX_ADDRESSES;
  if (addBtn) {
    addBtn.disabled = reachedLimit;
  }
  if (limitNotice) {
    if (reachedLimit) {
      limitNotice.classList.remove('hidden');
    } else {
      limitNotice.classList.add('hidden');
    }
  }
}

function buildAddressCard(address) {
  const card = document.createElement('article');
  card.className = `rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-all ${
    address.isDefault
      ? 'border-brandpink/50 bg-[#fff9fc]'
      : 'border-[#e8e4de] bg-[#fbf9f5]'
  }`;

  const top = document.createElement('div');
  top.className = 'flex flex-col gap-2';

  // Linha de badges (rótulo + padrão)
  const badgesRow = document.createElement('div');
  badgesRow.className = 'flex flex-wrap items-center gap-2';

  if (address.label) {
    const labelBadge = document.createElement('span');
    labelBadge.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#ece8e1] text-[#111215]';
    labelBadge.textContent = address.label;
    badgesRow.appendChild(labelBadge);
  }

  if (address.isDefault) {
    const defaultBadge = document.createElement('span');
    defaultBadge.className = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brandpink text-white';
    defaultBadge.textContent = 'Padrão';
    badgesRow.appendChild(defaultBadge);
  }

  if (badgesRow.children.length > 0) {
    top.appendChild(badgesRow);
  }

  const recipientEl = document.createElement('h3');
  recipientEl.className = 'font-poppins font-bold text-sm sm:text-base text-[#111215] break-words';
  recipientEl.textContent = address.recipientName;
  top.appendChild(recipientEl);

  const line1 = document.createElement('p');
  line1.className = 'text-xs sm:text-sm text-[#3c3b42] break-words';
  const complementPart = address.complement ? ` — ${address.complement}` : '';
  line1.textContent = `${address.street}, ${address.number}${complementPart}`;
  top.appendChild(line1);

  const line2 = document.createElement('p');
  line2.className = 'text-xs text-[#5c5b64] break-words';
  line2.textContent = `${address.neighborhood} — ${address.city}/${address.state}`;
  top.appendChild(line2);

  const line3 = document.createElement('p');
  line3.className = 'text-xs font-mono text-[#7c7a84]';
  line3.textContent = `CEP ${formatCep(address.cep)}`;
  top.appendChild(line3);

  card.appendChild(top);

  // Ações
  const actions = document.createElement('div');
  actions.className = 'flex flex-wrap items-center gap-2 pt-3 border-t border-[#e8e4de]';

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#d4cfc7] text-[#111215] hover:bg-[#f4f1eb] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brandpink';
  editBtn.textContent = 'Editar';
  editBtn.addEventListener('click', () => openAddressFormModal(address, editBtn));
  actions.appendChild(editBtn);

  if (!address.isDefault) {
    const defaultBtn = document.createElement('button');
    defaultBtn.type = 'button';
    defaultBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-brandpink/40 text-brandpink hover:bg-brandpink hover:text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brandpink';
    defaultBtn.textContent = 'Definir como padrão';
    defaultBtn.addEventListener('click', () => handleSetDefault(address.id, defaultBtn));
    actions.appendChild(defaultBtn);
  }

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors cursor-pointer ml-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600';
  deleteBtn.textContent = 'Excluir';
  deleteBtn.addEventListener('click', () => openDeleteAddressModal(address, deleteBtn));
  actions.appendChild(deleteBtn);

  card.appendChild(actions);
  return card;
}

function renderAddressesList(addresses) {
  const loadingEl = document.getElementById('addressesLoadingState');
  const errorEl = document.getElementById('addressesErrorState');
  const emptyEl = document.getElementById('addressesEmptyState');
  const listEl = document.getElementById('addressesList');

  if (loadingEl) loadingEl.classList.add('hidden');
  if (errorEl) errorEl.classList.add('hidden');

  updateHeaderLimitState(addresses.length);

  if (!listEl || !emptyEl) return;

  listEl.innerHTML = '';

  if (addresses.length === 0) {
    listEl.classList.add('hidden');
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');
  listEl.classList.remove('hidden');

  addresses.forEach((addr) => {
    listEl.appendChild(buildAddressCard(addr));
  });
}

async function loadAddresses() {
  const loadingEl = document.getElementById('addressesLoadingState');
  const errorEl = document.getElementById('addressesErrorState');
  const emptyEl = document.getElementById('addressesEmptyState');
  const listEl = document.getElementById('addressesList');

  if (loadingEl) loadingEl.classList.remove('hidden');
  if (errorEl) errorEl.classList.add('hidden');
  if (emptyEl) emptyEl.classList.add('hidden');
  if (listEl) listEl.classList.add('hidden');

  try {
    // GET sem body -> não envia Content-Type
    const res = await fetch('/api/profile/addresses');

    if (res.status === 401) {
      window.location.href = '/pages/login/login.html';
      return;
    }

    if (!res.ok) {
      throw new Error('Falha ao carregar endereços.');
    }

    const data = await res.json();
    addressesCache = Array.isArray(data) ? data : [];
    renderAddressesList(addressesCache);
  } catch (err) {
    console.error('Erro ao carregar endereços:', err);
    if (loadingEl) loadingEl.classList.add('hidden');
    if (errorEl) errorEl.classList.remove('hidden');
  }
}

function openAddressFormModal(address = null, triggerEl = null) {
  const modal = document.getElementById('addressFormModal');
  const titleEl = document.getElementById('addressModalTitle');
  const form = document.getElementById('addressForm');
  const labelInput = document.getElementById('addrLabel');

  if (!modal || !form) return;

  editingAddressId = address ? address.id : null;
  if (titleEl) {
    titleEl.textContent = address ? 'Editar Endereço' : 'Novo Endereço';
  }

  setFeedback('addressModalFeedback', null);
  clearFieldErrors();

  document.getElementById('addrLabel').value = address?.label || '';
  document.getElementById('addrCep').value = formatCep(address?.cep || '');
  document.getElementById('addrRecipientName').value = address?.recipientName || '';
  document.getElementById('addrStreet').value = address?.street || '';
  document.getElementById('addrNumber').value = address?.number || '';
  document.getElementById('addrComplement').value = address?.complement || '';
  document.getElementById('addrNeighborhood').value = address?.neighborhood || '';
  document.getElementById('addrCity').value = address?.city || '';
  document.getElementById('addrState').value = address?.state || '';

  openModal(modal, labelInput, triggerEl);
}

function openDeleteAddressModal(address, triggerEl = null) {
  const modal = document.getElementById('deleteAddressModal');
  const labelEl = document.getElementById('deleteAddressLabel');
  const cancelBtn = document.getElementById('cancelDeleteAddress');

  if (!modal) return;

  deletingAddress = address;
  if (labelEl) {
    const desc = address.label
      ? `"${address.label}" (${address.street}, ${address.number})`
      : `"${address.street}, ${address.number}"`;
    labelEl.textContent = desc;
  }

  openModal(modal, cancelBtn, triggerEl);
}

function validateClientFields(payload) {
  const errors = {};

  if (payload.label.length > 30) {
    errors.label = 'O rótulo deve ter no máximo 30 caracteres.';
  }
  if (!payload.recipientName) {
    errors.recipientName = 'Informe o nome do destinatário.';
  } else if (payload.recipientName.length > 80) {
    errors.recipientName = 'O nome do destinatário deve ter no máximo 80 caracteres.';
  }

  const cepDigits = payload.cep.replace(/-/g, '');
  if (!payload.cep) {
    errors.cep = 'Informe o CEP.';
  } else if (!/^\d{8}$/.test(cepDigits)) {
    errors.cep = 'CEP inválido. Informe 8 dígitos numéricos (ex.: 01001-000).';
  }

  if (!payload.street) {
    errors.street = 'Informe o logradouro (rua/avenida).';
  } else if (payload.street.length > 120) {
    errors.street = 'O logradouro deve ter no máximo 120 caracteres.';
  }

  if (!payload.number) {
    errors.number = 'Informe o número (ou "S/N").';
  } else if (payload.number.length > 20) {
    errors.number = 'O número deve ter no máximo 20 caracteres.';
  }

  if (payload.complement.length > 60) {
    errors.complement = 'O complemento deve ter no máximo 60 caracteres.';
  }

  if (!payload.neighborhood) {
    errors.neighborhood = 'Informe o bairro.';
  } else if (payload.neighborhood.length > 80) {
    errors.neighborhood = 'O bairro deve ter no máximo 80 caracteres.';
  }

  if (!payload.city) {
    errors.city = 'Informe a cidade.';
  } else if (payload.city.length > 80) {
    errors.city = 'A cidade deve ter no máximo 80 caracteres.';
  }

  if (!payload.state) {
    errors.state = 'Selecione a UF.';
  } else if (!VALID_UFS.has(payload.state)) {
    errors.state = 'UF inválida.';
  }

  return errors;
}

async function handleAddressFormSubmit(e) {
  e.preventDefault();
  if (isSubmittingForm) return;

  setFeedback('addressModalFeedback', null);
  clearFieldErrors();

  const payload = {
    label: document.getElementById('addrLabel').value.trim(),
    cep: document.getElementById('addrCep').value.trim(),
    recipientName: document.getElementById('addrRecipientName').value.trim(),
    street: document.getElementById('addrStreet').value.trim(),
    number: document.getElementById('addrNumber').value.trim(),
    complement: document.getElementById('addrComplement').value.trim(),
    neighborhood: document.getElementById('addrNeighborhood').value.trim(),
    city: document.getElementById('addrCity').value.trim(),
    state: document.getElementById('addrState').value.trim().toUpperCase(),
  };

  const clientErrors = validateClientFields(payload);
  if (Object.keys(clientErrors).length > 0) {
    Object.entries(clientErrors).forEach(([field, msg]) => setFieldError(field, msg));
    setFeedback('addressModalFeedback', Object.values(clientErrors)[0], 'error');
    return;
  }

  const saveBtn = document.getElementById('btnSaveAddress');
  const originalText = saveBtn ? saveBtn.textContent : 'Salvar Endereço';

  isSubmittingForm = true;
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Salvando...';
  }

  try {
    const isEdit = Boolean(editingAddressId);
    const url = isEdit
      ? `/api/profile/addresses/${editingAddressId}`
      : '/api/profile/addresses';
    const method = isEdit ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.status === 401) {
      window.location.href = '/pages/login/login.html';
      return;
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      if (data?.errors && typeof data.errors === 'object') {
        Object.entries(data.errors).forEach(([field, msg]) => setFieldError(field, msg));
      }
      setFeedback('addressModalFeedback', data?.message || 'Erro ao salvar endereço.', 'error');
      return;
    }

    closeActiveModal();
    setFeedback(
      'addressesFeedback',
      isEdit ? 'Endereço atualizado com sucesso!' : 'Endereço cadastrado com sucesso!',
      'success'
    );
    await loadAddresses();
  } catch (err) {
    console.error('Erro ao salvar endereço:', err);
    setFeedback('addressModalFeedback', 'Erro de conexão com o servidor.', 'error');
  } finally {
    isSubmittingForm = false;
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = originalText;
    }
  }
}

async function handleSetDefault(addressId, btnEl) {
  if (isSettingDefaultId) return;
  isSettingDefaultId = addressId;
  setFeedback('addressesFeedback', null);

  if (btnEl) {
    btnEl.disabled = true;
    btnEl.textContent = 'Definindo...';
  }

  try {
    // PATCH sem body -> não envia Content-Type
    const res = await fetch(`/api/profile/addresses/${addressId}/default`, {
      method: 'PATCH',
    });

    if (res.status === 401) {
      window.location.href = '/pages/login/login.html';
      return;
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setFeedback('addressesFeedback', data?.message || 'Não foi possível definir o endereço padrão.', 'error');
      return;
    }

    setFeedback('addressesFeedback', 'Endereço padrão atualizado com sucesso!', 'success');
    await loadAddresses();
  } catch (err) {
    console.error('Erro ao definir padrão:', err);
    setFeedback('addressesFeedback', 'Erro de conexão ao definir endereço padrão.', 'error');
  } finally {
    isSettingDefaultId = null;
  }
}

async function handleConfirmDelete() {
  if (!deletingAddress || isDeleting) return;

  const confirmBtn = document.getElementById('confirmDeleteAddress');
  const originalText = confirmBtn ? confirmBtn.textContent : 'Confirmar exclusão';

  isDeleting = true;
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Excluindo...';
  }

  try {
    // DELETE sem body -> não envia Content-Type
    const res = await fetch(`/api/profile/addresses/${deletingAddress.id}`, {
      method: 'DELETE',
    });

    if (res.status === 401) {
      window.location.href = '/pages/login/login.html';
      return;
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      closeActiveModal();
      setFeedback('addressesFeedback', data?.message || 'Não foi possível excluir o endereço.', 'error');
      return;
    }

    deletingAddress = null;
    closeActiveModal();
    setFeedback('addressesFeedback', 'Endereço excluído com sucesso!', 'success');
    await loadAddresses();
  } catch (err) {
    console.error('Erro ao excluir endereço:', err);
    closeActiveModal();
    setFeedback('addressesFeedback', 'Erro de conexão ao excluir o endereço.', 'error');
  } finally {
    isDeleting = false;
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = originalText;
    }
  }
}

export async function initAddressesSection() {
  setupModalAccessibility();

  const btnAdd = document.getElementById('btnAddAddress');
  const btnAddFirst = document.getElementById('btnAddFirstAddress');
  const btnRetry = document.getElementById('btnRetryAddresses');
  const cepInput = document.getElementById('addrCep');
  const form = document.getElementById('addressForm');

  const formModal = document.getElementById('addressFormModal');
  const btnCloseFormModal = document.getElementById('btnCloseAddressModal');
  const btnCancelFormModal = document.getElementById('btnCancelAddressModal');

  const deleteModal = document.getElementById('deleteAddressModal');
  const btnCancelDelete = document.getElementById('cancelDeleteAddress');
  const btnConfirmDelete = document.getElementById('confirmDeleteAddress');

  if (btnAdd) {
    btnAdd.addEventListener('click', () => openAddressFormModal(null, btnAdd));
  }
  if (btnAddFirst) {
    btnAddFirst.addEventListener('click', () => openAddressFormModal(null, btnAddFirst));
  }
  if (btnRetry) {
    btnRetry.addEventListener('click', loadAddresses);
  }
  if (cepInput) {
    cepInput.addEventListener('input', () => {
      cepInput.value = formatCep(cepInput.value);
    });
  }
  if (form) {
    form.addEventListener('submit', handleAddressFormSubmit);
  }

  if (btnCloseFormModal) {
    btnCloseFormModal.addEventListener('click', () => {
      if (!isSubmittingForm) closeActiveModal();
    });
  }
  if (btnCancelFormModal) {
    btnCancelFormModal.addEventListener('click', () => {
      if (!isSubmittingForm) closeActiveModal();
    });
  }
  if (formModal) {
    formModal.addEventListener('click', (e) => {
      if (e.target === formModal && !isSubmittingForm) {
        closeActiveModal();
      }
    });
  }

  if (btnCancelDelete) {
    btnCancelDelete.addEventListener('click', () => {
      if (!isDeleting) closeActiveModal();
    });
  }
  if (btnConfirmDelete) {
    btnConfirmDelete.addEventListener('click', handleConfirmDelete);
  }
  if (deleteModal) {
    deleteModal.addEventListener('click', (e) => {
      if (e.target === deleteModal && !isDeleting) {
        closeActiveModal();
      }
    });
  }

  await loadAddresses();
}
