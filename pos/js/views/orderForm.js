// js/views/orderForm.js — Create Order / Edit Order (spec: "-Create Order")
import { api } from '../api.js';
import { money, escapeHtml } from '../format.js';
import { countryCodeOptions } from '../countries.js';

const ADDON_GROUPS = [
  ['BANNER', 'Banner'],
  ['BALLOONS', 'Balloons'],
  ['TEDDY_BEAR', 'Teddy Bears'],
  ['CHOCOLATES', 'Chocolates'],
];

let items = [];
let addOns = [];
let availableAddOns = [];
let selectedClient = null;
let taxRate = 1.0825;
let zipCodes = [];
let pinVerified = false;

export async function renderOrderForm(container, params) {
  const isEdit = !!params.id;
  const [zips, settings, staffList, catalogAddOns, order] = await Promise.all([
    api.get('/zip-codes?active=true'),
    api.get('/settings'),
    api.get('/staff'),
    api.get('/add-ons'),
    isEdit ? api.get(`/orders/${params.id}`) : Promise.resolve(null),
  ]);

  zipCodes = zips;
  availableAddOns = catalogAddOns;
  taxRate = Number(settings.taxRate) || 1.0825;
  selectedClient = order?.client || null;
  items = order
    ? order.items.map((i) => ({
        productId: i.productId,
        name: i.product?.name || i.customName,
        unitPrice: Number(i.unitPrice),
        quantity: i.quantity,
        notes: i.notes || '',
      }))
    : [];
  addOns = order
    ? order.addOns.map((a) => ({
        addOnId: a.addOnId,
        kind: a.kind,
        name: a.name,
        unitPrice: Number(a.unitPrice),
        quantity: a.quantity,
        bannerColor: a.bannerColor || '',
        bannerMessage: a.bannerMessage || '',
        balloonOccasion: a.balloonOccasion || '',
      }))
    : [];
  pinVerified = false;

  container.innerHTML = `
    <div class="page-header order-form-header">
      <div>
        <h2>${isEdit ? `Edit Order ${escapeHtml(order.orderNumber)}` : 'Create Order'}</h2>
        <p class="page-subtitle">${isEdit ? escapeHtml(order.orderNumber) : 'New order · number assigned on save'}</p>
      </div>
      <div class="toolbar no-print">
        <span id="save-order-error" class="error-text"></span>
        <button type="button" id="cancel-order-btn" class="btn">Cancel</button>
        <button type="button" id="save-order-btn" class="btn btn-primary">${isEdit ? 'Save changes' : 'Save order'}</button>
      </div>
    </div>

    <div class="order-form-cols">
      <div class="order-form-main">
        <div class="card">
          <h3>Delivery Date &amp; Time</h3>
          <div class="grid-2">
            <label>Delivery date *<input id="deliveryDate" type="date" required /></label>
            <label>Delivery time *
              <div style="display:flex;gap:0.4rem;">
                <select id="deliveryTimeType" style="width:auto;">
                  <option value="AT">At</option>
                  <option value="BEFORE">Before</option>
                  <option value="AFTER">After</option>
                </select>
                <input id="deliveryTime" placeholder="2:30 PM" required />
              </div>
            </label>
          </div>
        </div>

        <div class="card">
          <h3>Delivery</h3>
          <div class="radio-group">
            <label><input type="radio" name="deliveryOption" value="HOUSE" checked /> House / apt</label>
            <label><input type="radio" name="deliveryOption" value="BUSINESS" /> Business / work</label>
            <label><input type="radio" name="deliveryOption" value="PICKUP" /> Pickup</label>
          </div>

          <div id="delivery-house-business" class="grid-2">
            <label>Recipient name<input id="recipientName" /></label>
            <label>Recipient phone<input id="recipientPhone" /></label>
            <label>Address<input id="address" /></label>
            <label>Zip code / city
              <select id="zip"><option value="">— custom —</option>${zipCodes
                .map((z) => {
                  const label = z.type === 'CITY' ? `${z.city}${z.state ? ', ' + z.state : ''}` : z.zip;
                  return `<option value="${escapeHtml(label)}" data-price="${z.price}">${escapeHtml(label)} — ${money(z.price)}</option>`;
                })
                .join('')}</select>
            </label>
          </div>
          <div id="delivery-business-only" class="grid-2" hidden>
            <label>Business name<input id="businessName" /></label>
            <label>Recipient dept / position<input id="businessDept" /></label>
          </div>
          <div id="delivery-pickup" class="grid-2" hidden>
            <label class="checkbox-line"><input type="checkbox" id="pickupSelf" /> Customer will pick up</label>
            <label>Name of person picking up<input id="pickupPersonName" /></label>
          </div>
          <label>Delivery notes<textarea id="deliveryNotes" rows="2"></textarea></label>
        </div>

        <div class="card">
          <h3>Products</h3>
          <input id="product-search" placeholder="Search products by code, name, or flower…" autocomplete="off" />
          <div id="product-search-results" class="search-results" hidden></div>
          <button type="button" id="add-custom-item" class="btn btn-sm" style="margin:0.5rem 0;">+ Quick add item</button>
          <div id="items-table"></div>
        </div>

        <div class="card">
          <h3>Occasion &amp; Message</h3>
          <div class="grid-2">
            <label>Occasion
              <select id="occasion">
                <option value="BIRTHDAY">Birthday</option>
                <option value="ANNIVERSARY">Anniversary</option>
                <option value="FUNERAL">Funeral</option>
                <option value="GRADUATION">Graduation</option>
                <option value="LOVE">Love</option>
                <option value="OTHER" selected>Other</option>
              </select>
            </label>
          </div>
          <label>Message<textarea id="messageText" rows="2"></textarea></label>
          <div class="grid-2">
            <label>Signature<input id="messageFrom" /></label>
            <label class="checkbox-line" style="margin-top:1.6rem;"><input type="checkbox" id="messageAnon" /> Anonymous</label>
          </div>
        </div>

        <div class="card">
          <h3>Add Ons</h3>
          <div id="addon-catalog"></div>
          <div id="addons-table" style="margin-top:0.75rem;"></div>
        </div>
      </div>

      <div class="order-form-side">
        <div class="card">
          <h3>Customer</h3>
          <input id="client-search" placeholder="Search by phone or name…" autocomplete="off"
            value="${selectedClient ? escapeHtml(`${selectedClient.firstName} ${selectedClient.lastName} — ${selectedClient.phoneCode} ${selectedClient.phone}`) : ''}" />
          <div id="client-search-results" class="search-results" hidden></div>
          <button type="button" id="toggle-new-client" class="btn btn-sm" style="margin-top:0.5rem;">+ New customer</button>
        </div>

        <div class="card">
          <h3>Payment</h3>
          <div class="grid-2">
            <label>Payment type
              <select id="paymentType">
                <option value="CARD">Card</option>
                <option value="CASH">Cash</option>
                <option value="CHECK">Check</option>
                <option value="ZELLE">Zelle</option>
                <option value="CASHAPP">Cashapp</option>
              </select>
            </label>
            <label class="checkbox-line" style="margin-top:1.6rem;"><input type="checkbox" id="taxExempt" /> Tax exempt</label>
          </div>
          <label>Delivery fee<input id="deliveryFee" type="number" step="0.01" value="0" /></label>
          <div id="totals-preview" style="margin-top:1rem;padding-top:0.75rem;border-top:1px solid var(--border-hairline);"></div>
          <label>Notify customer via
            <select id="notifyVia">
              <option value="NONE">No notification</option>
              <option value="EMAIL">Email</option>
              <option value="WHATSAPP">WhatsApp</option>
            </select>
          </label>
        </div>

        <div class="card">
          <h3>Assisted by</h3>
          <p class="page-subtitle" style="margin-bottom:0.75rem;">PIN must be verified before the order can be saved.</p>
          <div class="grid-2">
            <label>Staff
              <select id="assistedById">${staffList.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}</select>
            </label>
            <label>PIN
              <div style="display:flex;gap:0.4rem;">
                <input id="assistedPin" type="password" inputmode="numeric" />
                <button type="button" id="verify-pin-btn" class="btn btn-sm">Verify</button>
              </div>
            </label>
          </div>
          <span id="pin-status" style="font-size:0.8rem;"></span>
        </div>
      </div>
    </div>

    <div id="receipt-wrap"></div>
    <div id="quick-add-modal-wrap"></div>
    <div id="new-client-modal-wrap"></div>
  `;

  if (order) {
    document.getElementById('occasion').value = order.occasion;
    document.getElementById('messageText').value = order.messageText || '';
    document.getElementById('messageFrom').value = order.messageFrom || '';
    document.getElementById('messageAnon').checked = order.messageAnon;
    document.querySelector(`input[name="deliveryOption"][value="${order.deliveryOption}"]`).checked = true;
    document.getElementById('recipientName').value = order.recipientName || '';
    document.getElementById('recipientPhone').value = order.recipientPhone || '';
    document.getElementById('address').value = order.address || '';
    document.getElementById('zip').value = order.zip || '';
    document.getElementById('businessName').value = order.businessName || '';
    document.getElementById('businessDept').value = order.businessDept || '';
    document.getElementById('pickupSelf').checked = order.pickupSelf;
    document.getElementById('pickupPersonName').value = order.pickupPersonName || '';
    document.getElementById('deliveryNotes').value = order.deliveryNotes || '';
    document.getElementById('deliveryDate').value = order.deliveryDate.slice(0, 10);
    document.getElementById('deliveryTimeType').value = order.deliveryTimeType;
    document.getElementById('deliveryTime').value = order.deliveryTime;
    document.getElementById('paymentType').value = order.paymentType || 'CARD';
    document.getElementById('deliveryFee').value = order.deliveryFee;
    document.getElementById('taxExempt').checked = order.taxExempt;
    document.getElementById('notifyVia').value = order.notifyVia;
    if (order.assistedById) document.getElementById('assistedById').value = order.assistedById;
  }

  toggleDeliveryFields();
  toggleAnonymous();
  renderItemsTable();
  renderAddOnCatalog();
  renderAddOnsTable();
  wireEvents(isEdit, params.id);
}

