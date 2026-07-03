// js/nav.js — sidebar structure, gated by role per the spec's permissions table
export const NAV = [
  { group: null, items: [
    { path: '/dashboard', label: 'Dashboard', roles: ['ADMIN', 'OFFICE'] },
    { path: '/orders/new', label: 'Create Order', roles: ['ADMIN', 'OFFICE'] },
    { path: '/orders', label: 'Orders', roles: ['ADMIN', 'OFFICE'] },
    { path: '/customers', label: 'Customers', roles: ['ADMIN', 'OFFICE'] },
  ]},
  { group: 'Operations', items: [
    { path: '/making-arrangements', label: 'Making Arrangements', roles: ['ADMIN', 'OFFICE', 'FLORIST', 'DRIVER'] },
    { path: '/deliveries', label: 'Deliveries', roles: ['ADMIN', 'OFFICE', 'FLORIST', 'DRIVER'] },
    { path: '/tasks', label: 'Tasks', roles: ['ADMIN', 'OFFICE', 'FLORIST', 'DRIVER'] },
  ]},
  { group: 'Catalog', items: [
    { path: '/categories', label: 'Categories', roles: ['ADMIN', 'OFFICE'] },
    { path: '/products', label: 'Products', roles: ['ADMIN', 'OFFICE'] },
    { path: '/inventory', label: 'Inventory', roles: ['ADMIN', 'OFFICE', 'FLORIST', 'DRIVER'] },
    { path: '/zip-codes', label: 'Zip Codes', roles: ['ADMIN', 'OFFICE'] },
  ]},
  { group: 'Admin', items: [
    { path: '/admin/payments', label: 'Payments', roles: ['ADMIN'] },
    { path: '/admin/reports', label: 'Reports', roles: ['ADMIN'] },
    { path: '/admin/expenses', label: 'Expenses', roles: ['ADMIN'] },
    { path: '/admin/settings', label: 'Shop Info', roles: ['ADMIN'] },
    { path: '/admin/users', label: 'Users', roles: ['ADMIN'] },
  ]},
];

export const PAGE_TITLES = Object.fromEntries(
  NAV.flatMap((g) => g.items).map((item) => [item.path.split('/').slice(0, 2).join('/'), item.label])
);
