// src/frontend/js/components.js
//
// Antes esses eram "partials" do EJS (components/shared/badge, button, input),
// incluídos no servidor com <%- include(...) %>.
// Em HTML puro + Vite não existe include no servidor, então viraram funções JS
// que devolvem uma string HTML. Você monta a página combinando essas strings
// (ex: dentro de um innerHTML ou de um template literal maior).

/**
 * @param {{label: string, variant?: 'neutral'|'success'|'warning'|'danger'|'danger-solid'}} props
 */
export function Badge({ label = '', variant = 'neutral' } = {}) {
  const variantClasses = {
    neutral: 'bg-[#eee] text-[#555]',
    success: 'bg-green-50 text-green-700',
    warning: 'bg-amber-50 text-amber-600',
    danger: 'bg-red-50 text-red-600',
    'danger-solid': 'bg-red-600 text-white',
  }[variant];

  return `<span class="inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${variantClasses}">${label}</span>`;
}

/**
 * @param {{
 * label: string, href?: string|null, type?: 'button'|'submit',
 * variant?: 'primary'|'secondary'|'outline'|'danger'|'danger-outline',
 * size?: 'sm'|'md'|'lg', fullWidth?: boolean, disabled?: boolean,
 * id?: string|null, extraClass?: string, attrs?: string
 * }} props
 * `attrs` substitui o antigo `onclick="..."` do EJS — nada de inline JS,
 * use data-attributes e adicione o listener depois (ver exemplos abaixo).
 */
export function Button({
  label = '',
  href = null,
  type = 'button',
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  id = null,
  extraClass = '',
  attrs = '',
} = {}) {
  const variantClasses = {
    primary: 'bg-brandpink hover:bg-brandpink-hover text-white',
    secondary: 'bg-[#111] hover:bg-black text-white',
    outline: 'border border-[#ddd] text-[#333] hover:bg-[#f5f5f5] bg-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    'danger-outline': 'border border-red-200 text-red-600 hover:bg-red-50 bg-white',
  }[variant];

  const sizeClasses = {
    sm: 'text-xs font-semibold px-3 py-1.5 rounded-lg',
    md: 'text-sm font-semibold px-5 py-2.5 rounded-lg',
    lg: 'text-base font-semibold px-6 py-3 rounded-lg',
  }[size];

  const disabledClasses = disabled ? 'bg-[#ccc] text-white cursor-not-allowed pointer-events-none' : '';

  const classes = [
    'inline-flex items-center justify-center gap-2 transition-colors duration-200',
    sizeClasses,
    disabled ? disabledClasses : variantClasses,
    fullWidth ? 'w-full' : '',
    extraClass,
  ].join(' ');

  const idAttr = id ? `id="${id}"` : '';

  if (href && !disabled) {
    return `<a href="${href}" ${idAttr} class="${classes} no-underline" ${attrs}>${label}</a>`;
  }
  return `<button type="${type}" ${idAttr} ${disabled ? 'disabled' : ''} class="${classes}" ${attrs}>${label}</button>`;
}

/**
 * @param {{
 * name: string, label?: string|null, id?: string, type?: string,
 * value?: string|number, placeholder?: string, required?: boolean, extraClass?: string
 * }} props
 */
export function Input({
  name = '',
  label = null,
  id = null,
  type = 'text',
  value = '',
  placeholder = '',
  required = false,
  extraClass = '',
} = {}) {
  const inputId = id || name;
  const labelHtml = label
    ? `<label for="${inputId}" class="text-xs font-semibold text-[#555]">${label}</label>`
    : '';

  return `
    <div class="flex flex-col gap-1">
      ${labelHtml}
      <input
        type="${type}"
        id="${inputId}"
        name="${name}"
        value="${value ?? ''}"
        placeholder="${placeholder}"
        ${required ? 'required' : ''}
        class="w-full border border-[#dcdcdc] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brandpink focus:ring-2 focus:ring-brandpink/20 ${extraClass}"
      />
    </div>`;
}

/**
 * Converte um produto vindo da API em um card (product-card.ejs).
 * @param {object} item - { id, name, description, price, stock, image, category }
 */
export function ProductCard(item) {
  const isSoldOut = item.stock <= 0;
  const imageSrc = item.image
    ? (item.image.startsWith('http') ? item.image : '/images/' + item.image)
    : '/images/no-photo.jpg';
  const formattedPrice = Number(item.price).toFixed(2).replace('.', ',');

  const soldOutBadge = isSoldOut
    ? `<div class="absolute top-2.5 left-2.5 z-10">${Badge({ label: 'Sold Out', variant: 'danger-solid' })}</div>`
    : '';

  const buttons = isSoldOut
    ? Button({ label: 'Unavailable', variant: 'outline', fullWidth: true, disabled: true })
    : `${Button({ label: 'Buy Now', variant: 'secondary', fullWidth: true, attrs: `data-action="buy" data-id="${item.id}"` })}
       ${Button({ label: 'Add to Cart', variant: 'primary', fullWidth: true, attrs: `data-action="add" data-id="${item.id}"` })}`;

  return `
    <div class="relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 flex flex-col ${isSoldOut ? 'opacity-75' : ''}">
      ${soldOutBadge}
      <div class="relative group">
        <img src="${imageSrc}" alt="${item.name}"
             class="w-full aspect-[2/3] object-contain bg-white p-2 transition-transform duration-300 group-hover:scale-105 ${isSoldOut ? 'grayscale' : ''}" />
        <button type="button" data-quick-view='${encodeURIComponent(JSON.stringify(item))}'
                class="btn-quick-view absolute top-2.5 right-2.5 bg-white/90 hover:bg-white text-[#111] text-xs font-semibold px-3 py-1.5 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          Quick View
        </button>
      </div>
      <div class="p-4 flex flex-col flex-1">
        <a href="/pages/details/details.html?id=${item.id}" class="no-underline text-inherit flex-1">
          <h5 class="font-semibold text-[#111] text-base mb-1 line-clamp-2">${item.name}</h5>
          <p class="text-sm text-[#777] mb-2 line-clamp-2">${item.description ?? ''}</p>
          <div class="mb-2">${Badge({ label: item.category ? item.category.name : '—', variant: 'neutral' })}</div>
          <h4 class="text-brandpink font-bold text-xl mb-3">R$ ${formattedPrice}</h4>
        </a>
        <div class="mt-auto flex flex-col gap-2">
          ${buttons}
        </div>
      </div>
    </div>`;
}