function toggleDeliveryFields() {
  const option = document.querySelector('input[name="deliveryOption"]:checked').value;
  document.getElementById('delivery-house-business').hidden = option === 'PICKUP';
  document.getElementById('delivery-business-only').hidden = option !== 'BUSINESS';
  document.getElementById('delivery-pickup').hidden = option !== 'PICKUP';
}

function toggleAnonymous() {
  const anon = document.getElementById('messageAnon').checked;
  const fromInput = document.getElementById('messageFrom');
  fromInput.disabled = anon;
  if (anon) fromInput.value = '';
}

function renderItemsTable() {
  const wrap = document.getElementById('items-table');
  if (!items.length) {
    wrap.innerHTML = '<p class="empty-state">No products added yet.</p>';
  } else {
    wrap.innerHTML = items
      .map(
        (item, i) => `
      <div class="order-line-item">
        <div class="line-item-row" style="grid-template-columns:2fr 70px 90px 40px;">
          <span>${escapeHtml(item.name)}</span>
          <input type="number" min="1" value="${item.quantity}" data-idx="${i}" data-field="quantity" />
          <input type="number" step="0.01" value="${item.unitPrice}" data-idx="${i}" data-field="unitPrice" />
          <button type="button" class="btn btn-sm btn-danger" data-remove="${i}">✕</button>
        </div>
        <textarea class="line-item-notes" placeholder="Notes for the florist (specifications)…" data-idx="${i}" data-field="notes">${escapeHtml(item.notes)}</textarea>
      </div>`
      )
      .join('');
  }
  updateTotalsPreview();
}

