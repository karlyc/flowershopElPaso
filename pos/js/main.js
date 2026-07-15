// js/main.js — app bootstrap: login flow, sidebar, router wiring
import { api, setToken, clearToken, getToken } from './api.js';
import { state, loadStaffFromStorage, setStaff, clearStaff } from './state.js';
import { route, resolve, navigate } from './router.js';
import { NAV } from './nav.js';

import { renderDashboard } from './views/dashboard.js';
import { renderOrderForm } from './views/orderForm.js';
import { renderOrderList, renderOrderDetail } from './views/orders.js';
import { renderCustomerList, renderCustomerDetail } from './views/customers.js';
import { renderMakingArrangements } from './views/makingArrangements.js';
import { renderDeliveries } from './views/deliveries.js';
import { renderTasks } from './views/tasks.js';
import { renderCategories } from './views/categories.js';
import { renderProducts } from './views/products.js';
import { renderAddOns } from './views/addOns.js';
import { renderInventory } from './views/inventory.js';
import { renderZipCodes } from './views/zipCodes.js';
import { renderPayments } from './views/admin/payments.js';
import { renderReports } from './views/admin/reports.js';
import { renderExpenses } from './views/admin/expenses.js';
import { renderShopSettings } from './views/admin/settings.js';
import { renderUsers } from './views/admin/users.js';

const loginScreen = document.getElementById('login-screen');
const appShell = document.getElementById('app-shell');
const sidebar = document.getElementById('sidebar');
const content = document.getElementById('content');
const pageTitle = document.getElementById('page-title');
const staffNameEl = document.getElementById('staff-name');
const staffAvatarEl = document.getElementById('staff-avatar');

route('/dashboard', (c) => renderDashboard(c));
route('/orders/new', (c) => renderOrderForm(c, {}));
route('/orders/:id/edit', (c, p) => renderOrderForm(c, p));
route('/orders/:id', (c, p) => renderOrderDetail(c, p));
route('/orders', (c) => renderOrderList(c));
route('/customers', (c) => renderCustomerList(c));
route('/customers/:id', (c, p) => renderCustomerDetail(c, p));
route('/making-arrangements', (c) => renderMakingArrangements(c));
route('/deliveries', (c) => renderDeliveries(c));
route('/tasks', (c) => renderTasks(c));
route('/categories', (c) => renderCategories(c));
route('/products', (c) => renderProducts(c));
route('/add-ons', (c) => renderAddOns(c));
route('/inventory', (c) => renderInventory(c));
route('/zip-codes', (c) => renderZipCodes(c));
route('/admin/payments', (c) => renderPayments(c));
route('/admin/reports', (c) => renderReports(c));
route('/admin/expenses', (c) => renderExpenses(c));
route('/admin/settings', (c) => renderShopSettings(c));
route('/admin/users', (c) => renderUsers(c));

function renderSidebar() {
  const currentBase = '/' + (location.hash.slice(1).split('/')[1] || 'dashboard');
  sidebar.innerHTML =
    '<div class="brand"><img src="assets/logo-karels.png" alt="" /><span class="glyph">❀</span> Karel\'s Flowers</div>' +
    NAV.map((group) => {
      const visible = group.items.filter((i) => i.roles.includes(state.staff?.role));
      if (!visible.length) return '';
      const heading = group.group ? `<div class="nav-group-label">${group.group}</div>` : '';
      const links = visible
        .map((i) => {
          const active = currentBase === '/' + i.path.split('/')[1] ? ' active' : '';
          return `<a href="#${i.path}" class="nav-link${active}"><span class="nav-icon">${i.icon}</span>${i.label}</a>`;
        })
        .join('');
      return heading + links;
    }).join('');
}

async function renderCurrentRoute() {
  const path = location.hash.slice(1) || '/dashboard';
  if (path === '/login') return; // handled by showLogin()

  renderSidebar();
  const match = await resolve();
  if (!match) {
    content.innerHTML = '<div class="empty-state">Page not found</div>';
    return;
  }
  content.innerHTML = '<div class="empty-state">Loading…</div>';
  try {
    await match.render(content, match.params);
  } catch (err) {
    content.innerHTML = `<div class="empty-state">${err.message || 'Something went wrong'}</div>`;
  }
}

function showApp() {
  loginScreen.hidden = true;
  appShell.hidden = false;
  staffNameEl.textContent = `${state.staff.name} · ${state.staff.role}`;
  staffAvatarEl.textContent = state.staff.name.trim().charAt(0).toUpperCase();
  renderCurrentRoute();
}

function showLogin() {
  appShell.hidden = true;
  loginScreen.hidden = false;
  loadLoginStaffOptions();
}

async function loadLoginStaffOptions() {
  const select = document.getElementById('login-staff');
  const errorEl = document.getElementById('login-error');
  select.innerHTML = '<option>Loading…</option>';
  try {
    const staff = await api.get('/auth/staff');
    select.innerHTML = staff.map((s) => `<option value="${s.id}">${s.name}</option>`).join('');
  } catch (err) {
    select.innerHTML = '<option value="">Could not load staff</option>';
    errorEl.textContent = `Could not reach the API at ${window.KAREL_API_BASE}: ${err.message}`;
    errorEl.hidden = false;
  }
}

window.addEventListener('error', (e) => {
  const errorEl = document.getElementById('login-error');
  if (errorEl) {
    errorEl.textContent = `Script error: ${e.message} (${e.filename}:${e.lineno})`;
    errorEl.hidden = false;
  }
});
window.addEventListener('unhandledrejection', (e) => {
  const errorEl = document.getElementById('login-error');
  if (errorEl) {
    errorEl.textContent = `Unhandled error: ${e.reason?.message || e.reason}`;
    errorEl.hidden = false;
  }
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const staffId = document.getElementById('login-staff').value;
  const pin = document.getElementById('login-pin').value;
  const errorEl = document.getElementById('login-error');
  errorEl.hidden = true;
  try {
    const { token, staff } = await api.post('/auth/login', { staffId, pin });
    setToken(token);
    setStaff(staff);
    navigate('/dashboard');
    showApp();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  clearToken();
  clearStaff();
  navigate('/login');
  showLogin();
});

document.getElementById('menu-toggle').addEventListener('click', () => {
  sidebar.classList.toggle('open');
});

window.addEventListener('hashchange', () => {
  sidebar.classList.remove('open');
  if (state.staff) renderCurrentRoute();
});

loadStaffFromStorage();
if (getToken() && state.staff) {
  showApp();
} else {
  showLogin();
}
