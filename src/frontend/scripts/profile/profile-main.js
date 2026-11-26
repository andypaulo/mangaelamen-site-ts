/**
 * profile-main.js
 * Orquestrador central da página de perfil.
 * Gerencia estados de autenticação, carregamento e inicializa os módulos independentes.
 */

import { renderProfileHeader } from './profile-header.js';
import { loadProfileSummary } from './profile-summary.js';
import { initAccountForm } from './profile-account.js';
import { initSecurityForm } from './profile-security.js';
import { initAddressesSection } from './profile-addresses.js';

let isInitialized = false;

async function initProfile() {
  if (isInitialized) return;

  const loadingState = document.getElementById('profileLoadingState');
  const unauthState = document.getElementById('profileUnauthenticatedState');
  const errorState = document.getElementById('profileErrorState');
  const content = document.getElementById('profileContent');

  if (!loadingState || !unauthState || !content) return;

  isInitialized = true;

  loadingState.classList.remove('hidden');
  unauthState.classList.add('hidden');
  if (errorState) errorState.classList.add('hidden');
  content.classList.add('hidden');

  try {
    const res = await fetch('/api/profile');

    if (res.status === 401) {
      loadingState.classList.add('hidden');
      unauthState.classList.remove('hidden');
      return;
    }

    if (!res.ok) {
      throw new Error(`Erro ${res.status} ao carregar dados do perfil`);
    }

    const userData = await res.json();

    // Inicializa seções independentes
    renderProfileHeader(userData);
    initAccountForm(userData);
    initSecurityForm();
    await loadProfileSummary();
    await initAddressesSection();

    loadingState.classList.add('hidden');
    content.classList.remove('hidden');
  } catch (err) {
    console.error('Falha ao inicializar perfil:', err);
    isInitialized = false;
    loadingState.classList.add('hidden');
    if (errorState) {
      errorState.classList.remove('hidden');
    }
  }
}

// Ouve atualizações de dados disparadas pelo form para atualizar o cabeçalho imediatamente
window.addEventListener('userUpdated', (e) => {
  if (e.detail) {
    renderProfileHeader(e.detail);
  }
});

document.addEventListener('DOMContentLoaded', initProfile);
document.addEventListener('layoutReady', initProfile);