function openQuickAddModal() {
  const wrap = document.getElementById('quick-add-modal-wrap');
  wrap.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal">
        <h3>Quick add item</h3>
        <label>Item name *<input id="qa-name" required /></label>
        <label>Price *<input id="qa-price" type="number" step="0.01" required /></label>
        <div class="modal-actions">
          <button type="button" class="btn" id="qa-cancel">Cancel</button>
          <button type="button" class="btn btn-primary" id="qa-save">Add item</button>
        </div>
        <p id="qa-error" class="error-text" hidden></p>
      </div>
    </div>
  `;
  document.getElementById('qa-name').focus();
  document.getElementById('qa-cancel').addEventListener('click', () => (wrap.innerHTML = ''));
  document.getElementById('qa-save').addEventListener('click', () => {
    const name = document.getElementById('qa-name').value.trim();
    const price = Number(document.getElementById('qa-price').value);
    if (!name) {
      const e = document.getElementById('qa-error');
      e.textContent = 'Item name is required.';
      e.hidden = false;
      return;
    }
    items.push({ productId: null, name, unitPrice: price || 0, quantity: 1, notes: '' });
    wrap.innerHTML = '';
    renderItemsTable();
  });
}

function openNewClientModal() {
  const wrap = document.getElementById('new-client-modal-wrap');
  wrap.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal" style="max-width:640px;">
        <h3>New customer</h3>
        <div class="grid-2">
          <label>Phone *
            <div class="phone-input-row">
              <select id="nc-phoneCode" class="phone-code-select">${countryCodeOptions('+1')}</select>
              <input id="nc-phone" class="phone-input" required />
            </div>
          </label>
          <label>Second phone
            <div class="phone-input-row">
              <select id="nc-phone2Code" class="phone-code-select">${countryCodeOptions('+1')}</select>
              <input id="nc-phone2" class="phone-input" />
            </div>
          </label>
          <label>First name *<input id="nc-firstName" required /></label>
          <label>Second name<input id="nc-secondName" /></label>
          <label>Last name *<input id="nc-lastName" required /></label>
          <label>Email<input id="nc-email" type="email" /></label>
          <label>Company<input id="nc-company" /></label>
          <label>How did you hear about us?
            <select id="nc-referral">
              <option value="">—</option>
              <option value="Recommended by a client">Recommended by a client</option>
              <option value="Google Maps">Google Maps</option>
              <option value="Instagram">Instagram</option>
              <option value="Facebook">Facebook</option>
              <option value="Passing by">Passing by</option>
              <option value="Google">Google</option>
              <option value="Other">Other</option>
            </select>
          </label>
        </div>
        <label>Notes<textarea id="nc-notes" rows="2"></textarea></label>
        <div class="modal-actions">
          <button type="button" class="btn" id="nc-cancel">Cancel</button>
          <button type="button" class="btn btn-primary" id="nc-save">Save customer</button>
        </div>
        <p id="nc-error" class="error-text" hidden></p>
      </div>
    </div>
  `;
  document.getElementById('nc-phone').focus();
  document.getElementById('nc-cancel').addEventListener('click', () => (wrap.innerHTML = ''));
  document.getElementById('nc-save').addEventListener('click', async () => {
    const body = {
      phoneCode: document.getElementById('nc-phoneCode').value,
      phone: document.getElementById('nc-phone').value,
      phone2Code: document.getElementById('nc-phone2Code').value,
      phone2: document.getElementById('nc-phone2').value,
      firstName: document.getElementById('nc-firstName').value,
      secondName: document.getElementById('nc-secondName').value,
      lastName: document.getElementById('nc-lastName').value,
      email: document.getElementById('nc-email').value,
      company: document.getElementById('nc-company').value,
      referral: document.getElementById('nc-referral').value,
      notes: document.getElementById('nc-notes').value,
    };
    try {
      const client = await api.post('/clients', body);
      selectedClient = client;
      document.getElementById('client-search').value = `${client.firstName} ${client.lastName} — ${client.phoneCode} ${client.phone}`;
      wrap.innerHTML = '';
    } catch (err) {
      const e = document.getElementById('nc-error');
      e.textContent = err.message;
      e.hidden = false;
    }
  });
}

