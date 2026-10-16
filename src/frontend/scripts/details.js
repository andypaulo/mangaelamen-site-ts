/**
 * scripts/details.js
 * Roda em pages/details.html?id=123
 */
const productId = new URLSearchParams(location.search).get('id');

const productContent = document.getElementById('productContent');
const errorState = document.getElementById('errorState');

function resolveLocalImage(image) {
  if (!image) return '/images/sem-foto.jpg';
  return image.startsWith('http') ? image : '/images/' + image;
}

function formatLocalPrice(value) {
  return Number(value).toFixed(2).replace('.', ',');
}

async function loadProduct() {
  if (!productId) {
    errorState.classList.remove('hidden');
    return;
  }

  try {
    const response = await fetch(`/api/products/${productId}`);
    if (!response.ok) throw new Error('Produto não encontrado');
    
    const data = await response.json();

    // Tratativa de segurança: 
    // Se 'data.product' existir (novo formato), usa ele. 
    // Se não existir, assume que 'data' já é o próprio produto.
    const product = data.product || data;
    const relatedProducts = data.relatedProducts || [];

    // Se mesmo assim não houver nome, é porque os dados vieram incorretos
    if (!product || !product.name) {
      throw new Error('Dados do produto inválidos ou ausentes.');
    }

    document.getElementById('pageTitle').textContent = `${product.name} - Manga&Lamen`;

    const image = resolveLocalImage(product.image);
    document.getElementById('thumbnailImg').src = image;
    document.getElementById('thumbnailImg').alt = product.name;
    document.getElementById('mainImg').src = image;
    document.getElementById('mainImg').alt = product.name;

    document.getElementById('productName').textContent = product.name;
    document.getElementById('productPrice').textContent = `R$ ${formatLocalPrice(product.price)}`;
    document.getElementById('productDescription').textContent = product.description;
    document.getElementById('productFullDescription').textContent = product.description;
    document.getElementById('productStock').innerHTML =
      `<strong class="block text-white mb-1">Estoque disponível</strong>Quantidade: ${product.stock} unidade${product.stock !== 1 ? 's' : ''}`;

    document.getElementById('btnBuyNow').onclick = () => buyNow(product.id);
    document.getElementById('btnAddCart').onclick = () => addToCart(product.id);

    productContent.classList.remove('hidden');

    // Renderiza os relacionados caso existam
    if (relatedProducts.length > 0) {
      renderRelatedProducts(relatedProducts);
    } else if (product.categoryId) {
      // Se a API ainda não devolve os relacionados juntos, podemos chamar uma função fallback ou esconder a seção
      document.getElementById('relatedGrid').innerHTML = '<p class="text-[#aaa]">Nenhum produto relacionado no momento.</p>';
    }

  } catch (error) {
    console.error(error);
    errorState.classList.remove('hidden');
  }
}

function renderRelatedProducts(related) {
  if (!related || related.length === 0) return;

  const grid = document.getElementById('relatedGrid');
  grid.innerHTML = related
    .map(
      (item) => `
        <a href="/pages/details/details.html?id=${item.id}" class="no-underline text-inherit block">
          <div class="bg-[#202020] border border-[#2a2a2a] rounded-lg overflow-hidden text-white max-w-[320px] mx-auto hover:border-accentblue transition-colors">
            <img src="${resolveLocalImage(item.image)}" alt="${item.name}" class="w-full aspect-[2/3] object-cover h-[420px]" />
            <div class="p-2.5">
              <p class="text-[0.78rem] text-[#AAAAAA] mb-1 font-bold">${item.name}</p>
              <p class="text-[0.95rem] font-semibold text-[#28a745] m-0">R$ ${formatLocalPrice(item.price)}</p>
            </div>
          </div>
        </a>
      `
    )
    .join('');
}

async function buyNow(productId) {
  try {
    const response = await fetch('/api/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
    });
    if (response.ok) {
      // Ajuste aqui se a sua página de carrinho for cart.html em vez de carrinho.html
      window.location.href = '/pages/cart/cart.html';
    } else {
      alert('Erro ao iniciar processo de compra do produto.');
    }
  } catch (error) {
    console.error(error);
    alert('Erro de conexão com o servidor.');
  }
}

async function addToCart(productId) {
  try {
    const response = await fetch('/api/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
    });
    if (response.ok) {
      alert('Produto adicionado ao carrinho!');
    } else {
      alert('Erro ao adicionar produto.');
    }
  } catch (error) {
    console.error(error);
    alert('Erro ao conectar com servidor.');
  }
}

loadProduct();