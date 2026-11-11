// scripts/auth.js
// Helpers de autenticação compartilhados entre páginas.
// A autenticação é baseada em cookie httpOnly assinado pelo backend,
// e os dados públicos do perfil do usuário ficam salvos em localStorage.

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
  return Boolean(getStoredUser());
}

// Fetch que aproveita o cookie httpOnly enviado automaticamente pelo navegador.
// Uso: authFetch('/api/products', { method: 'POST', body: ... })
async function authFetch(url, options = {}) {
  return fetch(url, options);
}

// Revalida a sessão contra a API (o cookie pode ter expirado mesmo que o
// localStorage ainda tenha o "user" salvo). Limpa o storage se inválido.
async function fetchCurrentUser() {
  if (!getStoredUser()) return null;

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

// Bloqueia e redireciona imediatamente qualquer acesso não autorizado a páginas de admin no frontend
if (typeof window !== 'undefined' && window.location.pathname.includes('/pages/admin/')) {
  const user = getStoredUser();
  if (!user || user.role !== 'ADMIN') {
    window.location.replace('/pages/login/login.html');
  } else {
    // Revalidação assíncrona contra o servidor para impedir adulteração de localStorage
    fetchCurrentUser().then((freshUser) => {
      if (!freshUser || freshUser.role !== 'ADMIN') {
        clearSession();
        window.location.replace('/pages/login/login.html');
      }
    });
  }
}