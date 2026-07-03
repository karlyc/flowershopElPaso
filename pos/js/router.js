// js/router.js — minimal hash router with :param support
const routes = [];

export function route(pattern, render) {
  const paramNames = [];
  const regex = new RegExp(
    '^' +
      pattern
        .split('/')
        .map((seg) => {
          if (seg.startsWith(':')) {
            paramNames.push(seg.slice(1));
            return '([^/]+)';
          }
          return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        })
        .join('/') +
      '$'
  );
  routes.push({ regex, paramNames, render });
}

export async function resolve() {
  const path = (location.hash.slice(1) || '/dashboard').split('?')[0];
  for (const r of routes) {
    const match = path.match(r.regex);
    if (match) {
      const params = {};
      r.paramNames.forEach((name, i) => (params[name] = decodeURIComponent(match[i + 1])));
      return { render: r.render, params };
    }
  }
  return null;
}

export function navigate(path) {
  location.hash = path;
}
