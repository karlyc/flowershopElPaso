// js/views/zipCodes.js
import { api } from '../api.js';
import { money, escapeHtml } from '../format.js';

export async function renderZipCodes(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>Zip Codes</h2>
      <button id="add-btn" class="btn btn-primary">+ Add</button>
    </div>
    <div id="zip-list"></div>
    <div id="zip-modal-wrap"></div>
  `;

  async function load() {
    const zips = await api.get('/zip-codes');
    const wrap = document.getElementById('zip-list');
    if (!zips.length) {
      wrap.innerHTML = '<p class="empty-state">No zip codes yet.</p>';
      return;
    }
    wrap.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Zip</th><th>Price</th><th></th></tr></thead><tbody>
      ${zips
        .map(
          (z) => `<tr>
        <td>${escapeHtml(z.zip)}</td><td>${money(z.price)}</td>
        <td><button class="btn btn-sm btn-danger" data-delete="${z.id}">Delete</button></td>
      </tr>`
        )
        .join('')}
    </tbody></table></div>`;

    wrap.querySelectorAll('[data-delete]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this zip code?')) return;
        await api.del(`/zip-codes/${btn.dataset.delete}`);
        load();
      })
    );
  }

  document.getElementById('add-btn').addEventListener('click', () => {
    const wrap = document.getElementById('zip-modal-wrap');
    wrap.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal">
          <h3>Add zip code</h3>
          <label>Zip<input id="z-zip" required /></label>
          <label>Price<input id="z-price" type="number" step="0.01" required /></label>
          <div class="modal-actions">
            <button class="btn" id="z-cancel">Cancel</button>
            <button class="btn btn-primary" id="z-save">Save</button>
          </div>
          <p id="z-error" class="error-text" hidden></p>
        </div>
      </div>
    `;
    document.getElementById('z-cancel').addEventListener('click', () => (wrap.innerHTML = ''));
    document.getElementById('z-save').addEventListener('click', async () => {
      try {
        await api.post('/zip-codes', {
          zip: document.getElementById('z-zip').value,
          price: Number(document.getElementById('z-price').value),
        });
        wrap.innerHTML = '';
        load();
      } catch (err) {
        const e = document.getElementById('z-error');
        e.textContent = err.message;
        e.hidden = false;
      }
    });
  });

  load();
}
