// js/views/products.js
import { api, API_BASE } from '../api.js';
import { money, escapeHtml } from '../format.js';

const UPLOADS_ORIGIN = API_BASE.replace(/\/api\/?$/, '');
let recipeRows = [];

export async function renderProducts(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>Products</h2>
      <div class="toolbar">
        <input id="search" placeholder="Search code, name, flower…" />
        <button id="add-btn" class="btn btn-primary">+ Add product</button>
      </div>
    </div>
    <div id="products-grid"></div>
    <div id="product-modal-wrap"></div>
  `;

  const categories = await api.get('/categories');

  async function load() {
    const q = document.getElementById('search').value;
    const products = await api.get(`/products${q ? `?search=${encodeURIComponent(q)}` : ''}`);
    const wrap = document.getElementById('products-grid');
    if (!products.length) {
      wrap.innerHTML = '<p class="empty-state">No products found.</p>';
      return;
    }
    wrap.innerHTML = `<div class="table-wrap"><table><thead><tr>
      <th></th><th>Code</th><th>Name</th><th>Category</th><th>Price</th><th>Visible</th><th></th>
    </tr></thead><tbody>
      ${products
        .map(
          (p) => `<tr>
        <td>${p.photo1Url ? `<img src="${UPLOADS_ORIGIN}${p.photo1Url}" style="width:36px;height:36px;object-fit:cover;border-radius:4px;" />` : ''}</td>
        <td>${escapeHtml(p.code)}</td>
        <td>${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.category?.name || '—')}</td>
        <td>${money(p.price)}</td>
        <td>${p.visible ? '<span class="badge badge-green">Yes</span>' : '<span class="badge badge-gray">No</span>'}</td>
        <td><button class="btn btn-sm" data-edit="${p.id}">Edit</button> <button class="btn btn-sm btn-danger" data-delete="${p.id}">Delete</button></td>
      </tr>`
        )
        .join('')}
    </tbody></table></div>`;

    wrap.querySelectorAll('[data-edit]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        const product = await api.get(`/products/${btn.dataset.edit}`);
        openModal(product, categories, load);
      })
    );
    wrap.querySelectorAll('[data-delete]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this product?')) return;
        await api.del(`/products/${btn.dataset.delete}`);
        load();
      })
    );
  }

  document.getElementById('search').addEventListener('input', debounce(load, 300));
  document.getElementById('add-btn').addEventListener('click', () => openModal(null, categories, load));
  load();
}

function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

async function openModal(product, categories, onSaved) {
  const inventoryItems = await api.get('/inventory');
  recipeRows = product?.recipe?.map((r) => ({ inventoryItemId: r.inventoryItemId, name: r.inventoryItem.name, quantity: Number(r.quantity), notes: r.notes || '' })) || [];

  const wrap = document.getElementById('product-modal-wrap');
  wrap.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal" style="max-width:640px;">
        <h3>${product ? 'Edit' : 'Add'} product</h3>
        <div class="grid-2">
          <label>Code *<input id="p-code" value="${escapeHtml(product?.code || '')}" required /></label>
          <label>Name *<input id="p-name" value="${escapeHtml(product?.name || '')}" required /></label>
          <label>Price *<input id="p-price" type="number" step="0.01" value="${product?.price || ''}" required /></label>
          <label>Category
            <select id="p-categoryId"><option value="">—</option>${categories.map((c) => `<option value="${c.id}" ${product?.categoryId === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}</select>
          </label>
          <label>Width (in)<input id="p-widthIn" type="number" step="0.1" value="${product?.widthIn || ''}" /></label>
          <label>Height (in)<input id="p-heightIn" type="number" step="0.1" value="${product?.heightIn || ''}" /></label>
          <label class="checkbox-line" style="margin-top:1.6rem;"><input type="checkbox" id="p-visible" ${product?.visible !== false ? 'checked' : ''} /> Visible on site</label>
        </div>
        <label>Description<textarea id="p-description" rows="2">${escapeHtml(product?.description || '')}</textarea></label>
        <div class="grid-3">
          <label>Photo 1<input id="p-photo1" type="file" accept="image/*" /></label>
          <label>Photo 2<input id="p-photo2" type="file" accept="image/*" /></label>
          <label>Photo 3<input id="p-photo3" type="file" accept="image/*" /></label>
        </div>

        <h3>Recipe</h3>
        <select id="recipe-add-select">
          <option value="">+ Add inventory item…</option>
          ${inventoryItems.map((i) => `<option value="${i.id}" data-name="${escapeHtml(i.name)}">${escapeHtml(i.name)}</option>`).join('')}
        </select>
        <div id="recipe-rows" style="margin-top:0.5rem;"></div>

        <div class="modal-actions">
          <button class="btn" id="p-cancel">Cancel</button>
          <button class="btn btn-primary" id="p-save">Save</button>
        </div>
        <p id="p-error" class="error-text" hidden></p>
      </div>
    </div>
  `;

  renderRecipeRows();

  document.getElementById('recipe-add-select').addEventListener('change', (e) => {
    const opt = e.target.selectedOptions[0];
    if (!opt.value) return;
    recipeRows.push({ inventoryItemId: opt.value, name: opt.dataset.name, quantity: 1, notes: '' });
    e.target.value = '';
    renderRecipeRows();
  });

  document.getElementById('p-cancel').addEventListener('click', () => (wrap.innerHTML = ''));
  document.getElementById('p-save').addEventListener('click', async () => {
    const code = document.getElementById('p-code').value;
    const name = document.getElementById('p-name').value;
    const price = document.getElementById('p-price').value;
    if (!code || !name || !price) return;

    const fd = new FormData();
    fd.append('code', code);
    fd.append('name', name);
    fd.append('price', price);
    fd.append('categoryId', document.getElementById('p-categoryId').value);
    fd.append('widthIn', document.getElementById('p-widthIn').value);
    fd.append('heightIn', document.getElementById('p-heightIn').value);
    fd.append('visible', document.getElementById('p-visible').checked);
    fd.append('description', document.getElementById('p-description').value);
    ['photo1', 'photo2', 'photo3'].forEach((f) => {
      const file = document.getElementById(`p-${f}`).files[0];
      if (file) fd.append(f, file);
    });

    try {
      const saved = product ? await api.put(`/products/${product.id}`, fd) : await api.post('/products', fd);
      await api.put(`/products/${saved.id}/recipe`, {
        items: recipeRows.map((r) => ({ inventoryItemId: r.inventoryItemId, quantity: r.quantity, notes: r.notes })),
      });
      wrap.innerHTML = '';
      onSaved();
    } catch (err) {
      const e = document.getElementById('p-error');
      e.textContent = err.message;
      e.hidden = false;
    }
  });
}

function renderRecipeRows() {
  const wrap = document.getElementById('recipe-rows');
  if (!recipeRows.length) {
    wrap.innerHTML = '<p style="color:var(--text-dim);font-size:0.85rem;">No recipe items yet.</p>';
    return;
  }
  wrap.innerHTML = recipeRows
    .map(
      (r, i) => `
    <div class="line-item-row" style="grid-template-columns:2fr 70px 1.2fr 40px;">
      <span>${escapeHtml(r.name)}</span>
      <input type="number" min="0" step="0.1" value="${r.quantity}" data-idx="${i}" data-field="quantity" />
      <input type="text" placeholder="notes" value="${escapeHtml(r.notes)}" data-idx="${i}" data-field="notes" />
      <button type="button" class="btn btn-sm btn-danger" data-remove="${i}">✕</button>
    </div>`
    )
    .join('');

  wrap.querySelectorAll('input').forEach((inp) =>
    inp.addEventListener('input', (e) => {
      const idx = e.target.dataset.idx;
      const field = e.target.dataset.field;
      recipeRows[idx][field] = field === 'quantity' ? Number(e.target.value) : e.target.value;
    })
  );
  wrap.querySelectorAll('[data-remove]').forEach((btn) =>
    btn.addEventListener('click', () => {
      recipeRows.splice(Number(btn.dataset.remove), 1);
      renderRecipeRows();
    })
  );
}
