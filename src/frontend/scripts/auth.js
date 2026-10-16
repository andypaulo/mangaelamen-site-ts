// scripts/auth.js
// Helpers de autenticação compartilhados entre páginas.
// Alinhado ao contrato do auth-controller: login salva "token" e "user"
// (já serializado) no localStorage, e o backend também seta um cookie
// httpOnly "token" — mas como esse cookie não é legível via JS, aqui
// usamos o token do localStorage pra montar o header Authorization.

function getToken() {
  return localStorage.getItem('token');
}

function getStoredUser() {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error('Erro ao ler usuário salvo:', error);
    return null;
  }
}

function isAuthenticated() {
  return Boolean(getToken());
}

// Fetch já anexando o header Authorization quando há token salvo.
// Uso: authFetch('/api/products', { method: 'POST', body: ... })
async function authFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  return fetch(url, { ...options, headers });
}

// Revalida a sessão contra a API (o token pode ter expirado mesmo que o
// localStorage ainda tenha o "user" salvo). Limpa o storage se inválido.
async function fetchCurrentUser() {
  if (!getToken()) return null;

  try {
    const response = await authFetch('/api/auth/me');
    if (!response.ok) {
      clearSession();
      return null;
    }
    const user = await response.json();
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  } catch (error) {
    console.error('Erro ao validar sessão:', error);
    return null;
  }
}

function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

async function logout() {
  try {
    await authFetch('/api/auth/logout', { method: 'POST' });
  } catch (error) {
    console.error('Erro ao encerrar sessão no servidor:', error);
  } finally {
    clearSession();
    window.location.href = '/pages/vitrine/index.html';
  }
}
