// js/views/admin/payments.js — spec: "-Admin > Payments"
import { api, API_BASE } from '../../api.js';
import { money, dateShort, titleCase, escapeHtml } from '../../format.js';

const UPLOADS_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

export async function renderPayments(container) {
  container.innerHTML = `
    <div class="page-header"><h2>Payments</h2></div>
    <div class="card">
      <h3>Awaiting confirmation</h3>
      <div id="submitted-list"></div>
    </div>
    <div class="card">
      <h3>Not submitted (today)</h3>
      <div id="not-submitted-list"></div>
    </div>
    <div class="card">
      <h3>Pending &gt; 1 day</h3>
      <div id="pending-list"></div>
    </div>
  `;

  async function load() {
    const [submitted, notSubmitted, pending] = await Promise.all([
      api.get('/payments/submitted'),
      api.get('/payments/not-submitted'),
      api.get('/payments/pending'),
    ]);
    renderSubmitted(submitted);
    renderSimple('not-submitted-list', notSubmitted, true);
    renderSimple('pending-list', pending, true);
  }

  function renderSubmitted(orders) {
    const wrap = document.getElementById('submitted-list');
    if (!orders.length) {
      wrap.innerHTML = '<p class="empty-state">Nothing awaiting confirmation.</p>';
      return;
    }
    wrap.innerHTML = `<table><thead><tr><th>Order #</th><th>Customer</th><th>Type</th><th>Total</th><th>Proof</th><th></th></tr></thead><tbody>
      ${orders
        .map(
          (o) => `<tr>
        <td><a href="#/orders/${o.id}">${escapeHtml(o.orderNumber)}</a></td>
        <td>${escapeHtml(o.client?.firstName)} ${escapeHtml(o.client?.lastName)}</td>
        <td>${titleCase(o.paymentType)}</td>
        <td>${money(o.total)}</td>
        <td>${o.paymentProofUrl ? `<a href="${UPLOADS_ORIGIN}${o.paymentProofUrl}" target="_blank">View</a>` : '—'}</td>
        <td><button class="btn btn-sm btn-primary" data-confirm="${o.id}">Payment confirmed</button></td>
      </tr>`
        )
        .join('')}
    </tbody></table>`;

    wrap.querySelectorAll('[data-confirm]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        await api.patch(`/payments/${btn.dataset.confirm}/confirm`, {});
        load();
      })
    );
  }

  function renderSimple(id, orders, withReminder) {
    const wrap = document.getElementById(id);
    if (!orders.length) {
      wrap.innerHTML = '<p class="empty-state">None.</p>';
      return;
    }
    wrap.innerHTML = `<table><thead><tr><th>Order #</th><th>Customer</th><th>Created</th><th>Total</th>${withReminder ? '<th>Snooze</th>' : ''}</tr></thead><tbody>
      ${orders
        .map(
          (o) => `<tr>
        <td><a href="#/orders/${o.id}">${escapeHtml(o.orderNumber)}</a></td>
        <td>${escapeHtml(o.client?.firstName)} ${escapeHtml(o.client?.lastName)}</td>
        <td>${dateShort(o.createdAt)}</td>
        <td>${money(o.total)}</td>
        ${
          withReminder
            ? `<td><select data-snooze="${o.id}">
                <option value="">Set reminder…</option>
                <option value="next_day">Next day</option>
                <option value="one_week">One week</option>
                <option value="two_weeks">Two weeks</option>
                <option value="one_month">One month</option>
              </select></td>`
            : ''
        }
      </tr>`
        )
        .join('')}
    </tbody></table>`;

    wrap.querySelectorAll('[data-snooze]').forEach((select) =>
      select.addEventListener('change', async () => {
        if (!select.value) return;
        await api.patch(`/payments/${select.dataset.snooze}/reminder`, { snooze: select.value });
        load();
      })
    );
  }

  load();
}
