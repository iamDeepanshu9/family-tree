import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const source = process.argv[2] || 'Family Tree Database & Interactive Template Data - Family_Tree_Data.csv';
const output = process.argv[3] || 'data/family.json';

function parseCsv(text) {
  const rows = []; let row = []; let field = ''; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const headers = rows.shift().map(value => value.replace(/^\uFEFF/, '').trim());
  return rows.filter(values => values.some(Boolean)).map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
}

function year(value) {
  const match = String(value || '').match(/(?:18|19|20)\d{2}/);
  return match ? Number(match[0]) : null;
}

function spouseList(value) {
  return String(value || '').split(/[;,]/).map(name => name.trim()).filter(Boolean).map(name => ({ name }));
}

const records = parseCsv(await readFile(source, 'utf8'));
const siblingOrder = new Map();
await mkdir('img/members', { recursive: true });

const members = [];
for (const record of records) {
  const id = record['Member ID'].trim();
  const parentId = record['Parent ID'].trim() || null;
  const order = (siblingOrder.get(parentId) || 0) + 1;
  siblingOrder.set(parentId, order);
  let photo = null;
  const sourcePhoto = record['Photo URL'].trim();
  const dataPhoto = sourcePhoto.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/s);
  if (dataPhoto) {
    const extension = dataPhoto[1] === 'jpeg' ? 'jpg' : dataPhoto[1];
    const filename = `${id.toLowerCase()}.${extension}`;
    await writeFile(join('img/members', filename), Buffer.from(dataPhoto[2], 'base64'));
    photo = `img/members/${filename}`;
  } else if (/^https?:\/\//.test(sourcePhoto)) photo = sourcePhoto;

  members.push({
    id,
    name: record['Name (English)'].trim(),
    nameHindi: record['Name (Hindi)'].trim() || undefined,
    parentId,
    order,
    branch: record['Family Branch'].trim() || undefined,
    isDeceased: record['Life Status'].trim().toLowerCase() === 'late',
    birthYear: year(record.DOB),
    deathYear: year(record.DOD),
    photo,
    bio: record.Notes.trim(),
    spouses: spouseList(record['Spouse Name'])
  });
}

const family = {
  family: { title: 'Jeev family', titleHindi: 'जीव वंशवृक्ष', rootId: records.find(record => !record['Parent ID'].trim())?.['Member ID'] },
  members
};

await writeFile(output, `${JSON.stringify(family, null, 2)}\n`);
console.log(`Imported ${members.length} members from ${source} into ${output}.`);
