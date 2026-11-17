/**
 * profile-account.js
 * Seção c): Formulário de dados da conta (nome e e-mail).
 * Não escreve em localStorage diretamente; dispara evento 'userUpdated'.
 */

let originalUser = null;

function setFeedback(elementId, message, type = 'error') {
  const el = document.getElementById(elementId);
  if (!el) return;

  if (!message) {
    el.classList.add('hidden');
    el.textContent = '';
    return;
  }

  el.textContent = message;
  el.classList.remove('hidden', 'text-red-700', 'bg-red-50', 'border-red-200', 'text-emerald-700', 'bg-emerald-50', 'border-emerald-200');

  if (type === 'success') {
    el.classList.add('text-emerald-700', 'bg-emerald-50', 'border-emerald-200');
  } else {
    el.classList.add('text-red-700', 'bg-red-50', 'border-red-200');
  }
}

export function initAccountForm(userData) {
  originalUser = { ...userData };

  const form = document.getElementById('accountForm');
  const nameInput = document.getElementById('accountName');
  const emailInput = document.getElementById('accountEmail');
  const passwordContainer = document.getElementById('accountPasswordContainer');
  const passwordInput = document.getElementById('accountCurrentPassword');
  const submitBtn = document.getElementById('btnSaveAccount');

  if (!form || !nameInput || !emailInput) return;

  nameInput.value = originalUser.name || '';
  emailInput.value = originalUser.email || '';
  if (passwordInput) passwordInput.value = '';
  if (passwordContainer) passwordContainer.classList.add('hidden');

  // Monitora digitação do e-mail: se for diferente do original, exige e exibe o campo de senha atual
  emailInput.addEventListener('input', () => {
    const isDifferent = emailInput.value.trim() !== originalUser.email;
    if (isDifferent) {
      passwordContainer.classList.remove('hidden');
      passwordInput.required = true;
    } else {
      passwordContainer.classList.add('hidden');
      passwordInput.required = false;
      passwordInput.value = '';
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setFeedback('accountFeedback', null);

    const newName = nameInput.value.trim();
    const newEmail = emailInput.value.trim();
    const currentPassword = passwordInput ? passwordInput.value : '';

    if (!newName || newName.length < 2) {
      setFeedback('accountFeedback', 'O nome deve ter pelo menos 2 caracteres.', 'error');
      return;
    }

    if (!newEmail) {
      setFeedback('accountFeedback', 'Informe um endereço de e-mail válido.', 'error');
      return;
    }

    const payload = {};
    if (newName !== originalUser.name) {
      payload.name = newName;
    }

    const isEmailChanged = newEmail !== originalUser.email;
    if (isEmailChanged) {
      if (!currentPassword) {
        setFeedback('accountFeedback', 'Informe sua senha atual para confirmar a troca de e-mail.', 'error');
        return;
      }
      payload.email = newEmail;
      payload.currentPassword = currentPassword;
    }

    if (Object.keys(payload).length === 0) {
      setFeedback('accountFeedback', 'Nenhuma alteração foi realizada.', 'error');
      return;
    }

    submitBtn.disabled = true;
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = 'Salvando alterações...';

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setFeedback('accountFeedback', data?.message || 'Erro ao atualizar dados.', 'error');
        return;
      }

      // Sucesso: atualiza originalUser e reseta campos
      originalUser = { ...data };
      if (passwordInput) passwordInput.value = '';
      if (passwordContainer) passwordContainer.classList.add('hidden');

      setFeedback('accountFeedback', 'Dados atualizados com sucesso!', 'success');

      // Notifica o ecossistema (nav-auth.js ouvinte) sem mexer no localStorage diretamente
      window.dispatchEvent(new CustomEvent('userUpdated', { detail: data }));
    } catch (err) {
      console.error('Erro na requisição:', err);
      setFeedback('accountFeedback', 'Erro de conexão com o servidor.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  });
}
