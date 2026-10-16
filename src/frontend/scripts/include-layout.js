/**
 * scripts/include-layout.js
 *
 * Substitui qualquer elemento com atributo data-include="/caminho/arquivo.html"
 * pelo conteúdo desse arquivo. Usado pra reaproveitar header/nav/footer sem
 * precisar de um template engine no servidor.
 *
 * Uso no HTML:
 *   <div data-include="/components/layout/header.html"></div>
 *
 * Depois que todos os includes terminam, dispara o evento "layoutReady" no
 * document — scripts de página (ex: header-search.js) devem esperar por ele
 * antes de procurar elementos que vieram de dentro do fragmento incluído.
 */
(async function () {
  const elements = Array.from(document.querySelectorAll('[data-include]'));

  await Promise.all(
    elements.map(async (el) => {
      const path = el.getAttribute('data-include');
      try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`Falha ao carregar ${path}`);
        el.outerHTML = await response.text();
      } catch (error) {
        console.error(error);
        el.outerHTML = `<!-- erro ao incluir ${path} -->`;
      }
    })
  );

  document.dispatchEvent(new Event('layoutReady'));
})();
