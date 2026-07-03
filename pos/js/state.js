// js/state.js — current signed-in staff, kept in memory + localStorage
export const state = { staff: null };

export function loadStaffFromStorage() {
  const raw = localStorage.getItem('karel_staff');
  if (raw) {
    try {
      state.staff = JSON.parse(raw);
    } catch {
      state.staff = null;
    }
  }
}

export function setStaff(staff) {
  state.staff = staff;
  localStorage.setItem('karel_staff', JSON.stringify(staff));
}

export function clearStaff() {
  state.staff = null;
  localStorage.removeItem('karel_staff');
}

export function hasRole(...roles) {
  return !!state.staff && roles.includes(state.staff.role);
}
