// js/views/dashboard.js
import { api } from '../api.js';
import { money, dateShort, dateTimeShort, titleCase, escapeHtml } from '../format.js';

export async function renderDashboard(container) {
  container.innerHTML = '<div class="empty-state">Loading dashboard…</div>';
  const data = await api.get('/dashboard');

  container.innerHTML = `
    <div class="page-header"><h2>Dashboard</h2></div>
    <div class="kpi-row">
      <div class="kpi"><div class="kpi-label">Today's Sales</div><div class="kpi-value">${money(data.salesToday)}</div></div>
      <div class="kpi"><div class="kpi-label">Orders Today</div><div class="kpi-value">${data.orderCountToday}</div></div>
      <div class="kpi"><div class="kpi-label">To Arrange</div><div class="kpi-value">${data.toArrangeCount}</div></div>
      <div class="kpi"><div class="kpi-label">Out for Delivery</div><div class="kpi-value">${data.outForDeliveryCount}</div></div>
    </div>
    <div class="dashboard-cols">
      <div>
        <div class="card">
          <h3>Today's Deliveries</h3>
          ${deliveryList(data.todayDeliveries)}
        </div>
        <div class="card">
          <h3>Tomorrow's Deliveries</h3>
          ${deliveryList(data.tomorrowDeliveries)}
        </div>
        <div class="card">
          <h3>Pending Payments</h3>
          ${pendingPaymentsList(data.pendingPayments)}
        </div>
      </div>
      <div>
        <div class="card">
          <h3>Tasks</h3>
          ${taskList(data.tasks)}
        </div>
        <div class="card">
          <h3>Reminders</h3>
          <p style="color:var(--text-muted);font-size:0.8rem;margin-top:-0.5rem;">Birthday / anniversary clients whose anniversary is in 2 days</p>
          ${reminderList(data.reminders)}
        </div>
      </div>
    </div>
  `;
}

function deliveryList(orders) {
  if (!orders?.length) return '<p class="empty-state">Nothing scheduled.</p>';
  return `<table><thead><tr><th>Order #</th><th>Customer</th><th>Recipient</th><th>Product</th><th>Time</th></tr></thead><tbody>
    ${orders
      .map(
        (o) => `<tr>
          <td><a href="#/orders/${o.id}">${escapeHtml(o.orderNumber)}</a></td>
          <td>${escapeHtml(o.client?.firstName)} ${escapeHtml(o.client?.lastName)}</td>
          <td>${escapeHtml(o.recipientName || '—')}</td>
          <td>${escapeHtml(o.items?.[0]?.product?.name || o.items?.[0]?.customName || '—')}</td>
          <td>${escapeHtml(o.deliveryTimeType)} ${escapeHtml(o.deliveryTime)}</td>
        </tr>`
      )
      .join('')}
  </tbody></table>`;
}

function taskList(tasks) {
  if (!tasks?.length) return '<p class="empty-state">No open tasks.</p>';
  return `<table><thead><tr><th>Task</th><th>Due</th><th>Assigned</th></tr></thead><tbody>
    ${tasks
      .map(
        (t) => `<tr>
          <td>${escapeHtml(t.description)}</td>
          <td>${dateShort(t.dueDate)}</td>
          <td>${escapeHtml(t.assignedTo?.name || '—')}</td>
        </tr>`
      )
      .join('')}
  </tbody></table>`;
}

function reminderList(orders) {
  if (!orders?.length) return '<p class="empty-state">No reminders today.</p>';
  return `<table><thead><tr><th>Customer</th><th>Recipient</th><th>Product</th><th>Last delivered</th></tr></thead><tbody>
    ${orders
      .map(
        (o) => `<tr>
          <td><a href="#/customers/${o.client?.id}">${escapeHtml(o.client?.firstName)} ${escapeHtml(o.client?.lastName)}</a></td>
          <td>${escapeHtml(o.recipientName || '—')}</td>
          <td>${escapeHtml(o.items?.[0]?.product?.name || '—')}</td>
          <td>${dateShort(o.deliveryDate)}</td>
        </tr>`
      )
      .join('')}
  </tbody></table>`;
}

function pendingPaymentsList(orders) {
  if (!orders?.length) return '<p class="empty-state">All caught up.</p>';
  return `<table><thead><tr><th>Order #</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead><tbody>
    ${orders
      .map(
        (o) => `<tr>
          <td><a href="#/orders/${o.id}">${escapeHtml(o.orderNumber)}</a></td>
          <td>${escapeHtml(o.client?.firstName)} ${escapeHtml(o.client?.lastName)}</td>
          <td>${money(o.total)}</td>
          <td><span class="badge badge-amber">${titleCase(o.paymentStatus)}</span></td>
        </tr>`
      )
      .join('')}
  </tbody></table>`;
}
