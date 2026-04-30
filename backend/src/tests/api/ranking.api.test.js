const request = require('supertest');
const app = require('../../../server');

describe('Ranking API (Public Access)', () => {
  it('GET /api/ranking/preview - Deve retornar prévia do ranking de Dominó', async () => {
    const res = await request(app).get('/api/ranking/preview');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('topPlayers');
    expect(res.body).toHaveProperty('topSchools');
  });

  it('GET /api/chess/ranking/preview - Deve retornar prévia do ranking de Xadrez', async () => {
    const res = await request(app).get('/api/chess/ranking/preview');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('topPlayers');
    expect(res.body).toHaveProperty('topSchools');
  });

  it('GET /api/ranking - Deve retornar ranking completo de Dominó', async () => {
    const res = await request(app).get('/api/ranking');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
