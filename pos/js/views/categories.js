// js/views/categories.js
import { api, API_BASE } from '../api.js';
import { escapeHtml } from '../format.js';

const UPLOADS_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

export async function renderCategories(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>Categories</h2>
      <button id="add-btn" class="btn btn-primary">+ Add category</button>
    </div>
    <div id="cat-list"></div>
    <div id="cat-modal-wrap"></div>
  `;

  async function load() {
    const categories = await api.get('/categories');
    const wrap = document.getElementById('cat-list');
    if (!categories.length) {
      wrap.innerHTML = '<p class="empty-state">No categories yet.</p>';
      return;
    }
    wrap.innerHTML = `<div class="table-wrap"><table><thead><tr><th></th><th>Name</th><th>Products</th><th>Visible</th><th></th></tr></thead><tbody>
      ${categories
        .map(
          (c) => `<tr>
        <td>${
          c.photoUrl
            ? `<img src="${UPLOADS_ORIGIN}${c.photoUrl}" style="width:36px;height:36px;object-fit:cover;border-radius:var(--radius-md);" />`
            : `<div style="width:36px;height:36px;border-radius:var(--radius-md);background:var(--sage-100);color:var(--forest-700);display:flex;align-items:center;justify-content:center;font-size:16px;">❀</div>`
        }</td>
        <td>${escapeHtml(c.name)}</td>
        <td>${c._count?.products ?? 0}</td>
        <td>${c.visible ? '<span class="badge badge-green">Yes</span>' : '<span class="badge badge-gray">No</span>'}</td>
        <td><button class="btn btn-sm" data-edit="${c.id}">Edit</button> <button class="btn btn-sm btn-danger" data-delete="${c.id}">Delete</button></td>
      </tr>`
        )
        .join('')}
    </tbody></table></div>`;

    wrap.querySelectorAll('[data-edit]').forEach((btn) =>
      btn.addEventListener('click', () => openModal(categories.find((c) => c.id === btn.dataset.edit), load))
    );
    wrap.querySelectorAll('[data-delete]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this category?')) return;
        await api.del(`/categories/${btn.dataset.delete}`);
        load();
      })
    );
  }

  document.getElementById('add-btn').addEventListener('click', () => openModal(null, load));
  load();
}

function openModal(category, onSaved) {
  const wrap = document.getElementById('cat-modal-wrap');
  wrap.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal">
        <h3>${category ? 'Edit' : 'Add'} category</h3>
        ${category?.photoUrl ? `<img src="${UPLOADS_ORIGIN}${category.photoUrl}" style="width:64px;height:64px;object-fit:cover;border-radius:var(--radius-md);margin-bottom:0.75rem;" />` : ''}
        <label>Name<input id="c-name" value="${escapeHtml(category?.name || '')}" required /></label>
        <label>Description<textarea id="c-description" rows="2">${escapeHtml(category?.description || '')}</textarea></label>
        <label>Photo<input id="c-photo" type="file" accept="image/*" /></label>
        <label class="checkbox-line"><input type="checkbox" id="c-visible" ${category?.visible !== false ? 'checked' : ''} /> Visible</label>
        <div class="modal-actions">
          <button class="btn" id="c-cancel">Cancel</button>
          <button class="btn btn-primary" id="c-save">Save</button>
        </div>
        <p id="c-error" class="error-text" hidden></p>
      </div>
    </div>
  `;
  document.getElementById('c-cancel').addEventListener('click', () => (wrap.innerHTML = ''));
  document.getElementById('c-save').addEventListener('click', async () => {
    const name = document.getElementById('c-name').value;
    if (!name) return;
    const fd = new FormData();
    fd.append('name', name);
    fd.append('description', document.getElementById('c-description').value);
    fd.append('visible', document.getElementById('c-visible').checked);
    const photoFile = document.getElementById('c-photo').files[0];
    if (photoFile) fd.append('photo', photoFile);
    try {
      if (category) await api.put(`/categories/${category.id}`, fd);
      else await api.post('/categories', fd);
      wrap.innerHTML = '';
      onSaved();
    } catch (err) {
      const e = document.getElementById('c-error');
      e.textContent = err.message;
      e.hidden = false;
    }
  });
}
