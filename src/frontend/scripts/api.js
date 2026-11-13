// src/frontend/js/api.js
//
// Antes os controllers do Fastify faziam reply.view('pagina', { produtos, categorias })
// e o EJS recebia os dados já prontos no servidor.
// Agora a página HTML é estática (servida pelo Vite/estático) e busca os
// dados via fetch numa API JSON exposta pelo Fastify. Ajuste API_BASE
// conforme seu ambiente (em dev, o Vite pode fazer proxy de /api -> Fastify).

const API_BASE = '/api';

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Error ${res.status} when calling ${path}`);
  }

  const type = res.headers.get('content-type') || '';
  return type.includes('application/json') ? res.json() : null;
}

export const api = {
  listProducts: () => request('/products'),
  getProduct: (id) => request(`/products/${id}`),
  createProduct: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  listCategories: () => request('/categories'),
};