// js/views/addOns.js — catalog admin for Banner / Balloons / Teddy Bears / Chocolates
import { api } from '../api.js';
import { money, escapeHtml, titleCase } from '../format.js';

const KIND_OPTIONS = [
  ['BANNER', 'Banner'],
  ['BALLOONS', 'Balloons'],
  ['TEDDY_BEAR', 'Teddy Bear'],
  ['CHOCOLATES', 'Chocolates'],
];

export async function renderAddOns(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>Add Ons</h2>
      <button id="add-btn" class="btn btn-primary">+ Add add-on</button>
    </div>
    <div id="addon-list"></div>
    <div id="addon-modal-wrap"></div>
  `;

  async function load() {
    const addOns = await api.get('/add-ons');
    const wrap = document.getElementById('addon-list');
    if (!addOns.length) {
      wrap.innerHTML = '<p class="empty-state">No add-ons yet.</p>';
      return;
    }
    wrap.innerHTML = `<div class="table-wrap"><table><thead><tr>
      <th>Kind</th><th>Name</th><th>Size</th><th>Price</th><th>Visible</th><th></th>
    </tr></thead><tbody>
      ${addOns
        .map(
          (a) => `<tr>
        <td>${titleCase(a.kind)}</td>
        <td>${escapeHtml(a.name)}</td>
        <td>${escapeHtml(a.size || '—')}</td>
        <td>${money(a.price)}</td>
        <td>${a.visible ? '<span class="badge badge-green">Yes</span>' : '<span class="badge badge-gray">No</span>'}</td>
        <td><button class="btn btn-sm" data-edit="${a.id}">Edit</button> <button class="btn btn-sm btn-danger" data-delete="${a.id}">Delete</button></td>
      </tr>`
        )
        .join('')}
    </tbody></table></div>`;

    wrap.querySelectorAll('[data-edit]').forEach((btn) =>
      btn.addEventListener('click', () => openModal(addOns.find((a) => a.id === btn.dataset.edit), load))
    );
    wrap.querySelectorAll('[data-delete]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this add-on?')) return;
        await api.del(`/add-ons/${btn.dataset.delete}`);
        load();
      })
    );
  }

  document.getElementById('add-btn').addEventListener('click', () => openModal(null, load));
  load();
}

function openModal(addOn, onSaved) {
  const wrap = document.getElementById('addon-modal-wrap');
  wrap.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal">
        <h3>${addOn ? 'Edit' : 'Add'} add-on</h3>
        <label>Kind *
          <select id="a-kind">${KIND_OPTIONS.map(([v, l]) => `<option value="${v}" ${addOn?.kind === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        </label>
        <label>Name *<input id="a-name" value="${escapeHtml(addOn?.name || '')}" required /></label>
        <label>Size<input id="a-size" value="${escapeHtml(addOn?.size || '')}" placeholder="e.g. Small, Large" /></label>
        <label>Price *<input id="a-price" type="number" step="0.01" value="${addOn?.price || ''}" required /></label>
        <label class="checkbox-line"><input type="checkbox" id="a-visible" ${addOn?.visible !== false ? 'checked' : ''} /> Visible</label>
        <div class="modal-actions">
          <button class="btn" id="a-cancel">Cancel</button>
          <button class="btn btn-primary" id="a-save">Save</button>
        </div>
        <p id="a-error" class="error-text" hidden></p>
      </div>
    </div>
  `;
  document.getElementById('a-cancel').addEventListener('click', () => (wrap.innerHTML = ''));
  document.getElementById('a-save').addEventListener('click', async () => {
    const kind = document.getElementById('a-kind').value;
    const name = document.getElementById('a-name').value;
    const price = document.getElementById('a-price').value;
    if (!kind || !name || !price) return;

    const body = {
      kind,
      name,
      size: document.getElementById('a-size').value,
      price: Number(price),
      visible: document.getElementById('a-visible').checked,
    };
    try {
      if (addOn) await api.put(`/add-ons/${addOn.id}`, body);
      else await api.post('/add-ons', body);
      wrap.innerHTML = '';
      onSaved();
    } catch (err) {
      const e = document.getElementById('a-error');
      e.textContent = err.message;
      e.hidden = false;
    }
  });
}