function renderAddOnCatalog() {
  const wrap = document.getElementById('addon-catalog');
  const groups = ADDON_GROUPS.map(([kind, label]) => [kind, label, availableAddOns.filter((a) => a.kind === kind)]).filter(
    ([, , entries]) => entries.length
  );
  if (!groups.length) {
    wrap.innerHTML = '<p class="empty-state">No add-ons in the catalog yet.</p>';
    return;
  }
  wrap.innerHTML = groups
    .map(
      ([, label, entries]) => `
    <div class="addon-group">
      <div class="addon-group-label">${escapeHtml(label)}</div>
      ${entries
        .map(
          (a) => `
        <div class="addon-catalog-row">
          <span>${escapeHtml(a.name)}${a.size ? ` — ${escapeHtml(a.size)}` : ''}</span>
          <span>${money(a.price)}</span>
          <button type="button" class="btn btn-sm" data-add-addon="${a.id}">+ Add</button>
        </div>`
        )
        .join('')}
    </div>`
    )
    .join('');
}

function renderAddOnsTable() {
  const wrap = document.getElementById('addons-table');
  if (!addOns.length) {
    wrap.innerHTML = '<p class="empty-state">No add-ons added yet.</p>';
  } else {
    wrap.innerHTML = addOns
      .map((a, i) => {
        const extra =
          a.kind === 'BANNER'
            ? `<div class="grid-2">
                <label>Banner color<input type="text" value="${escapeHtml(a.bannerColor)}" data-idx="${i}" data-field="bannerColor" /></label>
                <label>Banner message<input type="text" value="${escapeHtml(a.bannerMessage)}" data-idx="${i}" data-field="bannerMessage" /></label>
              </div>`
            : a.kind === 'BALLOONS'
              ? `<label>Occasion<input type="text" value="${escapeHtml(a.balloonOccasion)}" data-idx="${i}" data-field="balloonOccasion" /></label>`
              : '';
        return `
      <div class="addon-line-item">
        <div class="line-item-row" style="grid-template-columns:2fr 70px 90px 40px;">
          <span>✓ ${escapeHtml(a.name)}</span>
          <input type="number" min="1" value="${a.quantity}" data-idx="${i}" data-field="quantity" />
          <input type="number" step="0.01" value="${a.unitPrice}" data-idx="${i}" data-field="unitPrice" />
          <button type="button" class="btn btn-sm btn-danger" data-remove-addon="${i}">✕</button>
        </div>
        ${extra}
      </div>`;
      })
      .join('');
  }
  updateTotalsPreview();
}

