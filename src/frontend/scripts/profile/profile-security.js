/**
 * profile-security.js
 * Seção d): Formulário de segurança e troca de senha.
 * Validações client-side (6 a 72 chars, confirmação, diferente da atual) e toggle de visibilidade.
 */

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

export function initSecurityForm() {
  const form = document.getElementById('securityForm');
  const currentPasswordInput = document.getElementById('secCurrentPassword');
  const newPasswordInput = document.getElementById('secNewPassword');
  const confirmPasswordInput = document.getElementById('secConfirmPassword');
  const submitBtn = document.getElementById('btnSavePassword');

  if (!form || !currentPasswordInput || !newPasswordInput || !confirmPasswordInput) return;

  // Toggle de visualização de senhas
  const toggleButtons = document.querySelectorAll('[data-toggle-password]');
  toggleButtons.forEach((btn) => {
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', 'Mostrar senha');

    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-toggle-password');
      const input = document.getElementById(targetId);
      if (!input) return;

      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.textContent = isPassword ? 'Ocultar' : 'Mostrar';
      btn.setAttribute('aria-pressed', isPassword ? 'true' : 'false');
      btn.setAttribute('aria-label', isPassword ? 'Ocultar senha' : 'Mostrar senha');
      input.focus();
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setFeedback('securityFeedback', null);

    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setFeedback('securityFeedback', 'Preencha todos os campos de senha.', 'error');
      return;
    }

    if (newPassword.length < 6 || newPassword.length > 72) {
      setFeedback('securityFeedback', 'A nova senha deve ter entre 6 e 72 caracteres.', 'error');
      return;
    }

    if (newPassword === currentPassword) {
      setFeedback('securityFeedback', 'A nova senha deve ser diferente da senha atual.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedback('securityFeedback', 'A confirmação de senha não confere.', 'error');
      return;
    }

    submitBtn.disabled = true;
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = 'Atualizando senha...';

    try {
      const res = await fetch('/api/profile/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setFeedback('securityFeedback', data?.message || 'Erro ao alterar senha.', 'error');
        return;
      }

      setFeedback('securityFeedback', 'Senha alterada com sucesso! Redirecionando para login...', 'success');
      form.reset();

      // Opção 1: O cookie já foi limpo pelo servidor. Redireciona para login
      setTimeout(() => {
        window.location.href = '/pages/login/login.html';
      }, 1200);
    } catch (err) {
      console.error('Erro na requisição:', err);
      setFeedback('securityFeedback', 'Erro de conexão com o servidor.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  });
}
