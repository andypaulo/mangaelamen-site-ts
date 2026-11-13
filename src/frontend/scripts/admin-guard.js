// scripts/admin-guard.js
// Protege páginas administrativas no frontend.
// 1. Checagem síncrona imediata contra localStorage (evita flash de conteúdo para invasores).
// 2. Revalidação assíncrona contra /api/auth/me (evita invasor manipulando localStorage via DevTools).

(function () {
  function getStoredUser() {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function kickOut() {
    window.location.replace('/pages/login/login.html');
  }

  const cachedUser = getStoredUser();

  // Se não estiver logado ou não for ADMIN, chuta imediatamente antes de renderizar o DOM
  if (!cachedUser || cachedUser.role !== 'ADMIN') {
    kickOut();
    return;
  }

  // Revalida em background com o servidor para confirmar se o cookie httpOnly assinado é válido e ADMIN
  fetch('/api/auth/me')
    .then((res) => {
      if (!res.ok) {
        localStorage.removeItem('user');
        kickOut();
        return;
      }
      return res.json();
    })
    .then((user) => {
      if (user && user.role !== 'ADMIN') {
        localStorage.setItem('user', JSON.stringify(user));
        kickOut();
      }
    })
    .catch(() => {
      // Se a conexão falhar ou houver erro de rede, o usuário já autenticado no storage não é chutado
    });
})();
