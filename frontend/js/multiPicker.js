// Reusable "pick from presets, or add your own" multi-value widget.
// Shared across signup (Logins) and both dashboards' profile-edit forms —
// used for Languages Spoken and Goals, both of which need a preset list
// plus free-text additions the user can remove individually.
//
// Usage:
//   initMultiPicker('mpGoals', ['Improve grades', ...], ['Improve grades'])
//   ... later, on submit ...
//   const values = getMultiPickerValues('mpGoals');
//   ... if presets change (e.g. role toggle) ...
//   setMultiPickerPresets('mpGoals', newPresetList);

function initMultiPicker(containerId, presets, initialValues) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el._mpPresets = presets || [];
  el._mpSelected = new Set(initialValues || []);
  _renderMultiPicker(containerId);
}

function setMultiPickerPresets(containerId, presets) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el._mpPresets = presets || [];
  _renderMultiPicker(containerId);
}

function getMultiPickerValues(containerId) {
  const el = document.getElementById(containerId);
  return el && el._mpSelected ? Array.from(el._mpSelected) : [];
}

function toggleMultiPickerValue(containerId, value, checked) {
  const el = document.getElementById(containerId);
  if (!el || !el._mpSelected) return;
  if (checked) el._mpSelected.add(value); else el._mpSelected.delete(value);
  _renderMultiPicker(containerId);
}

function addMultiPickerCustom(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const input = el.querySelector('.mp-add-input');
  const val = (input?.value || '').trim();
  if (!val) return;
  el._mpSelected.add(val);
  _renderMultiPicker(containerId);
  el.querySelector('.mp-add-input')?.focus();
}

function removeMultiPickerValue(containerId, value) {
  const el = document.getElementById(containerId);
  if (!el || !el._mpSelected) return;
  el._mpSelected.delete(value);
  _renderMultiPicker(containerId);
}

function _mpEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function _renderMultiPicker(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const presets = el._mpPresets || [];
  const selected = el._mpSelected || new Set();

  el.innerHTML = `
    <div class="mp-checks">
      ${presets.map(p => `
        <label class="mp-check">
          <input type="checkbox" ${selected.has(p) ? 'checked' : ''}
                 onchange="toggleMultiPickerValue('${containerId}','${_mpEsc(p)}',this.checked)">
          <span>${_mpEsc(p)}</span>
        </label>`).join('')}
    </div>
    <div class="mp-add-row">
      <input type="text" class="mp-add-input" placeholder="Add your own…"
             onkeydown="if(event.key==='Enter'){event.preventDefault();addMultiPickerCustom('${containerId}')}">
      <button type="button" class="mp-add-btn" onclick="addMultiPickerCustom('${containerId}')">Add</button>
    </div>
    ${selected.size ? `<div class="mp-chips">
      ${Array.from(selected).map(v => `
        <span class="mp-chip">${_mpEsc(v)}<button type="button" onclick="removeMultiPickerValue('${containerId}','${_mpEsc(v)}')">&times;</button></span>`).join('')}
    </div>` : ''}
  `;
}
