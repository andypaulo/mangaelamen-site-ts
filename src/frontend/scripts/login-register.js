   
   // src/frontend/pages/login/auth.js
//
// Um único arquivo pra login.js + register.js, já que os dois forms vivem
// na mesma página e só um fica visível por vez.

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const linkMostrarRegistro = document.getElementById('linkMostrarRegistro');
const linkMostrarLogin = document.getElementById('linkMostrarLogin');

// ---------- Toggle entre os dois forms ----------
function mostrarRegistro(e) {
  e.preventDefault();
  loginForm.classList.add('hidden');
  registerForm.classList.remove('hidden');
}

function mostrarLogin(e) {
  e?.preventDefault();
  registerForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
}

linkMostrarRegistro.addEventListener('click', mostrarRegistro);
linkMostrarLogin.addEventListener('click', mostrarLogin);

// ---------- Helpers de erro (cada form tem seu próprio <p id="...Erro">) ----------
function mostrarErro(elId, mensagem) {
  const el = document.getElementById(elId);
  el.textContent = mensagem;
  el.classList.remove('hidden');
}

function limparErro(elId) {
  const el = document.getElementById(elId);
  el.classList.add('hidden');
  el.textContent = '';
}

// =====================================================================
// LOGIN
// =====================================================================
const btnLogin = document.getElementById('btnLogin');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  limparErro('loginErro');

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    mostrarErro('loginErro', 'Preencha e-mail e senha.');
    return;
  }

  btnLogin.disabled = true;
  btnLogin.textContent = 'Entrando...';

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      // auth-controller.login manda 401 com { message: 'Invalid email or password' }
      mostrarErro('loginErro', data?.message || 'Não foi possível entrar.');
      return;
    }
   // O login devolve { token, user: { id, name, email, role } }.
    // Guardamos o token pra usar no header "Authorization: Bearer ..." das
    // próximas chamadas (carrinho, checkout, etc).
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    // Admin cai no painel, cliente comum cai na vitrine.
    window.location.href = data.user.role === 'ADMIN'
      ? '/pages/admin/admin.html'
      : '/pages/vitrine/index.html';
  } catch (error) {
    console.error(error);
    mostrarErro('loginErro', 'Erro de conexão com o servidor.');
  } finally {
    btnLogin.disabled = false;
    btnLogin.textContent = 'Fazer login';
  }
});

// =====================================================================
// REGISTRO
// =====================================================================
const btnRegistrar = document.getElementById('btnRegistrar');

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  limparErro('formErro');

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (!name || !email || !password) {
    mostrarErro('formErro', 'Preencha todos os campos.');
    return;
  }

  if (password.length < 6) {
    mostrarErro('formErro', 'A senha precisa ter pelo menos 6 caracteres.');
    return;
  }

  if (password !== confirmPassword) {
    mostrarErro('formErro', 'As senhas não coincidem.');
    return;
  }

  btnRegistrar.disabled = true;
  btnRegistrar.textContent = 'Criando conta...';

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      // 409 -> { message: 'Email already registered' }; 400 -> campo faltando
      mostrarErro('formErro', data?.message || 'Não foi possível criar a conta.');
      return;
    }

    // register não devolve token (só login devolve) — então volta pro form
    // de login já com o e-mail preenchido, em vez de tentar logar sozinho.
    registerForm.reset();
    mostrarLogin();
    document.getElementById('loginEmail').value = email;
    mostrarErro('loginErro', 'Conta criada com sucesso! Faça login para continuar.');
    document.getElementById('loginErro').classList.remove('text-red-600');
    document.getElementById('loginErro').classList.add('text-green-600');
  } catch (error) {
    console.error(error);
    mostrarErro('formErro', 'Erro de conexão com o servidor.');
  } finally {
    btnRegistrar.disabled = false;
    btnRegistrar.textContent = 'Criar conta';
  }
});

// ---------- Se veio de um redirect com ?email=..., pré-preenche o login ----------
const params = new URLSearchParams(window.location.search);
const emailPreenchido = params.get('email');
if (emailPreenchido) {
  document.getElementById('loginEmail').value = emailPreenchido;
}