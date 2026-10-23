export function readRoute() {
  const raw = location.hash.slice(1) || '/home';
  const [path, queryString = ''] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  return { page: parts[0] || 'home', id: parts[1] ? decodeURIComponent(parts[1]) : null, query: new URLSearchParams(queryString) };
}
export function go(path) { location.hash = path.startsWith('#') ? path.slice(1) : path; }
