// js/views/zipCodes.js
import { api } from '../api.js';
import { money, escapeHtml } from '../format.js';

export async function renderZipCodes(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>Zip Codes</h2>
      <div class="toolbar">
        <input id="search" placeholder="Search zip or city…" />
        <button id="add-btn" class="btn btn-primary">+ Add</button>
      </div>
    </div>
    <div id="zip-list"></div>
    <div id="zip-modal-wrap"></div>
  `;

  let allZones = [];

  async function load() {
    allZones = await api.get('/zip-codes');
    renderTable();
  }

  function renderTable() {
    const q = document.getElementById('search').value.trim().toLowerCase();
    const zones = q
      ? allZones.filter((z) => (z.zip || '').includes(q) || (z.city || '').toLowerCase().includes(q))
      : allZones;

    const wrap = document.getElementById('zip-list');
    if (!zones.length) {
      wrap.innerHTML = '<p class="empty-state">No delivery zones yet.</p>';
      return;
    }
    wrap.innerHTML = `<div class="table-wrap"><table><thead><tr>
      <th>Type</th><th>Zone</th><th>Price</th><th>Status</th><th></th>
    </tr></thead><tbody>
      ${zones
        .map(
          (z) => `<tr>
        <td>${z.type === 'CITY' ? 'City' : 'Zip code'}</td>
        <td>${z.type === 'CITY' ? escapeHtml(z.city) + (z.state ? ', ' + escapeHtml(z.state) : '') : escapeHtml(z.zip)}</td>
        <td>${money(z.price)}</td>
        <td>${z.active ? '<span class="badge badge-green">On</span>' : '<span class="badge badge-gray">Off</span>'}</td>
        <td><button class="btn btn-sm" data-edit="${z.id}">Edit</button> <button class="btn btn-sm btn-danger" data-delete="${z.id}">Delete</button></td>
      </tr>`
        )
        .join('')}
    </tbody></table></div>`;

    wrap.querySelectorAll('[data-edit]').forEach((btn) =>
      btn.addEventListener('click', () => openModal(allZones.find((z) => z.id === btn.dataset.edit), load))
    );
    wrap.querySelectorAll('[data-delete]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this delivery zone?')) return;
        await api.del(`/zip-codes/${btn.dataset.delete}`);
        load();
      })
    );
  }

  document.getElementById('search').addEventListener('input', renderTable);
  document.getElementById('add-btn').addEventListener('click', () => openModal(null, load));

  load();
}

function openModal(zone, onSaved) {
  const wrap = document.getElementById('zip-modal-wrap');
  const isCity = zone?.type === 'CITY';
  wrap.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal">
        <h3>${zone ? 'Edit' : 'Add'} delivery zone</h3>
        <label>Type
          <select id="z-type">
            <option value="ZIP" ${!isCity ? 'selected' : ''}>Zip code</option>
            <option value="CITY" ${isCity ? 'selected' : ''}>City</option>
          </select>
        </label>
        <div id="z-zip-field" class="grid-2" ${isCity ? 'hidden' : ''}>
          <label>Zip code<input id="z-zip" value="${escapeHtml(zone?.zip || '')}" /></label>
        </div>
        <div id="z-city-fields" class="grid-2" ${isCity ? '' : 'hidden'}>
          <label>City<input id="z-city" value="${escapeHtml(zone?.city || '')}" /></label>
          <label>State<input id="z-state" value="${escapeHtml(zone?.state || '')}" placeholder="TX" /></label>
        </div>
        <div class="grid-2">
          <label>Delivery fee<input id="z-price" type="number" step="0.01" value="${zone?.price ?? ''}" required /></label>
          <label class="checkbox-line" style="margin-top:1.6rem;"><input type="checkbox" id="z-active" ${zone?.active !== false ? 'checked' : ''} /> On</label>
        </div>
        <div class="modal-actions">
          <button class="btn" id="z-cancel">Cancel</button>
          <button class="btn btn-primary" id="z-save">Save</button>
        </div>
        <p id="z-error" class="error-text" hidden></p>
      </div>
    </div>
  `;

  document.getElementById('z-type').addEventListener('change', (e) => {
    const type = e.target.value;
    document.getElementById('z-zip-field').hidden = type === 'CITY';
    document.getElementById('z-city-fields').hidden = type !== 'CITY';
  });

  document.getElementById('z-cancel').addEventListener('click', () => (wrap.innerHTML = ''));
  document.getElementById('z-save').addEventListener('click', async () => {
    const type = document.getElementById('z-type').value;
    const body = {
      type,
      zip: document.getElementById('z-zip').value.trim(),
      city: document.getElementById('z-city').value.trim(),
      state: document.getElementById('z-state').value.trim(),
      price: Number(document.getElementById('z-price').value),
      active: document.getElementById('z-active').checked,
    };
    try {
      if (zone) await api.put(`/zip-codes/${zone.id}`, body);
      else await api.post('/zip-codes', body);
      wrap.innerHTML = '';
      onSaved();
    } catch (err) {
      const e = document.getElementById('z-error');
      e.textContent = err.message;
      e.hidden = false;
    }
  });
}