function updateTotalsPreview() {
  const itemsSubtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const addOnsSubtotal = addOns.reduce((sum, a) => sum + a.unitPrice * a.quantity, 0);
  const subtotal = itemsSubtotal + addOnsSubtotal;
  const fee = Number(document.getElementById('deliveryFee')?.value) || 0;
  const taxExempt = document.getElementById('taxExempt')?.checked;
  const tax = taxExempt ? 0 : (subtotal + fee) * (taxRate - 1);
  const total = subtotal + fee + tax;
  const el = document.getElementById('totals-preview');
  if (el) {
    el.innerHTML = `
      <div class="receipt-row"><span>Subtotal</span><span>${money(subtotal)}</span></div>
      <div class="receipt-row"><span>Delivery fee</span><span>${money(fee)}</span></div>
      <div class="receipt-row"><span>Tax</span><span>${money(tax)}</span></div>
      <div class="receipt-row" style="font-weight:700;"><span>Total</span><span>${money(total)}</span></div>
    `;
  }
}

function wireEvents(isEdit, orderId) {
  // Client search
  let clientSearchTimer;
  document.getElementById('client-search').addEventListener('input', (e) => {
    clearTimeout(clientSearchTimer);
    const q = e.target.value.trim();
    const results = document.getElementById('client-search-results');
    if (!q) {
      results.hidden = true;
      return;
    }
    clientSearchTimer = setTimeout(async () => {
      const clients = await api.get(`/clients?search=${encodeURIComponent(q)}`);
      results.hidden = false;
      results.innerHTML = clients.length
        ? clients
            .map((c) => `<div data-client-id="${c.id}">${escapeHtml(c.firstName)} ${escapeHtml(c.lastName)} — ${escapeHtml(c.phoneCode)} ${escapeHtml(c.phone)}</div>`)
            .join('')
        : '<div style="color:var(--text-muted);">No matches</div>';
    }, 250);
  });

  document.getElementById('client-search-results').addEventListener('click', (e) => {
    const id = e.target.dataset.clientId;
    if (!id) return;
    selectedClient = { id, firstName: e.target.textContent };
    document.getElementById('client-search').value = e.target.textContent;
    document.getElementById('client-search-results').hidden = true;
  });

  document.getElementById('toggle-new-client').addEventListener('click', openNewClientModal);

  // Product search
  let productSearchTimer;
  document.getElementById('product-search').addEventListener('input', (e) => {
    clearTimeout(productSearchTimer);
    const q = e.target.value.trim();
    const results = document.getElementById('product-search-results');
    if (!q) {
      results.hidden = true;
      return;
    }
    productSearchTimer = setTimeout(async () => {
      const products = await api.get(`/products?search=${encodeURIComponent(q)}`);
      results.hidden = false;
      results.innerHTML = products.length
        ? products
            .map((p) => `<div data-product-id="${p.id}" data-name="${escapeHtml(p.name)}" data-price="${p.price}">${escapeHtml(p.code)} — ${escapeHtml(p.name)} (${money(p.price)})</div>`)
            .join('')
        : '<div style="color:var(--text-muted);">No matches</div>';
    }, 250);
  });

  document.getElementById('product-search-results').addEventListener('click', (e) => {
    const id = e.target.dataset.productId;
    if (!id) return;
    items.push({ productId: id, name: e.target.dataset.name, unitPrice: Number(e.target.dataset.price), quantity: 1, notes: '' });
    document.getElementById('product-search').value = '';
    document.getElementById('product-search-results').hidden = true;
    renderItemsTable();
  });

  document.getElementById('add-custom-item').addEventListener('click', openQuickAddModal);

  document.getElementById('items-table').addEventListener('input', (e) => {
    const idx = e.target.dataset.idx;
    const field = e.target.dataset.field;
    if (idx === undefined) return;
    items[idx][field] = field === 'notes' ? e.target.value : Number(e.target.value);
    updateTotalsPreview();
  });

  document.getElementById('items-table').addEventListener('click', (e) => {
    const idx = e.target.dataset.remove;
    if (idx === undefined) return;
    items.splice(Number(idx), 1);
    renderItemsTable();
  });

  document.querySelectorAll('input[name="deliveryOption"]').forEach((r) => r.addEventListener('change', toggleDeliveryFields));
  document.getElementById('messageAnon').addEventListener('change', toggleAnonymous);

  document.getElementById('zip').addEventListener('change', (e) => {
    const opt = e.target.selectedOptions[0];
    if (opt?.dataset.price) document.getElementById('deliveryFee').value = opt.dataset.price;
    updateTotalsPreview();
  });
  document.getElementById('deliveryFee').addEventListener('input', updateTotalsPreview);
  document.getElementById('taxExempt').addEventListener('change', updateTotalsPreview);

  document.getElementById('addon-catalog').addEventListener('click', (e) => {
    const id = e.target.dataset.addAddon;
    if (!id) return;
    const catalogEntry = availableAddOns.find((a) => a.id === id);
    if (!catalogEntry) return;
    addOns.push({
      addOnId: catalogEntry.id,
      kind: catalogEntry.kind,
      name: catalogEntry.name,
      unitPrice: Number(catalogEntry.price),
      quantity: 1,
      bannerColor: '',
      bannerMessage: '',
      balloonOccasion: '',
    });
    renderAddOnsTable();
  });

  document.getElementById('addons-table').addEventListener('input', (e) => {
    const idx = e.target.dataset.idx;
    const field = e.target.dataset.field;
    if (idx === undefined) return;
    const numeric = field === 'quantity' || field === 'unitPrice';
    addOns[idx][field] = numeric ? Number(e.target.value) : e.target.value;
    if (numeric) updateTotalsPreview();
  });

  document.getElementById('addons-table').addEventListener('click', (e) => {
    const idx = e.target.dataset.removeAddon;
    if (idx === undefined) return;
    addOns.splice(Number(idx), 1);
    renderAddOnsTable();
  });

  document.getElementById('assistedById').addEventListener('change', () => {
    pinVerified = false;
    document.getElementById('pin-status').textContent = '';
  });
  document.getElementById('assistedPin').addEventListener('input', () => {
    pinVerified = false;
    document.getElementById('pin-status').textContent = '';
  });

  document.getElementById('verify-pin-btn').addEventListener('click', async () => {
    const staffId = document.getElementById('assistedById').value;
    const pin = document.getElementById('assistedPin').value;
    const statusEl = document.getElementById('pin-status');
    try {
      const { valid } = await api.post(`/staff/${staffId}/verify-pin`, { pin });
      pinVerified = valid;
      statusEl.textContent = valid ? '✓ Verified' : '✗ Incorrect PIN';
      statusEl.style.color = valid ? 'var(--success)' : 'var(--danger)';
    } catch (err) {
      pinVerified = false;
      statusEl.textContent = err.message;
      statusEl.style.color = 'var(--danger)';
    }
  });

  document.getElementById('save-order-btn').addEventListener('click', () => saveOrder(isEdit, orderId));
  document.getElementById('cancel-order-btn').addEventListener('click', () => {
    location.hash = isEdit ? `#/orders/${orderId}` : '#/orders';
  });
}

