// js/views/customers.js
import { api } from '../api.js';
import { money, dateShort, titleCase, escapeHtml } from '../format.js';

export async function renderCustomerList(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>Customers</h2>
      <div class="toolbar"><input id="search" placeholder="Search by phone or name…" /></div>
    </div>
    <div class="table-wrap"><div id="customers-table"></div></div>
  `;

  async function load() {
    const q = document.getElementById('search').value;
    const clients = await api.get(`/clients${q ? `?search=${encodeURIComponent(q)}` : ''}`);
    const wrap = document.getElementById('customers-table');
    if (!clients.length) {
      wrap.innerHTML = '<p class="empty-state">No customers found.</p>';
      return;
    }
    wrap.innerHTML = `<table><thead><tr><th>Name</th><th>Phone</th><th>Orders</th><th>Tier</th><th>Client since</th></tr></thead><tbody>
      ${clients
        .map(
          (c) => `<tr>
        <td><a href="#/customers/${c.id}">${escapeHtml(c.firstName)} ${escapeHtml(c.lastName)}</a></td>
        <td>${escapeHtml(c.phone)}</td>
        <td>${c.orderCount}</td>
        <td><span class="badge badge-pink">${titleCase(c.tier)}</span></td>
        <td>${dateShort(c.clientSince)}</td>
      </tr>`
        )
        .join('')}
    </tbody></table>`;
  }

  document.getElementById('search').addEventListener('input', debounce(load, 300));
  load();
}

function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

export async function renderCustomerDetail(container, params) {
  const client = await api.get(`/clients/${params.id}`);

  container.innerHTML = `
    <div class="page-header"><h2>${escapeHtml(client.firstName)} ${escapeHtml(client.lastName)}
      <span class="badge badge-pink">${titleCase(client.tier)}</span></h2></div>

    <div class="grid-2">
      <div class="card">
        <h3>Contact</h3>
        <p>Phone: ${escapeHtml(client.phone)}${client.phone2 ? ` / ${escapeHtml(client.phone2)}` : ''}<br/>
        Email: ${escapeHtml(client.email || '—')}<br/>
        Company: ${escapeHtml(client.company || '—')}<br/>
        Client since: ${dateShort(client.clientSince)}<br/>
        Referral: ${escapeHtml(client.referral || '—')}</p>
        <p>${escapeHtml(client.notes || '')}</p>
      </div>
      <div class="card">
        <h3>Stats</h3>
        <div class="kpi-row">
          <div class="kpi"><div class="kpi-label">Total orders</div><div class="kpi-value">${client.orderCount}</div></div>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>Order history</h3>
      <table><thead><tr><th>Order #</th><th>Date</th><th>Total</th><th>Status</th></tr></thead><tbody>
        ${client.orders
          .map(
            (o) => `<tr>
          <td><a href="#/orders/${o.id}">${escapeHtml(o.orderNumber)}</a></td>
          <td>${dateShort(o.createdAt)}</td>
          <td>${money(o.total)}</td>
          <td>${titleCase(o.orderStatus)}</td>
        </tr>`
          )
          .join('')}
      </tbody></table>
    </div>
  `;
}
