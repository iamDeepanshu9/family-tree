import test from 'node:test';
import assert from 'node:assert/strict';
import { createToken, verifyAuth, getAdminCredentials, parseJsonBody } from '../api/_utils.js';
import transliterateHandler from '../api/transliterate.js';
import { verifyPhotoExists, sanitizeFamilyData } from '../api/family.js';

test('creates valid HMAC signed admin token', () => {
  const token = createToken('admin');
  assert.ok(typeof token === 'string');
  assert.ok(token.includes('.'));
});

test('verifies valid admin token via Authorization header', () => {
  const token = createToken('admin');
  const mockReq = {
    headers: {
      'authorization': `Bearer ${token}`
    }
  };
  assert.equal(verifyAuth(mockReq), true);
});

test('verifies valid admin token via Cookie header', () => {
  const token = createToken('admin');
  const mockReq = {
    headers: {
      'cookie': `other_cookie=123; admin_token=${token}; test=abc`
    }
  };
  assert.equal(verifyAuth(mockReq), true);
});

test('rejects tampered or forged token', () => {
  const token = createToken('admin');
  const tamperedToken = token.slice(0, -4) + 'abcd';
  const mockReq = {
    headers: {
      'authorization': `Bearer ${tamperedToken}`
    }
  };
  assert.equal(verifyAuth(mockReq), false);
});

test('rejects missing or empty token', () => {
  assert.equal(verifyAuth({ headers: {} }), false);
  assert.equal(verifyAuth({ headers: { 'authorization': '' } }), false);
});

test('transliterate API handles empty text', async () => {
  let statusCode = 0;
  let jsonResult = null;
  const mockReq = { url: '/api/transliterate?text=', method: 'GET', headers: {} };
  const mockRes = {
    setHeader: () => {},
    status: (code) => { statusCode = code; return mockRes; },
    json: (data) => { jsonResult = data; return mockRes; },
    end: () => {}
  };
  await transliterateHandler(mockReq, mockRes);
  assert.equal(statusCode, 200);
  assert.equal(jsonResult.hindi, '');
});

test('transliterate API normalizes common honorifics', async () => {
  let jsonResult = null;
  const mockReq = { url: '/api/transliterate?text=Late%20Shri%20Ramesh', method: 'GET', headers: {} };
  const mockRes = {
    setHeader: () => {},
    status: () => mockRes,
    json: (data) => { jsonResult = data; return mockRes; },
    end: () => {}
  };
  await transliterateHandler(mockReq, mockRes);
  assert.ok(jsonResult.hindi.includes('स्वर्गीय') || jsonResult.hindi.includes('श्री'));
});

test('verifyPhotoExists validates real files and cloud URLs, and purges missing files', () => {
  // Empty or invalid values
  assert.equal(verifyPhotoExists(null), null);
  assert.equal(verifyPhotoExists(''), null);
  assert.equal(verifyPhotoExists('null'), null);
  assert.equal(verifyPhotoExists('   '), null);

  // Cloud URLs (Vercel Blob) are preserved
  const blobUrl = 'https://abc.public.blob.vercel-storage.com/members/p1-xyz.jpg';
  assert.equal(verifyPhotoExists(blobUrl), blobUrl);

  // Real existing local file is preserved
  assert.equal(verifyPhotoExists('img/members/g1-01.png'), 'img/members/g1-01.png');

  // Any non-existent file path (for any member ID) is normalized to null!
  assert.equal(verifyPhotoExists('img/members/random-ghost-photo.jpg'), null);
  assert.equal(verifyPhotoExists('img/members/g5-99.jpg'), null);
});

test('sanitizeFamilyData purges _index and private runtime fields from data', () => {
  const mockData = {
    family: { title: 'Test' },
    members: [
      {
        id: 'p1',
        name: 'Patriarch',
        _index: 0,
        _runtimeFlag: true,
        photo: null,
        spouses: [
          { name: 'Matriarch', _index: 0, _cacheKey: 123 }
        ]
      }
    ]
  };

  const sanitized = sanitizeFamilyData(mockData);
  assert.equal(sanitized.members[0]._index, undefined);
  assert.equal(sanitized.members[0]._runtimeFlag, undefined);
  assert.equal(sanitized.members[0].spouses[0]._index, undefined);
  assert.equal(sanitized.members[0].spouses[0]._cacheKey, undefined);
  assert.equal(sanitized.members[0].name, 'Patriarch');
});

test('sanitizeFamilyData restores root patriarch G1-01 portrait if null or stripped', () => {
  const mockData = {
    family: { title: 'Test' },
    members: [
      { id: 'G1-01', name: 'Swargiya Shri Jeev', photo: null }
    ]
  };

  const sanitized = sanitizeFamilyData(mockData);
  assert.equal(sanitized.members[0].photo, 'img/members/g1-01.png');
});

test('parseJsonBody handles Buffers, objects, and JSON strings properly', async () => {
  // 1. Buffer body
  const bufReq = { body: Buffer.from(JSON.stringify({ filename: 'test.jpg', base64: 'abc123xyz' })) };
  const res1 = await parseJsonBody(bufReq);
  assert.equal(res1.filename, 'test.jpg');
  assert.equal(res1.base64, 'abc123xyz');

  // 2. Parsed object body
  const objReq = { body: { ok: true } };
  const res2 = await parseJsonBody(objReq);
  assert.equal(res2.ok, true);

  // 3. String body
  const strReq = { body: JSON.stringify({ count: 42 }) };
  const res3 = await parseJsonBody(strReq);
  assert.equal(res3.count, 42);
});

