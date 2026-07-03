// js/views/admin/expenses.js
import { api } from '../../api.js';
import { money, dateShort, titleCase, escapeHtml } from '../../format.js';

const CATEGORIES = ['BILLS', 'PAYROLL', 'RENT', 'FLOWERS', 'MAINTENANCE', 'MARKETING', 'MISC', 'OTHER'];
const FREQUENCIES = ['ONE_TIME', 'WEEKLY', 'MONTHLY', 'YEARLY'];

export async function renderExpenses(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>Expenses</h2>
      <button id="add-btn" class="btn btn-primary">+ Add expense</button>
    </div>
    <div id="expenses-list"></div>
    <div id="expense-modal-wrap"></div>
  `;

  async function load() {
    const expenditures = await api.get('/expenditures');
    const wrap = document.getElementById('expenses-list');
    if (!expenditures.length) {
      wrap.innerHTML = '<p class="empty-state">No expenses recorded.</p>';
      return;
    }
    wrap.innerHTML = `<div class="table-wrap"><table><thead><tr>
      <th>Name</th><th>Category</th><th>Frequency</th><th>Date</th><th>Amount</th><th></th>
    </tr></thead><tbody>
      ${expenditures
        .map(
          (e) => `<tr>
        <td>${escapeHtml(e.name)}</td>
        <td>${titleCase(e.category)}</td>
        <td>${titleCase(e.frequency)}</td>
        <td>${dateShort(e.date)}</td>
        <td>${money(e.amount)}</td>
        <td><button class="btn btn-sm btn-danger" data-delete="${e.id}">Delete</button></td>
      </tr>`
        )
        .join('')}
    </tbody></table></div>`;

    wrap.querySelectorAll('[data-delete]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this expense?')) return;
        await api.del(`/expenditures/${btn.dataset.delete}`);
        load();
      })
    );
  }

  document.getElementById('add-btn').addEventListener('click', () => {
    const wrap = document.getElementById('expense-modal-wrap');
    wrap.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal">
          <h3>Add expense</h3>
          <label>Name *<input id="e-name" required /></label>
          <div class="grid-2">
            <label>Category<select id="e-category">${CATEGORIES.map((c) => `<option value="${c}">${titleCase(c)}</option>`).join('')}</select></label>
            <label>Frequency<select id="e-frequency">${FREQUENCIES.map((f) => `<option value="${f}">${titleCase(f)}</option>`).join('')}</select></label>
            <label>Amount *<input id="e-amount" type="number" step="0.01" required /></label>
            <label>Date<input id="e-date" type="date" value="${new Date().toISOString().slice(0, 10)}" /></label>
          </div>
          <label>Description<textarea id="e-description" rows="2"></textarea></label>
          <div class="modal-actions">
            <button class="btn" id="e-cancel">Cancel</button>
            <button class="btn btn-primary" id="e-save">Save</button>
          </div>
          <p id="e-error" class="error-text" hidden></p>
        </div>
      </div>
    `;
    document.getElementById('e-cancel').addEventListener('click', () => (wrap.innerHTML = ''));
    document.getElementById('e-save').addEventListener('click', async () => {
      const name = document.getElementById('e-name').value;
      const amount = document.getElementById('e-amount').value;
      if (!name || !amount) return;
      try {
        await api.post('/expenditures', {
          name,
          amount: Number(amount),
          category: document.getElementById('e-category').value,
          frequency: document.getElementById('e-frequency').value,
          date: document.getElementById('e-date').value,
          description: document.getElementById('e-description').value,
        });
        wrap.innerHTML = '';
        load();
      } catch (err) {
        const el = document.getElementById('e-error');
        el.textContent = err.message;
        el.hidden = false;
      }
    });
  });

  load();
}
