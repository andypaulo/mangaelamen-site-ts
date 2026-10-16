/**
 * scripts/components/ui.js
 * Pequeno "design system" em JS puro: funções que retornam strings HTML,
 * usadas por qualquer script de página que precise montar cards, tabelas, etc.
 * Substitui os antigos componentes EJS (components/shared/button.ejs e badge.ejs).
 */

/**
 * @param {Object} opts
 * @param {string} opts.label
 * @param {string} [opts.href]        - se definido, renderiza <a>; senão <button>
 * @param {string} [opts.type='button']
 * @param {'primary'|'secondary'|'outline'|'danger'|'danger-outline'} [opts.variant='primary']
 * @param {'sm'|'md'|'lg'} [opts.size='md']
 * @param {boolean} [opts.fullWidth=false]
 * @param {boolean} [opts.disabled=false]
 * @param {string} [opts.onclick]     - nome da função global + argumentos, ex: "comprarAgora(3)"
 * @param {string} [opts.id]
 * @param {string} [opts.extraClass]
 */
function renderButton(opts) {
  const {
    label,
    href = null,
    type = 'button',
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    disabled = false,
    onclick = null,
    id = null,
    extraClass = '',
  } = opts;

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

  const classes = [
    'inline-flex items-center justify-center gap-2 transition-colors duration-200',
    sizeClasses,
    disabled ? 'bg-[#ccc] text-white cursor-not-allowed pointer-events-none' : variantClasses,
    fullWidth ? 'w-full' : '',
    extraClass,
  ].join(' ');

  const idAttr = id ? `id="${id}"` : '';

  if (href && !disabled) {
    return `<a href="${href}" ${idAttr} class="${classes} no-underline">${label}</a>`;
  }

  const onclickAttr = onclick ? `onclick="${onclick}"` : '';
  const disabledAttr = disabled ? 'disabled' : '';
  return `<button type="${type}" ${idAttr} ${onclickAttr} ${disabledAttr} class="${classes}">${label}</button>`;
}

/**
 * @param {Object} opts
 * @param {string} opts.label
 * @param {'neutral'|'success'|'warning'|'danger'|'danger-solid'} [opts.variant='neutral']
 */
function renderBadge(opts) {
  const { label, variant = 'neutral' } = opts;

  const variantClasses = {
    neutral: 'bg-[#eee] text-[#555]',
    success: 'bg-green-50 text-green-700',
    warning: 'bg-amber-50 text-amber-600',
    danger: 'bg-red-50 text-red-600',
    'danger-solid': 'bg-red-600 text-white',
  }[variant];

  return `<span class="inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${variantClasses}">${label}</span>`;
}

/** Helper de formatação usado em várias páginas */
function formatarPreco(valor) {
  return Number(valor).toFixed(2).replace('.', ',');
}

function resolverImagem(imagem) {
  if (!imagem) return '/images/sem-foto.jpg';
  return imagem.startsWith('http') ? imagem : '/images/' + imagem;
}
