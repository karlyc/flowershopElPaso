// js/views/admin/users.js — spec: "-Admin > Users"
import { api } from '../../api.js';
import { titleCase, escapeHtml } from '../../format.js';

const ROLES = ['ADMIN', 'OFFICE', 'FLORIST', 'DRIVER'];

export async function renderUsers(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>Users</h2>
      <button id="add-btn" class="btn btn-primary">+ Add user</button>
    </div>
    <div id="users-list"></div>
    <div id="user-modal-wrap"></div>
  `;

  async function load() {
    const staff = await api.get('/staff');
    const wrap = document.getElementById('users-list');
    wrap.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Name</th><th>Role</th><th>Status</th><th></th></tr></thead><tbody>
      ${staff
        .map(
          (s) => `<tr>
        <td>${escapeHtml(s.name)}</td>
        <td>${titleCase(s.role)}</td>
        <td>${s.active ? '<span class="badge badge-green">Active</span>' : '<span class="badge badge-gray">Suspended</span>'}</td>
        <td>
          <button class="btn btn-sm" data-edit="${s.id}">Edit</button>
          <button class="btn btn-sm ${s.active ? 'btn-danger' : ''}" data-toggle="${s.id}" data-active="${s.active}">${s.active ? 'Suspend' : 'Restore'}</button>
        </td>
      </tr>`
        )
        .join('')}
    </tbody></table></div>`;

    wrap.querySelectorAll('[data-edit]').forEach((btn) =>
      btn.addEventListener('click', () => openModal(staff.find((s) => s.id === btn.dataset.edit), load))
    );
    wrap.querySelectorAll('[data-toggle]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        await api.patch(`/staff/${btn.dataset.toggle}/active`, { active: btn.dataset.active !== 'true' });
        load();
      })
    );
  }

  document.getElementById('add-btn').addEventListener('click', () => openModal(null, load));
  load();
}

function openModal(user, onSaved) {
  const wrap = document.getElementById('user-modal-wrap');
  wrap.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal">
        <h3>${user ? 'Edit' : 'Add'} user</h3>
        <label>Name *<input id="u-name" value="${escapeHtml(user?.name || '')}" required /></label>
        <label>Role
          <select id="u-role">${ROLES.map((r) => `<option value="${r}" ${user?.role === r ? 'selected' : ''}>${titleCase(r)}</option>`).join('')}</select>
        </label>
        <label>${user ? 'New PIN (leave blank to keep current)' : 'PIN *'}<input id="u-pin" type="password" inputmode="numeric" ${user ? '' : 'required'} /></label>
        <div class="modal-actions">
          <button class="btn" id="u-cancel">Cancel</button>
          <button class="btn btn-primary" id="u-save">Save</button>
        </div>
        <p id="u-error" class="error-text" hidden></p>
      </div>
    </div>
  `;
  document.getElementById('u-cancel').addEventListener('click', () => (wrap.innerHTML = ''));
  document.getElementById('u-save').addEventListener('click', async () => {
    const name = document.getElementById('u-name').value;
    const role = document.getElementById('u-role').value;
    const pin = document.getElementById('u-pin').value;
    if (!name || (!user && !pin)) return;

    try {
      if (user) await api.put(`/staff/${user.id}`, { name, role, pin: pin || undefined });
      else await api.post('/staff', { name, role, pin });
      wrap.innerHTML = '';
      onSaved();
    } catch (err) {
      const e = document.getElementById('u-error');
      e.textContent = err.message;
      e.hidden = false;
    }
  });
}
