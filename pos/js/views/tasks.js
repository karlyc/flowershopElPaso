// js/views/tasks.js
import { api } from '../api.js';
import { dateShort, titleCase, escapeHtml } from '../format.js';

export async function renderTasks(container) {
  const [staffList] = await Promise.all([api.get('/staff')]);

  container.innerHTML = `
    <div class="page-header">
      <h2>Tasks</h2>
      <button id="add-task-btn" class="btn btn-primary">+ Add task</button>
    </div>
    <div class="card">
      <h3>Pending tasks</h3>
      <div id="pending-tasks"></div>
    </div>
    <div class="card">
      <h3>Completed tasks</h3>
      <div id="completed-tasks"></div>
    </div>
    <div id="task-modal-wrap"></div>
  `;

  async function load() {
    const [pending, completed] = await Promise.all([api.get('/tasks?completed=false'), api.get('/tasks?completed=true')]);
    renderList('pending-tasks', pending, true);
    renderList('completed-tasks', completed, false);
  }

  function renderList(id, tasks, showComplete) {
    const wrap = document.getElementById(id);
    if (!tasks.length) {
      wrap.innerHTML = '<p class="empty-state">Nothing here.</p>';
      return;
    }
    wrap.innerHTML = `<table><thead><tr><th>Task</th><th>Frequency</th><th>Due</th><th>Assigned</th><th></th></tr></thead><tbody>
      ${tasks
        .map(
          (t) => `<tr>
        <td>${escapeHtml(t.description)}</td>
        <td>${titleCase(t.frequency)}</td>
        <td>${dateShort(t.dueDate)}</td>
        <td>${escapeHtml(t.assignedTo?.name || '—')}</td>
        <td>${showComplete ? `<button class="btn btn-sm" data-complete="${t.id}">Mark done</button>` : ''}</td>
      </tr>`
        )
        .join('')}
    </tbody></table>`;

    wrap.querySelectorAll('[data-complete]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        await api.patch(`/tasks/${btn.dataset.complete}/complete`, {});
        load();
      })
    );
  }

  document.getElementById('add-task-btn').addEventListener('click', () => openTaskModal(staffList, load));

  load();
}

function openTaskModal(staffList, onSaved) {
  const wrap = document.getElementById('task-modal-wrap');
  wrap.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal">
        <h3>Add task</h3>
        <label>Task<input id="t-description" required /></label>
        <label>Frequency
          <select id="t-frequency">
            <option value="ONE_TIME">One time</option>
            <option value="MONTHLY">Monthly</option>
            <option value="YEARLY">Yearly</option>
          </select>
        </label>
        <label>Due date<input id="t-dueDate" type="date" /></label>
        <label>Send to
          <select id="t-assignedToId">
            <option value="">— Unassigned —</option>
            ${staffList.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}
          </select>
        </label>
        <div class="modal-actions">
          <button class="btn" id="t-cancel">Cancel</button>
          <button class="btn btn-primary" id="t-save">Save</button>
        </div>
        <p id="t-error" class="error-text" hidden></p>
      </div>
    </div>
  `;
  document.getElementById('t-cancel').addEventListener('click', () => (wrap.innerHTML = ''));
  document.getElementById('t-save').addEventListener('click', async () => {
    const description = document.getElementById('t-description').value;
    if (!description) return;
    try {
      await api.post('/tasks', {
        description,
        frequency: document.getElementById('t-frequency').value,
        dueDate: document.getElementById('t-dueDate').value || undefined,
        assignedToId: document.getElementById('t-assignedToId').value || undefined,
      });
      wrap.innerHTML = '';
      onSaved();
    } catch (err) {
      const e = document.getElementById('t-error');
      e.textContent = err.message;
      e.hidden = false;
    }
  });
}
