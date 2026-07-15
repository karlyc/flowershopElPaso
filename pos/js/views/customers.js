// js/views/customers.js
import { api } from '../api.js';
import { money, dateShort, titleCase, escapeHtml } from '../format.js';
import { countryCodeOptions } from '../countries.js';

const REFERRAL_OPTIONS = [
  'Recommended by a client',
  'Google Maps',
  'Instagram',
  'Facebook',
  'Passing by',
  'Google',
  'Other',
];

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
        <td>${escapeHtml(c.phoneCode)} ${escapeHtml(c.phone)}</td>
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
    <div class="page-header">
      <h2>${escapeHtml(client.firstName)} ${escapeHtml(client.lastName)}
        <span class="badge badge-pink">${titleCase(client.tier)}</span></h2>
      <div class="toolbar"><button id="edit-customer-btn" class="btn">Edit</button></div>
    </div>

    <div class="grid-2">
      <div class="card">
        <h3>Contact</h3>
        <p>Phone: ${escapeHtml(client.phoneCode)} ${escapeHtml(client.phone)}${client.phone2 ? ` / ${escapeHtml(client.phone2Code)} ${escapeHtml(client.phone2)}` : ''}<br/>
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

    <div id="edit-customer-modal-wrap"></div>
  `;

  document.getElementById('edit-customer-btn').addEventListener('click', () => {
    openEditModal(client, () => renderCustomerDetail(container, params));
  });
}

function openEditModal(client, onSaved) {
  const wrap = document.getElementById('edit-customer-modal-wrap');
  wrap.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal" style="max-width:640px;">
        <h3>Edit customer</h3>
        <div class="grid-2">
          <label>Phone *
            <div class="phone-input-row">
              <select id="ec-phoneCode" class="phone-code-select">${countryCodeOptions(client.phoneCode)}</select>
              <input id="ec-phone" class="phone-input" value="${escapeHtml(client.phone)}" required />
            </div>
          </label>
          <label>Second phone
            <div class="phone-input-row">
              <select id="ec-phone2Code" class="phone-code-select">${countryCodeOptions(client.phone2Code || '+1')}</select>
              <input id="ec-phone2" class="phone-input" value="${escapeHtml(client.phone2 || '')}" />
            </div>
          </label>
          <label>First name *<input id="ec-firstName" value="${escapeHtml(client.firstName)}" required /></label>
          <label>Second name<input id="ec-secondName" value="${escapeHtml(client.secondName || '')}" /></label>
          <label>Last name *<input id="ec-lastName" value="${escapeHtml(client.lastName)}" required /></label>
          <label>Email<input id="ec-email" type="email" value="${escapeHtml(client.email || '')}" /></label>
          <label>Company<input id="ec-company" value="${escapeHtml(client.company || '')}" /></label>
          <label>How did you hear about us?
            <select id="ec-referral">
              <option value="">—</option>
              ${REFERRAL_OPTIONS.map((r) => `<option value="${r}" ${client.referral === r ? 'selected' : ''}>${r}</option>`).join('')}
            </select>
          </label>
        </div>
        <label>Notes<textarea id="ec-notes" rows="2">${escapeHtml(client.notes || '')}</textarea></label>
        <div class="modal-actions">
          <button class="btn" id="ec-cancel">Cancel</button>
          <button class="btn btn-primary" id="ec-save">Save</button>
        </div>
        <p id="ec-error" class="error-text" hidden></p>
      </div>
    </div>
  `;

  document.getElementById('ec-cancel').addEventListener('click', () => (wrap.innerHTML = ''));
  document.getElementById('ec-save').addEventListener('click', async () => {
    const body = {
      phoneCode: document.getElementById('ec-phoneCode').value,
      phone: document.getElementById('ec-phone').value,
      phone2Code: document.getElementById('ec-phone2Code').value,
      phone2: document.getElementById('ec-phone2').value,
      firstName: document.getElementById('ec-firstName').value,
      secondName: document.getElementById('ec-secondName').value,
      lastName: document.getElementById('ec-lastName').value,
      email: document.getElementById('ec-email').value,
      company: document.getElementById('ec-company').value,
      referral: document.getElementById('ec-referral').value,
      notes: document.getElementById('ec-notes').value,
    };
    try {
      await api.put(`/clients/${client.id}`, body);
      wrap.innerHTML = '';
      onSaved();
    } catch (err) {
      const e = document.getElementById('ec-error');
      e.textContent = err.message;
      e.hidden = false;
    }
  });
}
