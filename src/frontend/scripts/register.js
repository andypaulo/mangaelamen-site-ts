const form = document.getElementById('registerForm');
const erroEl = document.getElementById('formErro');
const btn = document.getElementById('btnRegistrar');

function mostrarErro(mensagem) {
  erroEl.textContent = mensagem;
  erroEl.classList.remove('hidden');
}

function limparErro() {
  erroEl.classList.add('hidden');
  erroEl.textContent = '';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  limparErro();

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  // Validação client-side. O schema exige name/email/passwordHash preenchidos
  // e email @unique — a validação de "email já existe" só o backend sabe
  // responder (409), aqui só barramos o óbvio antes de gastar uma requisição.
  if (!name || !email || !password) {
    mostrarErro('Preencha todos os campos.');
    return;
  }

  if (password.length < 6) {
    mostrarErro('A senha precisa ter pelo menos 6 caracteres.');
    return;
  }

  if (password !== confirmPassword) {
    mostrarErro('As senhas não coincidem.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Criando conta...';

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      // O auth-controller manda 409 com { message: 'Email already registered' }
      // e 400 com { message: 'Missing required fields' }.
      mostrarErro(data?.message || 'Não foi possível criar a conta.');
      return;
    }

    // Conta criada com sucesso. O register não devolve token (só o login
    // devolve), então mandamos o usuário pra tela de login já com o e-mail
    // preenchido, em vez de tentar logar automaticamente aqui.
    sessionStorage.setItem('flashSucesso', 'Conta criada com sucesso! Faça login para continuar.');
    window.location.href = `/pages/login/login.html?email=${encodeURIComponent(email)}`;
  } catch (error) {
    console.error(error);
    mostrarErro('Erro de conexão com o servidor.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Criar conta';
  }
});
