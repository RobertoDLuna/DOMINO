import { describe, it, expect } from 'vitest';
const request = require('supertest');
const app = require('../../../server');

describe('School API', () => {
  it('GET /api/schools - Deve listar escolas', async () => {
    const res = await request(app).get('/api/schools');
    
    expect(res.status).toBe(200);
    // Sabemos que existem escolas inseridas no setup (ex: import-schools)
    expect(res.body.length).toBeGreaterThan(0);
  });
});
