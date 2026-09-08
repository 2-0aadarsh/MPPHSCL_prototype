/* Custom Dropdown Component */

function customSelectHTML(label, id, options, selected, required = false) {
  const sel = selected || options[0];
  const labelHtml = required
    ? `${label} <span class="req-star" title="Required">*</span>`
    : label;
  return `<div class="form-group">
    <label>${labelHtml}</label>
    <div class="custom-select" data-select-id="${id}">
      <button type="button" class="custom-select-trigger" aria-haspopup="listbox" aria-expanded="false">
        <span class="custom-select-value">${sel}</span>
        <i class="fa-solid fa-chevron-down custom-select-arrow"></i>
      </button>
      <div class="custom-select-menu" role="listbox">
        ${options.map(o => `<div class="custom-select-option${o === sel ? ' selected' : ''}" role="option" data-value="${o}">${o}</div>`).join('')}
      </div>
    </div>
  </div>`;
}

/** Compact custom select for analytics toolbar (no form-group wrapper) */
function inlineCustomSelectHTML(id, options, selected) {
  const sel = selected || options[0];
  return `<div class="custom-select custom-select--inline" data-select-id="${id}">
    <button type="button" class="custom-select-trigger" aria-haspopup="listbox" aria-expanded="false">
      <span class="custom-select-value">${sel}</span>
      <i class="fa-solid fa-chevron-down custom-select-arrow"></i>
    </button>
    <div class="custom-select-menu" role="listbox">
      ${options.map(o => `<div class="custom-select-option${o === sel ? ' selected' : ''}" role="option" data-value="${o}">${o}</div>`).join('')}
    </div>
  </div>`;
}

function initCustomSelects() {
  document.querySelectorAll('.custom-select').forEach(wrapper => {
    if (wrapper.dataset.bound) return;
    wrapper.dataset.bound = 'true';

    const trigger = wrapper.querySelector('.custom-select-trigger');
    const menu = wrapper.querySelector('.custom-select-menu');
    const valueEl = wrapper.querySelector('.custom-select-value');

    trigger.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = wrapper.classList.contains('open');
      closeAllSelects();
      if (!isOpen) {
        wrapper.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });

    menu.querySelectorAll('.custom-select-option').forEach(opt => {
      opt.addEventListener('click', e => {
        e.stopPropagation();
        menu.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        valueEl.textContent = opt.dataset.value;
        wrapper.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
        wrapper.dispatchEvent(new CustomEvent('change', { detail: { value: opt.dataset.value } }));
      });
    });
  });
}

function getCustomSelectValue(id) {
  const wrapper = document.querySelector(`.custom-select[data-select-id="${id}"]`);
  return wrapper?.querySelector('.custom-select-value')?.textContent?.trim() || '';
}

function closeAllSelects() {
  document.querySelectorAll('.custom-select.open').forEach(w => {
    w.classList.remove('open');
    w.querySelector('.custom-select-trigger')?.setAttribute('aria-expanded', 'false');
  });
}

document.addEventListener('click', closeAllSelects);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeAllSelects();
});
