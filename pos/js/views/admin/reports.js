// js/views/admin/reports.js
import { api } from '../../api.js';
import { money, titleCase } from '../../format.js';

export async function renderReports(container) {
  const now = new Date();
  container.innerHTML = `
    <div class="page-header"><h2>Reports</h2></div>

    <div class="card">
      <h3>Daily</h3>
      <div class="toolbar"><input id="daily-date" type="date" value="${now.toISOString().slice(0, 10)}" /></div>
      <div id="daily-report" class="kpi-row"></div>
    </div>

    <div class="card">
      <h3>Monthly</h3>
      <div class="toolbar">
        <select id="month-select">${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}" ${i + 1 === now.getMonth() + 1 ? 'selected' : ''}>${new Date(2000, i).toLocaleString('en', { month: 'long' })}</option>`).join('')}</select>
        <input id="year-select" type="number" value="${now.getFullYear()}" style="width:100px;" />
      </div>
      <div id="monthly-report"></div>
    </div>
  `;

  async function loadDaily() {
    const date = document.getElementById('daily-date').value;
    const r = await api.get(`/reports/daily?date=${date}`);
    document.getElementById('daily-report').innerHTML = `
      <div class="kpi"><div class="kpi-label">Orders</div><div class="kpi-value">${r.orderCount}</div></div>
      <div class="kpi"><div class="kpi-label">Total</div><div class="kpi-value">${money(r.total)}</div></div>
    `;
  }

  async function loadMonthly() {
    const month = document.getElementById('month-select').value;
    const year = document.getElementById('year-select').value;
    const r = await api.get(`/reports/monthly?year=${year}&month=${month}`);
    document.getElementById('monthly-report').innerHTML = `
      <div class="kpi-row">
        <div class="kpi"><div class="kpi-label">Total sales</div><div class="kpi-value">${money(r.totalSales)}</div></div>
        <div class="kpi"><div class="kpi-label">Total tax</div><div class="kpi-value">${money(r.totalTax)}</div></div>
        <div class="kpi"><div class="kpi-label">New clients</div><div class="kpi-value">${r.newClientCount}</div></div>
        <div class="kpi"><div class="kpi-label">Orders (mo. vs last)</div><div class="kpi-value">${r.orderCountThisMonth} / ${r.orderCountLastMonth}</div></div>
        <div class="kpi"><div class="kpi-label">Monthly expenses</div><div class="kpi-value">${money(r.monthlyExpenses)}</div></div>
        <div class="kpi"><div class="kpi-label">Net profit margin</div><div class="kpi-value">${(r.netProfitMargin * 100).toFixed(1)}%</div></div>
        <div class="kpi"><div class="kpi-label">Operating margin</div><div class="kpi-value">${(r.operatingProfitMargin * 100).toFixed(1)}%</div></div>
      </div>
      <div class="grid-2">
        <div>
          <h3>By payment method (pre-tax)</h3>
          <table><tbody>
            ${Object.entries(r.byPaymentMethod)
              .map(([method, amount]) => `<tr><td>${titleCase(method)}</td><td>${money(amount)}</td></tr>`)
              .join('') || '<tr><td class="empty-state">No data</td></tr>'}
          </tbody></table>
        </div>
        <div>
          <h3>Top 3 products</h3>
          <table><tbody>
            ${r.topProducts.map((p) => `<tr><td>${p.name}</td><td>${p.quantity}</td></tr>`).join('') || '<tr><td class="empty-state">No data</td></tr>'}
          </tbody></table>
        </div>
      </div>
    `;
  }

  document.getElementById('daily-date').addEventListener('change', loadDaily);
  document.getElementById('month-select').addEventListener('change', loadMonthly);
  document.getElementById('year-select').addEventListener('change', loadMonthly);

  loadDaily();
  loadMonthly();
}
