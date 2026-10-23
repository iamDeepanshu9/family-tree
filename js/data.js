import { validateFamily } from './validate.js';

export async function loadFamily(url = './data/family.json') {
  let response;
  try { response = await fetch(url, { cache: 'no-cache' }); }
  catch { throw new Error('The family file could not be opened. Run this site through a local web server, not by double-clicking index.html.'); }
  if (!response.ok) throw new Error(`The family file could not be loaded (HTTP ${response.status}).`);
  let raw;
  try { raw = await response.json(); }
  catch { throw new Error('family.json is not valid JSON. Check commas, quotation marks, and brackets.'); }
  const result = validateFamily(raw);
  if (result.errors.length) {
    const error = new Error('The family file needs attention.');
    error.details = result.errors;
    throw error;
  }
  return { data: result.value, warnings: result.warnings };
}
