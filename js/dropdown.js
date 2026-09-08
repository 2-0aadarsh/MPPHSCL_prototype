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

/** Multi-select custom dropdown (e.g. Registration categories) */
function customMultiSelectHTML(label, id, options, selectedValues = [], required = false, placeholder = 'Select one or more…') {
  const selected = Array.isArray(selectedValues)
    ? selectedValues.filter(v => options.includes(v))
    : [];
  const labelHtml = required
    ? `${label} <span class="req-star" title="Required">*</span>`
    : label;
  const valueHtml = selected.length
    ? selected.map(v => `<span class="multi-chip">${v}</span>`).join('')
    : `<span class="multi-placeholder">${placeholder}</span>`;
  return `<div class="form-group">
    <label>${labelHtml}</label>
    <div class="custom-select custom-select--multi" data-select-id="${id}" data-multi="true" data-placeholder="${placeholder.replace(/"/g, '&quot;')}">
      <button type="button" class="custom-select-trigger" aria-haspopup="listbox" aria-expanded="false" aria-multiselectable="true">
        <span class="custom-select-value custom-select-value--multi">${valueHtml}</span>
        <i class="fa-solid fa-chevron-down custom-select-arrow"></i>
      </button>
      <div class="custom-select-menu" role="listbox" aria-multiselectable="true">
        <div class="custom-select-hint">Select one or more categories</div>
        ${options.map(o => {
          const isSel = selected.includes(o);
          return `<div class="custom-select-option${isSel ? ' selected' : ''}" role="option" aria-selected="${isSel}" data-value="${o}">
            <span class="multi-check" aria-hidden="true"><i class="fa-solid fa-check"></i></span>
            <span>${o}</span>
          </div>`;
        }).join('')}
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

function updateMultiSelectValueDisplay(wrapper) {
  const valueEl = wrapper.querySelector('.custom-select-value');
  if (!valueEl) return;
  const selected = [...wrapper.querySelectorAll('.custom-select-option.selected')]
    .map(o => o.dataset.value)
    .filter(Boolean);
  const placeholder = wrapper.dataset.placeholder || 'Select one or more…';
  if (!selected.length) {
    valueEl.innerHTML = `<span class="multi-placeholder">${placeholder}</span>`;
  } else {
    valueEl.innerHTML = selected.map(v => `<span class="multi-chip">${v}</span>`).join('');
  }
}

function initCustomSelects() {
  document.querySelectorAll('.custom-select').forEach(wrapper => {
    if (wrapper.dataset.bound) return;
    wrapper.dataset.bound = 'true';

    const trigger = wrapper.querySelector('.custom-select-trigger');
    const menu = wrapper.querySelector('.custom-select-menu');
    const valueEl = wrapper.querySelector('.custom-select-value');
    const isMulti = wrapper.dataset.multi === 'true' || wrapper.classList.contains('custom-select--multi');

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
        if (isMulti) {
          opt.classList.toggle('selected');
          opt.setAttribute('aria-selected', opt.classList.contains('selected') ? 'true' : 'false');
          updateMultiSelectValueDisplay(wrapper);
          const values = getCustomMultiSelectValues(wrapper.dataset.selectId);
          wrapper.dispatchEvent(new CustomEvent('change', { detail: { values, value: values.join(', ') } }));
          return;
        }
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
  if (!wrapper) return '';
  if (wrapper.dataset.multi === 'true' || wrapper.classList.contains('custom-select--multi')) {
    return getCustomMultiSelectValues(id).join(', ');
  }
  return wrapper.querySelector('.custom-select-value')?.textContent?.trim() || '';
}

function getCustomMultiSelectValues(id) {
  const wrapper = document.querySelector(`.custom-select[data-select-id="${id}"]`);
  if (!wrapper) return [];
  return [...wrapper.querySelectorAll('.custom-select-option.selected')]
    .map(o => (o.dataset.value || '').trim())
    .filter(Boolean);
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
