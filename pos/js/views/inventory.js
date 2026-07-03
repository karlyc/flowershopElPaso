// js/views/inventory.js
import { api } from '../api.js';
import { money, titleCase, escapeHtml } from '../format.js';
import { hasRole } from '../state.js';

const CATEGORIES = ['BASES', 'FLOWERS', 'RIBBONS', 'OTHERS'];
const UNITS = ['PIECE', 'ROLL', 'BOX', 'BUNCH', 'BAG'];

export async function renderInventory(container) {
  const isAdmin = hasRole('ADMIN');
  container.innerHTML = `
    <div class="page-header">
      <h2>Inventory</h2>
      <div class="toolbar">
        <input id="search" placeholder="Search code or name…" />
        <select id="category-filter"><option value="">All categories</option>${CATEGORIES.map((c) => `<option value="${c}">${titleCase(c)}</option>`).join('')}</select>
        ${isAdmin ? '<button id="add-btn" class="btn btn-primary">+ Add inventory</button>' : ''}
      </div>
    </div>
    <div id="inventory-list"></div>
    <div id="inventory-modal-wrap"></div>
  `;

  async function load() {
    const q = document.getElementById('search').value;
    const category = document.getElementById('category-filter').value;
    const params = new URLSearchParams();
    if (q) params.set('search', q);
    if (category) params.set('category', category);
    const items = await api.get(`/inventory?${params}`);
    const wrap = document.getElementById('inventory-list');
    if (!items.length) {
      wrap.innerHTML = '<p class="empty-state">No inventory items found.</p>';
      return;
    }
    wrap.innerHTML = `<div class="table-wrap"><table><thead><tr>
      <th>Code</th><th>Name</th><th>Category</th><th>Unit</th><th>Qty</th>${isAdmin ? '<th></th>' : ''}
    </tr></thead><tbody>
      ${items
        .map(
          (i) => `<tr>
        <td>${escapeHtml(i.code || '—')}</td>
        <td>${escapeHtml(i.name)}</td>
        <td>${titleCase(i.category)}</td>
        <td>${titleCase(i.unit)}</td>
        <td><input type="number" step="0.01" value="${i.quantity}" data-qty="${i.id}" style="width:90px;" /></td>
        ${isAdmin ? `<td><button class="btn btn-sm" data-edit="${i.id}">Edit</button> <button class="btn btn-sm btn-danger" data-delete="${i.id}">Delete</button></td>` : ''}
      </tr>`
        )
        .join('')}
    </tbody></table></div>`;

    wrap.querySelectorAll('[data-qty]').forEach((input) =>
      input.addEventListener('change', async () => {
        await api.patch(`/inventory/${input.dataset.qty}/quantity`, { quantity: Number(input.value) });
      })
    );
    wrap.querySelectorAll('[data-edit]').forEach((btn) =>
      btn.addEventListener('click', () => openModal(items.find((i) => i.id === btn.dataset.edit), load))
    );
    wrap.querySelectorAll('[data-delete]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this inventory item?')) return;
        await api.del(`/inventory/${btn.dataset.delete}`);
        load();
      })
    );
  }

  document.getElementById('search').addEventListener('input', debounce(load, 300));
  document.getElementById('category-filter').addEventListener('change', load);
  document.getElementById('add-btn')?.addEventListener('click', () => openModal(null, load));
  load();
}

function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

function openModal(item, onSaved) {
  const wrap = document.getElementById('inventory-modal-wrap');
  wrap.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal">
        <h3>${item ? 'Edit' : 'Add'} inventory item</h3>
        <div class="grid-2">
          <label>Code<input id="i-code" value="${escapeHtml(item?.code || '')}" /></label>
          <label>Name *<input id="i-name" value="${escapeHtml(item?.name || '')}" required /></label>
          <label>Category
            <select id="i-category">${CATEGORIES.map((c) => `<option value="${c}" ${item?.category === c ? 'selected' : ''}>${titleCase(c)}</option>`).join('')}</select>
          </label>
          <label>Unit
            <select id="i-unit">${UNITS.map((u) => `<option value="${u}" ${item?.unit === u ? 'selected' : ''}>${titleCase(u)}</option>`).join('')}</select>
          </label>
          <label>Width (in)<input id="i-widthIn" type="number" step="0.1" value="${item?.widthIn || ''}" /></label>
          <label>Height (in)<input id="i-heightIn" type="number" step="0.1" value="${item?.heightIn || ''}" /></label>
          <label>Units per purchase<input id="i-unitsPerPurchase" type="number" step="0.01" value="${item?.unitsPerPurchase || 1}" /></label>
          <label>Price (per purchase) *<input id="i-price" type="number" step="0.01" value="${item?.price || ''}" required /></label>
          <label>Quantity in stock<input id="i-quantity" type="number" step="0.01" value="${item?.quantity || 0}" /></label>
          <label>Provider<input id="i-provider" value="${escapeHtml(item?.provider || '')}" /></label>
        </div>
        <label>Notes<textarea id="i-notes" rows="2">${escapeHtml(item?.notes || '')}</textarea></label>
        <label>Photo<input id="i-photo" type="file" accept="image/*" /></label>
        <div class="modal-actions">
          <button class="btn" id="i-cancel">Cancel</button>
          <button class="btn btn-primary" id="i-save">Save</button>
        </div>
        <p id="i-error" class="error-text" hidden></p>
      </div>
    </div>
  `;
  document.getElementById('i-cancel').addEventListener('click', () => (wrap.innerHTML = ''));
  document.getElementById('i-save').addEventListener('click', async () => {
    const name = document.getElementById('i-name').value;
    const price = document.getElementById('i-price').value;
    if (!name || !price) return;

    const fd = new FormData();
    fd.append('code', document.getElementById('i-code').value);
    fd.append('name', name);
    fd.append('category', document.getElementById('i-category').value);
    fd.append('unit', document.getElementById('i-unit').value);
    fd.append('widthIn', document.getElementById('i-widthIn').value);
    fd.append('heightIn', document.getElementById('i-heightIn').value);
    fd.append('unitsPerPurchase', document.getElementById('i-unitsPerPurchase').value);
    fd.append('price', price);
    fd.append('quantity', document.getElementById('i-quantity').value);
    fd.append('provider', document.getElementById('i-provider').value);
    fd.append('notes', document.getElementById('i-notes').value);
    const file = document.getElementById('i-photo').files[0];
    if (file) fd.append('photo', file);

    try {
      if (item) await api.put(`/inventory/${item.id}`, fd);
      else await api.post('/inventory', fd);
      wrap.innerHTML = '';
      onSaved();
    } catch (err) {
      const e = document.getElementById('i-error');
      e.textContent = err.message;
      e.hidden = false;
    }
  });
}
