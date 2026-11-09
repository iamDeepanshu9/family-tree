import test from 'node:test';
import assert from 'node:assert/strict';
import { createToken, verifyAuth, getAdminCredentials } from '../api/_utils.js';
import transliterateHandler from '../api/transliterate.js';

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

