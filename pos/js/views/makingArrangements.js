// js/views/makingArrangements.js — spec: "-Making arrangements"
import { api, API_BASE } from '../api.js';
import { escapeHtml } from '../format.js';

const UPLOADS_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

export async function renderMakingArrangements(container) {
  container.innerHTML = `<div class="page-header"><h2>Making Arrangements</h2></div><div id="ma-list"></div>`;

  async function load() {
    const orders = await api.get('/making-arrangements');
    const wrap = document.getElementById('ma-list');
    if (!orders.length) {
      wrap.innerHTML = '<p class="empty-state">Nothing to build right now.</p>';
      return;
    }
    wrap.innerHTML = orders
      .map(
        (o) => `
      <div class="card">
        <div class="page-header" style="margin-bottom:0.5rem;">
          <h3 style="margin:0;">${escapeHtml(o.orderNumber)} — ${escapeHtml(o.client?.firstName)} ${escapeHtml(o.client?.lastName)}</h3>
          <button class="btn btn-primary btn-sm" data-complete="${o.id}">Completed</button>
        </div>
        <p style="color:var(--text-muted);font-size:0.85rem;">Delivery: ${new Date(o.deliveryDate).toLocaleDateString()} — ${escapeHtml(o.deliveryTimeType)} ${escapeHtml(o.deliveryTime)}</p>
        <table><thead><tr><th>Product</th><th>Qty</th><th>Recipe</th><th>Notes</th></tr></thead><tbody>
          ${o.items
            .map((i) => {
              const recipe = i.product?.recipe?.map((r) => `${r.inventoryItem.name} × ${r.quantity}`).join(', ') || '—';
              const photo = i.product?.photo1Url ? `<img src="${UPLOADS_ORIGIN}${i.product.photo1Url}" style="width:40px;height:40px;object-fit:cover;border-radius:var(--radius-md);vertical-align:middle;margin-right:6px;" />` : '';
              return `<tr><td>${photo}${escapeHtml(i.product?.name || i.customName)}</td><td>${i.quantity}</td><td>${escapeHtml(recipe)}</td><td>${escapeHtml(i.notes || '')}</td></tr>`;
            })
            .join('')}
        </tbody></table>
      </div>`
      )
      .join('');

    wrap.querySelectorAll('[data-complete]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        await api.patch(`/making-arrangements/${btn.dataset.complete}/complete`, {});
        load();
      })
    );
  }

  load();
}
