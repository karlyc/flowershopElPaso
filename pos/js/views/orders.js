// js/views/orders.js — Orders list + detail/receipt/payment
import { api, API_BASE } from '../api.js';
import { money, dateShort, dateLong, dateTimeShort, titleCase, escapeHtml } from '../format.js';
import { state } from '../state.js';

const UPLOADS_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

const STATUS_BADGE = {
  MAKING_ARRANGEMENT: 'badge-amber',
  PENDING_DELIVERY: 'badge-pink',
  COMPLETED: 'badge-green',
  CANCELLED: 'badge-gray',
};
const PAY_BADGE = { PENDING: 'badge-gray', SUBMITTED: 'badge-amber', CONFIRMED: 'badge-green' };

export async function renderOrderList(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>Orders</h2>
      <div class="toolbar">
        <input id="search" placeholder="Search order #, customer, recipient…" />
        <select id="status-filter">
          <option value="">All statuses</option>
          <option value="MAKING_ARRANGEMENT">Making arrangement</option>
          <option value="PENDING_DELIVERY">Pending delivery</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <a href="#/orders/new" class="btn btn-primary">+ New order</a>
      </div>
    </div>
    <div class="table-wrap"><div id="orders-table"></div></div>
  `;

  async function load() {
    const search = document.getElementById('search').value;
    const orderStatus = document.getElementById('status-filter').value;
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (orderStatus) params.set('orderStatus', orderStatus);
    const orders = await api.get(`/orders?${params}`);
    renderTable(orders);
  }

  function renderTable(orders) {
    const wrap = document.getElementById('orders-table');
    if (!orders.length) {
      wrap.innerHTML = '<p class="empty-state">No orders found.</p>';
      return;
    }
    wrap.innerHTML = `<table><thead><tr>
      <th>Order #</th><th>Delivery</th><th>Customer</th><th>Recipient</th><th>Total</th><th>Status</th><th>Payment</th><th></th>
    </tr></thead><tbody>
      ${orders
        .map(
          (o) => `<tr${o.printedAt ? '' : ' class="row-unprinted"'}>
        <td>${escapeHtml(o.orderNumber)}</td>
        <td>${dateShort(o.deliveryDate)}</td>
        <td>${escapeHtml(o.client?.firstName)} ${escapeHtml(o.client?.lastName)}</td>
        <td>${escapeHtml(o.recipientName || '—')}</td>
        <td>${money(o.total)}</td>
        <td><span class="badge ${STATUS_BADGE[o.orderStatus]}">${titleCase(o.orderStatus)}</span></td>
        <td><span class="badge ${PAY_BADGE[o.paymentStatus]}">${titleCase(o.paymentStatus)}</span></td>
        <td><a href="#/orders/${o.id}" class="btn btn-sm">View</a></td>
      </tr>`
        )
        .join('')}
    </tbody></table>`;
  }

  document.getElementById('search').addEventListener('input', debounce(load, 300));
  document.getElementById('status-filter').addEventListener('change', load);
  load();
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function addOnDetail(a) {
  if (a.kind === 'BANNER') return [a.bannerColor, a.bannerMessage].filter(Boolean).join(' — ');
  if (a.kind === 'BALLOONS') return a.balloonOccasion || '';
  return '';
}

function receiptPrintHeader(shop) {
  return `
    <div class="receipt-letterhead">
      ${shop.logoUrl ? `<img src="${UPLOADS_ORIGIN}${shop.logoUrl}" alt="" />` : ''}
      <h2>${escapeHtml(shop.name)}</h2>
      ${shop.address ? `<p>${escapeHtml(shop.address)}</p>` : ''}
      ${[shop.phone, shop.phone2].filter(Boolean).length ? `<p>${[shop.phone, shop.phone2].filter(Boolean).map(escapeHtml).join(' · ')}</p>` : ''}
      ${shop.website ? `<p>${escapeHtml(shop.website)}</p>` : ''}
    </div>`;
}

function receiptCustomerBlock(order) {
  return `
    <div class="receipt-block">
      <h4>Customer</h4>
      <p>${escapeHtml(order.client.firstName)} ${escapeHtml(order.client.lastName)} — ${escapeHtml(order.client.phone)}<br/>
      Order created ${dateTimeShort(order.createdAt)}</p>
    </div>`;
}

function receiptDeliveryBlock(order) {
  const lines = [`${titleCase(order.deliveryOption)}${order.address ? ' — ' + escapeHtml(order.address) : ''}${order.zip ? ', ' + escapeHtml(order.zip) : ''}`];
  if (order.recipientName) lines.push(`Recipient: ${escapeHtml(order.recipientName)} ${escapeHtml(order.recipientPhone || '')}`);
  if (order.businessName) lines.push(`Business: ${escapeHtml(order.businessName)} (${escapeHtml(order.businessDept || '')})`);
  if (order.pickupPersonName) lines.push(`Picking up: ${escapeHtml(order.pickupPersonName)}`);
  if (order.deliveryNotes) lines.push(`Notes: ${escapeHtml(order.deliveryNotes)}`);
  return `
    <div class="receipt-block">
      <h4>Delivery</h4>
      <p>${lines.join('<br/>')}<br/>
      <span class="receipt-delivery-time">${dateLong(order.deliveryDate)} — ${escapeHtml(order.deliveryTimeType)} ${escapeHtml(order.deliveryTime)}</span></p>
    </div>`;
}

function receiptMessageBlock(order) {
  return `
    <div class="receipt-block receipt-message-block">
      <h4>Occasion &amp; Card Message</h4>
      <p>${titleCase(order.occasion)}<br/>
      ${escapeHtml(order.messageText || '—')}<br/>
      — ${order.messageAnon ? 'Anonymous' : escapeHtml(order.messageFrom || '')}</p>
    </div>`;
}

function receiptProductsBlock(order, { pricing }) {
  if (pricing) {
    const itemsTable = `
      <table><thead><tr><th>Item</th><th>Qty</th><th>Unit price</th><th>Notes</th></tr></thead><tbody>
        ${order.items
          .map((i) => `<tr><td>${escapeHtml(i.product?.name || i.customName)}</td><td>${i.quantity}</td><td>${money(i.unitPrice)}</td><td>${escapeHtml(i.notes || '')}</td></tr>`)
          .join('')}
      </tbody></table>`;
    const addOnsTable = order.addOns?.length
      ? `<table style="margin-top:0.5rem;"><thead><tr><th>Add on</th><th>Detail</th><th>Qty</th><th>Price</th></tr></thead><tbody>
          ${order.addOns.map((a) => `<tr><td>${escapeHtml(a.name)}</td><td>${escapeHtml(addOnDetail(a))}</td><td>${a.quantity}</td><td>${money(a.unitPrice)}</td></tr>`).join('')}
        </tbody></table>`
      : '';
    return `
      <div class="receipt-block">
        <h4>Products</h4>
        ${itemsTable}
        ${addOnsTable}
        <div class="receipt-row" style="margin-top:0.6rem;"><span>Subtotal</span><span>${money(order.subtotal)}</span></div>
        <div class="receipt-row"><span>Delivery fee</span><span>${money(order.deliveryFee)}</span></div>
        <div class="receipt-row"><span>Tax</span><span>${money(order.tax)}</span></div>
        <div class="receipt-row" style="font-weight:700;"><span>Total</span><span>${money(order.total)}</span></div>
        <div class="receipt-row" style="color:var(--text-muted);"><span>Payment type</span><span>${titleCase(order.paymentType)}</span></div>
      </div>`;
  }
  const rows = [
    ...order.items.map((i) => `<tr><td>${escapeHtml(i.product?.name || i.customName)}</td><td>${i.quantity}</td><td>${escapeHtml(i.notes || '')}</td></tr>`),
    ...(order.addOns || []).map((a) => `<tr><td>${escapeHtml(a.name)}</td><td>${a.quantity}</td><td>${escapeHtml(addOnDetail(a))}</td></tr>`),
  ].join('');
  return `
    <div class="receipt-block">
      <h4>Products</h4>
      <table><thead><tr><th>Item</th><th>Qty</th><th>Notes</th></tr></thead><tbody>${rows}</tbody></table>
    </div>`;
}

function receiptReceivedByBox() {
  return `
    <div class="receipt-block receipt-received-by">
      <div><span>Received by</span><div class="fill-line"></div></div>
      <div><span>Time</span><div class="fill-line"></div></div>
    </div>`;
}

function receiptCustomerDeliveryRow(order) {
  return `
    <div class="receipt-row-2col">
      ${receiptCustomerBlock(order)}
      ${receiptDeliveryBlock(order)}
    </div>`;
}

function renderPrintReceipt(order, shop) {
  const fullBlock = () => `
    <div class="receipt-order-no">Order ${escapeHtml(order.orderNumber)}</div>
    ${receiptCustomerDeliveryRow(order)}
    ${receiptMessageBlock(order)}
    ${receiptProductsBlock(order, { pricing: true })}
  `;
  return `
    <div class="receipt-print print-only">
      <section class="receipt-page">
        ${receiptPrintHeader(shop)}
        ${fullBlock()}
      </section>
      <section class="receipt-page receipt-page-2">
        <div class="receipt-half">
          ${fullBlock()}
        </div>
        <div class="receipt-half receipt-half-driver">
          <div class="receipt-order-no">Order ${escapeHtml(order.orderNumber)}</div>
          ${receiptCustomerDeliveryRow(order)}
          ${receiptProductsBlock(order, { pricing: false })}
          ${receiptReceivedByBox()}
        </div>
      </section>
    </div>`;
}

export async function renderOrderDetail(container, params) {
  const [order, shop] = await Promise.all([api.get(`/orders/${params.id}`), api.get('/settings')]);
  const canCancel = state.staff.role === 'ADMIN' && order.orderStatus !== 'CANCELLED';

  container.innerHTML = `
    <div class="order-screen-view">
    <div class="receipt-letterhead">
      ${shop.logoUrl ? `<img src="${UPLOADS_ORIGIN}${shop.logoUrl}" alt="" />` : ''}
      <h2>${escapeHtml(shop.name)}</h2>
      ${[shop.phone, shop.phone2].filter(Boolean).length ? `<p>${[shop.phone, shop.phone2].filter(Boolean).map(escapeHtml).join(' · ')}</p>` : ''}
      ${shop.address ? `<p>${escapeHtml(shop.address)}</p>` : ''}
      ${shop.website ? `<p>${escapeHtml(shop.website)}</p>` : ''}
    </div>

    <div class="page-header">
      <h2>Order ${escapeHtml(order.orderNumber)}
        <span class="no-print">
          <span class="badge ${STATUS_BADGE[order.orderStatus]}">${titleCase(order.orderStatus)}</span>
          <span class="badge ${PAY_BADGE[order.paymentStatus]}">${titleCase(order.paymentStatus)}</span>
        </span>
      </h2>
      <div class="toolbar no-print">
        <a href="#/orders/${order.id}/edit" class="btn">Edit</a>
        <button id="print-btn" class="btn">Print receipt</button>
        ${order.paymentStatus === 'PENDING' ? '<button id="submit-payment-btn" class="btn btn-primary">Submit payment</button>' : ''}
        ${canCancel ? '<button id="cancel-btn" class="btn btn-danger">Cancel order</button>' : ''}
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <h3>Customer</h3>
        <p><a href="#/customers/${order.client.id}">${escapeHtml(order.client.firstName)} ${escapeHtml(order.client.lastName)}</a><br/>
        ${escapeHtml(order.client.phone)}<br/>
        <span style="color:var(--text-muted);">Order created ${dateTimeShort(order.createdAt)}</span></p>
      </div>
      <div class="card">
        <h3>Delivery</h3>
        <p>${dateShort(order.deliveryDate)} — ${escapeHtml(order.deliveryTimeType)} ${escapeHtml(order.deliveryTime)}<br/>
        ${titleCase(order.deliveryOption)}${order.address ? ' — ' + escapeHtml(order.address) : ''}${order.zip ? ', ' + escapeHtml(order.zip) : ''}<br/>
        ${order.recipientName ? `Recipient: ${escapeHtml(order.recipientName)} ${escapeHtml(order.recipientPhone || '')}` : ''}
        ${order.businessName ? `<br/>Business: ${escapeHtml(order.businessName)} (${escapeHtml(order.businessDept || '')})` : ''}
        ${order.pickupPersonName ? `<br/>Picking up: ${escapeHtml(order.pickupPersonName)}` : ''}
        ${order.deliveryNotes ? `<br/>Notes: ${escapeHtml(order.deliveryNotes)}` : ''}</p>
      </div>
    </div>

    <div class="card">
      <h3>Occasion &amp; Message</h3>
      <p>${titleCase(order.occasion)}</p>
      <p>${escapeHtml(order.messageText || '—')}<br/>— ${order.messageAnon ? 'Anonymous' : escapeHtml(order.messageFrom || '')}</p>
    </div>

    <div class="card">
      <h3>Products</h3>
      <table><thead><tr><th>Item</th><th>Qty</th><th>Unit price</th><th>Notes</th></tr></thead><tbody>
        ${order.items
          .map(
            (i) => `<tr><td>${escapeHtml(i.product?.name || i.customName)}</td><td>${i.quantity}</td><td>${money(i.unitPrice)}</td><td>${escapeHtml(i.notes || '')}</td></tr>`
          )
          .join('')}
      </tbody></table>
      ${order.addOns?.length ? `<h3 style="margin-top:1.25rem;">Add Ons</h3>
      <table><thead><tr><th>Item</th><th>Detail</th><th>Qty</th><th>Price</th></tr></thead><tbody>
        ${order.addOns
          .map((a) => {
            const detail =
              a.kind === 'BANNER'
                ? [a.bannerColor, a.bannerMessage].filter(Boolean).join(' — ')
                : a.kind === 'BALLOONS'
                  ? a.balloonOccasion || ''
                  : '';
            return `<tr><td>${escapeHtml(a.name)}</td><td>${escapeHtml(detail)}</td><td>${a.quantity}</td><td>${money(a.unitPrice)}</td></tr>`;
          })
          .join('')}
      </tbody></table>` : ''}
      <div class="receipt-row" style="margin-top:1rem;"><span>Subtotal</span><span>${money(order.subtotal)}</span></div>
      <div class="receipt-row"><span>Delivery fee</span><span>${money(order.deliveryFee)}</span></div>
      <div class="receipt-row"><span>Tax</span><span>${money(order.tax)}</span></div>
      <div class="receipt-row" style="font-weight:700;"><span>Total</span><span>${money(order.total)}</span></div>
      <div class="receipt-row" style="color:var(--text-muted);"><span>Payment type</span><span>${titleCase(order.paymentType)}</span></div>
      ${order.paymentProofUrl ? `<p><a href="${UPLOADS_ORIGIN}${order.paymentProofUrl}" target="_blank">View payment proof</a></p>` : ''}
    </div>

    <div class="card no-print">
      <h3>Delivery Confirmation</h3>
      ${
        order.deliveredAt
          ? `<div class="delivery-confirmation">
              <p><strong>Received by</strong><br/>${escapeHtml(order.receivedByName || '—')}</p>
              <p><strong>Delivered</strong><br/>${dateTimeShort(order.deliveredAt)}</p>
              ${
                order.deliveryPhotoUrl
                  ? `<a href="${UPLOADS_ORIGIN}${order.deliveryPhotoUrl}" target="_blank"><img class="delivery-photo" src="${UPLOADS_ORIGIN}${order.deliveryPhotoUrl}" alt="Delivery proof photo" /></a>`
                  : '<p class="empty-state">No photo captured.</p>'
              }
            </div>`
          : '<p class="empty-state">Not yet delivered.</p>'
      }
    </div>

    <div id="payment-modal-wrap"></div>
    </div>

    ${renderPrintReceipt(order, shop)}
  `;

  document.getElementById('print-btn').addEventListener('click', () => {
    window.print();
    if (!order.printedAt) api.patch(`/orders/${order.id}/mark-printed`).catch(() => {});
  });
  document.getElementById('cancel-btn')?.addEventListener('click', async () => {
    if (!confirm('Cancel this order?')) return;
    await api.del(`/orders/${order.id}`);
    location.reload();
  });
  document.getElementById('submit-payment-btn')?.addEventListener('click', () => openPaymentModal(order));
}

function openPaymentModal(order) {
  const wrap = document.getElementById('payment-modal-wrap');
  wrap.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal">
        <h3>Submit payment</h3>
        <label>Proof photo<input id="proof-file" type="file" accept="image/*" /></label>
        ${
          order.paymentType === 'CASH'
            ? `<label>Bill breakdown (e.g. 20x2, 10x1)<input id="cash-breakdown" placeholder='{"20":2,"10":1}' /></label>`
            : ''
        }
        <div class="modal-actions">
          <button class="btn" id="close-modal">Cancel</button>
          <button class="btn btn-primary" id="confirm-submit">Submit</button>
        </div>
        <p id="modal-error" class="error-text" hidden></p>
      </div>
    </div>
  `;
  document.getElementById('close-modal').addEventListener('click', () => (wrap.innerHTML = ''));
  document.getElementById('confirm-submit').addEventListener('click', async () => {
    const errorEl = document.getElementById('modal-error');
    const fd = new FormData();
    const file = document.getElementById('proof-file').files[0];
    if (file) fd.append('proof', file);
    const breakdown = document.getElementById('cash-breakdown')?.value;
    if (breakdown) fd.append('cashBillBreakdown', breakdown);
    try {
      await api.post(`/orders/${order.id}/submit-payment`, fd);
      location.reload();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    }
  });
}
