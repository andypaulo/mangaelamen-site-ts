// scripts/nav-auth.js
// Preenche #navAuthArea (dentro do nav incluído via data-include) com o
// botão "Entrar" ou o menu do usuário logado (nome + tipo de conta).
// Depende de scripts/auth.js e do evento "layoutReady".

const ACCOUNT_TYPE_LABELS = {
  CUSTOMER: 'Cliente',
  ADMIN: 'Administrador',
};

function formatAccountType(role) {
  return ACCOUNT_TYPE_LABELS[role] || role || 'Usuário';
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

function renderLoginButton(container) {
  container.innerHTML = `
    <a href="/pages/login/login.html" data-page="login"
       class="nav-link flex items-center gap-1.5 text-white text-base no-underline transition-colors duration-200 hover:text-brandyellow">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="w-4 h-4 nav-icon [filter:brightness(0)_invert(1)]">
        <path d="M6 3.5a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-2a.5.5 0 0 0-1 0v2A1.5 1.5 0 0 0 6.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-8A1.5 1.5 0 0 0 5 3.5v2a.5.5 0 0 0 1 0z"/>
        <path d="M11.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H1.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708z"/>
      </svg>
      Entrar
    </a>
  `;
}

function renderUserMenu(container, user) {
  container.innerHTML = `
    <button type="button" id="userMenuButton"
            class="flex items-center gap-2 text-white text-sm bg-transparent border-none cursor-pointer hover:text-brandyellow transition-colors duration-200">
      <span class="w-7 h-7 rounded-full bg-brandpink text-white text-xs font-bold flex items-center justify-center shrink-0">
        ${getInitials(user.name)}
      </span>
      <span class="flex flex-col items-start leading-tight">
        <span class="font-semibold">${user.name}</span>
        <span class="text-[11px] text-[#bbb]">${formatAccountType(user.role)}</span>
      </span>
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 16 16" class="ml-0.5">
        <path d="M1.5 5.5 8 12l6.5-6.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <div id="userMenuDropdown"
         class="hidden absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lg overflow-hidden z-[1000] text-left">
      <a href="/pages/profile/profile.html" class="block px-4 py-3 text-sm text-[#333] hover:bg-[#f5f5f5] no-underline">Meu perfil</a>
      <a href="/pages/orders/orders.html" class="block px-4 py-3 text-sm text-[#333] hover:bg-[#f5f5f5] no-underline">Minhas compras</a>
      <button type="button" id="logoutButton" class="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 border-none bg-transparent cursor-pointer">Sair</button>
    </div>
  `;

  const menuButton = document.getElementById('userMenuButton');
  const dropdown = document.getElementById('userMenuDropdown');

  menuButton.addEventListener('click', (event) => {
    event.stopPropagation();
    dropdown.classList.toggle('hidden');
  });

  document.addEventListener('click', (event) => {
    if (!dropdown.contains(event.target) && !menuButton.contains(event.target)) {
      dropdown.classList.add('hidden');
    }
  });

  document.getElementById('logoutButton').addEventListener('click', logout);
}

document.addEventListener('layoutReady', async () => {
  const container = document.getElementById('navAuthArea');
  if (!container) return;

  if (!isAuthenticated()) {
    renderLoginButton(container);
    return;
  }

  // Renderiza otimisticamente com o que já está em cache (sem flash de loading),
  // depois revalida contra a API em background.
  const cachedUser = getStoredUser();
  if (cachedUser) renderUserMenu(container, cachedUser);
  else renderLoginButton(container);

  const freshUser = await fetchCurrentUser();
  if (freshUser) {
    renderUserMenu(container, freshUser);
  } else if (!cachedUser) {
    renderLoginButton(container);
  }
  // Se a revalidação falhar mas havia cachedUser, mantemos o que já está
  // na tela — fetchCurrentUser já limpou a sessão internamente se o token
  // era realmente inválido; nesse caso, na próxima navegação o botão de
  // login volta a aparecer.
});
