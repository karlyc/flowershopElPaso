// js/views/deliveries.js — spec: "-Deliveries"
import { api } from '../api.js';
import { escapeHtml } from '../format.js';

export async function renderDeliveries(container) {
  container.innerHTML = `<div class="page-header"><h2>Deliveries</h2></div><div id="deliveries-list"></div><div id="delivery-modal-wrap"></div>`;

  async function load() {
    const orders = await api.get('/deliveries');
    const wrap = document.getElementById('deliveries-list');
    if (!orders.length) {
      wrap.innerHTML = '<p class="empty-state">No pending deliveries.</p>';
      return;
    }
    wrap.innerHTML = `<div class="table-wrap"><table><thead><tr>
      <th>Order #</th><th>Delivery</th><th>Customer</th><th>Products</th><th>Address</th><th></th>
    </tr></thead><tbody>
      ${orders
        .map(
          (o) => `<tr>
        <td>${escapeHtml(o.orderNumber)}</td>
        <td>${new Date(o.deliveryDate).toLocaleDateString()} — ${escapeHtml(o.deliveryTimeType)} ${escapeHtml(o.deliveryTime)}</td>
        <td>${escapeHtml(o.client?.firstName)} ${escapeHtml(o.client?.lastName)} — ${escapeHtml(o.client?.phone)}</td>
        <td>${o.items.map((i) => escapeHtml(i.product?.name || i.customName)).join(', ')}</td>
        <td>${escapeHtml(o.address || '—')}</td>
        <td><button class="btn btn-primary btn-sm" data-deliver="${o.id}">Delivered</button></td>
      </tr>`
        )
        .join('')}
    </tbody></table></div>`;

    wrap.querySelectorAll('[data-deliver]').forEach((btn) =>
      btn.addEventListener('click', () => openConfirmModal(btn.dataset.deliver, load))
    );
  }

  load();
}

function openConfirmModal(orderId, onDone) {
  const wrap = document.getElementById('delivery-modal-wrap');
  wrap.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal">
        <h3>Confirm delivery</h3>
        <label>Name of who received<input id="d-receivedBy" required /></label>
        <label>Photo proof<input id="d-photo" type="file" accept="image/*" /></label>
        <div class="modal-actions">
          <button class="btn" id="d-cancel">Cancel</button>
          <button class="btn btn-primary" id="d-submit">Submit</button>
        </div>
        <p id="d-error" class="error-text" hidden></p>
      </div>
    </div>
  `;
  document.getElementById('d-cancel').addEventListener('click', () => (wrap.innerHTML = ''));
  document.getElementById('d-submit').addEventListener('click', async () => {
    const receivedByName = document.getElementById('d-receivedBy').value;
    if (!receivedByName) return;
    const fd = new FormData();
    fd.append('receivedByName', receivedByName);
    const file = document.getElementById('d-photo').files[0];
    if (file) fd.append('photo', file);
    try {
      await api.post(`/deliveries/${orderId}/confirm`, fd);
      wrap.innerHTML = '';
      onDone();
    } catch (err) {
      const e = document.getElementById('d-error');
      e.textContent = err.message;
      e.hidden = false;
    }
  });
}
