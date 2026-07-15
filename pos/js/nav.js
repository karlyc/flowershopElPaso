// js/nav.js — sidebar structure, gated by role per the spec's permissions table
export const NAV = [
  { group: null, items: [
    { path: '/dashboard', label: 'Dashboard', icon: '▦', roles: ['ADMIN', 'OFFICE'] },
    { path: '/orders/new', label: 'Create Order', icon: '✎', roles: ['ADMIN', 'OFFICE'] },
    { path: '/orders', label: 'Orders', icon: '▤', roles: ['ADMIN', 'OFFICE'] },
    { path: '/customers', label: 'Customers', icon: '♥', roles: ['ADMIN', 'OFFICE'] },
  ]},
  { group: 'Operations', items: [
    { path: '/making-arrangements', label: 'Making Arrangements', icon: '❀', roles: ['ADMIN', 'OFFICE', 'FLORIST', 'DRIVER'] },
    { path: '/deliveries', label: 'Deliveries', icon: '➤', roles: ['ADMIN', 'OFFICE', 'FLORIST', 'DRIVER'] },
    { path: '/tasks', label: 'Tasks', icon: '✓', roles: ['ADMIN', 'OFFICE', 'FLORIST', 'DRIVER'] },
  ]},
  { group: 'Catalog', items: [
    { path: '/categories', label: 'Categories', icon: '❖', roles: ['ADMIN', 'OFFICE'] },
    { path: '/products', label: 'Products', icon: '✿', roles: ['ADMIN', 'OFFICE'] },
    { path: '/add-ons', label: 'Add Ons', icon: '✦', roles: ['ADMIN', 'OFFICE'] },
    { path: '/inventory', label: 'Inventory', icon: '▦', roles: ['ADMIN', 'OFFICE', 'FLORIST', 'DRIVER'] },
    { path: '/zip-codes', label: 'Zip Codes', icon: '⌖', roles: ['ADMIN', 'OFFICE'] },
  ]},
  { group: 'Admin', items: [
    { path: '/admin/payments', label: 'Payments', icon: '$', roles: ['ADMIN'] },
    { path: '/admin/reports', label: 'Reports', icon: '❋', roles: ['ADMIN'] },
    { path: '/admin/expenses', label: 'Expenses', icon: '$', roles: ['ADMIN'] },
    { path: '/admin/settings', label: 'Shop Info', icon: '⚙', roles: ['ADMIN'] },
    { path: '/admin/users', label: 'Users', icon: '♥', roles: ['ADMIN'] },
  ]},
];

export const PAGE_TITLES = Object.fromEntries(
  NAV.flatMap((g) => g.items).map((item) => [item.path.split('/').slice(0, 2).join('/'), item.label])
);