async function saveOrder(isEdit, orderId) {
  const errorEl = document.getElementById('save-order-error');
  errorEl.textContent = '';

  if (!selectedClient?.id) return (errorEl.textContent = 'Select or create a customer first.');
  if (!items.length) return (errorEl.textContent = 'Add at least one product.');
  if (!pinVerified) return (errorEl.textContent = 'Verify the assisting staff member\'s PIN before saving.');

  const body = {
    clientId: selectedClient.id,
    deliveryDate: document.getElementById('deliveryDate').value,
    deliveryTimeType: document.getElementById('deliveryTimeType').value,
    deliveryTime: document.getElementById('deliveryTime').value,
    occasion: document.getElementById('occasion').value,
    messageText: document.getElementById('messageText').value,
    messageFrom: document.getElementById('messageFrom').value,
    messageAnon: document.getElementById('messageAnon').checked,
    deliveryOption: document.querySelector('input[name="deliveryOption"]:checked').value,
    recipientName: document.getElementById('recipientName').value,
    recipientPhone: document.getElementById('recipientPhone').value,
    address: document.getElementById('address').value,
    zip: document.getElementById('zip').value,
    businessName: document.getElementById('businessName').value,
    businessDept: document.getElementById('businessDept').value,
    deliveryNotes: document.getElementById('deliveryNotes').value,
    pickupSelf: document.getElementById('pickupSelf').checked,
    pickupPersonName: document.getElementById('pickupPersonName').value,
    paymentType: document.getElementById('paymentType').value,
    deliveryFee: Number(document.getElementById('deliveryFee').value) || 0,
    taxExempt: document.getElementById('taxExempt').checked,
    notifyVia: document.getElementById('notifyVia').value,
    assistedById: document.getElementById('assistedById').value,
    items: items.map((i) => ({
      productId: i.productId || undefined,
      customName: i.productId ? undefined : i.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      notes: i.notes,
    })),
    addOns: addOns.map((a) => ({
      addOnId: a.addOnId,
      kind: a.kind,
      name: a.name,
      quantity: a.quantity,
      unitPrice: a.unitPrice,
      bannerColor: a.bannerColor,
      bannerMessage: a.bannerMessage,
      balloonOccasion: a.balloonOccasion,
    })),
  };

  try {
    const order = isEdit ? await api.put(`/orders/${orderId}`, body) : await api.post('/orders', body);
    location.hash = `#/orders/${order.id}`;
  } catch (err) {
    errorEl.textContent = err.message;
  }
}
