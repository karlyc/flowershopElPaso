// js/views/admin/settings.js — shop info & operational settings
import { api } from '../../api.js';
import { escapeHtml } from '../../format.js';

export async function renderShopSettings(container) {
  const settings = await api.get('/settings');

  container.innerHTML = `
    <div class="page-header"><h2>Shop Info</h2></div>
    <div class="card">
      <div class="grid-2">
        <label>Shop name<input id="s-name" value="${escapeHtml(settings.name || '')}" /></label>
        <label>Website<input id="s-website" value="${escapeHtml(settings.website || '')}" /></label>
        <label>Phone<input id="s-phone" value="${escapeHtml(settings.phone || '')}" /></label>
        <label>Phone 2<input id="s-phone2" value="${escapeHtml(settings.phone2 || '')}" /></label>
        <label>Tax rate (e.g. 1.0825)<input id="s-taxRate" type="number" step="0.0001" value="${settings.taxRate}" /></label>
        <label>Logo<input id="s-logo" type="file" accept="image/*" /></label>
      </div>
      <div style="display:flex; align-items:center; gap:var(--space-4); margin-bottom:var(--space-4);">
        <img id="s-logo-preview" src="${settings.logoUrl && settings.logoUrl.startsWith('data:') ? settings.logoUrl : 'assets/logo-karels.png'}" alt="Current logo" style="width:72px; height:72px; object-fit:contain; border:1px solid var(--stone-300); border-radius:var(--radius-md); background:#fff;" />
        <span style="font-size:13px;">${settings.logoUrl && settings.logoUrl.startsWith('data:') ? 'Uploaded logo — saved and used on receipts.' : 'Default logo in use. Upload one to replace it on receipts.'}</span>
        ${settings.logoUrl && settings.logoUrl.startsWith('data:') ? '<button id="s-logo-remove" type="button" class="btn btn-ghost">Remove</button>' : ''}
      </div>
      <label>Address<input id="s-address" value="${escapeHtml(settings.address || '')}" /></label>
      <label>Hours of operation<textarea id="s-hours" rows="3" placeholder="Mon-Fri 9am-6pm, Sat 9am-4pm">${escapeHtml(typeof settings.hoursOfOperation === 'string' ? settings.hoursOfOperation : JSON.stringify(settings.hoursOfOperation || ''))}</textarea></label>
      <button id="save-btn" class="btn btn-primary">Save</button>
      <p id="s-error" class="error-text" hidden></p>
      <p id="s-success" style="color:var(--success);" hidden>Saved.</p>
    </div>
  `;

  let removeLogo = false;
  const preview = document.getElementById('s-logo-preview');
  document.getElementById('s-logo').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      removeLogo = false;
      preview.src = URL.createObjectURL(file);
    }
  });
  document.getElementById('s-logo-remove')?.addEventListener('click', () => {
    removeLogo = true;
    document.getElementById('s-logo').value = '';
    preview.src = 'assets/logo-karels.png';
  });

  document.getElementById('save-btn').addEventListener('click', async () => {
    const fd = new FormData();
    fd.append('name', document.getElementById('s-name').value);
    fd.append('website', document.getElementById('s-website').value);
    fd.append('phone', document.getElementById('s-phone').value);
    fd.append('phone2', document.getElementById('s-phone2').value);
    fd.append('taxRate', document.getElementById('s-taxRate').value);
    fd.append('address', document.getElementById('s-address').value);
    fd.append('hoursOfOperation', JSON.stringify(document.getElementById('s-hours').value));
    const file = document.getElementById('s-logo').files[0];
    if (file) fd.append('logo', file);
    else if (removeLogo) fd.append('removeLogo', 'true');

    const successEl = document.getElementById('s-success');
    const errorEl = document.getElementById('s-error');
    successEl.hidden = true;
    errorEl.hidden = true;
    try {
      await api.put('/settings', fd);
      successEl.hidden = false;
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    }
  });
}
