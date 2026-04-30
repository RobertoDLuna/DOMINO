const request = require('supertest');
const app = require('../../../server');

describe('Admin API (Security & Data)', () => {
  const adminCredentials = {
    email: 'admin@test.com',
    password: 'test123'
  };

  const getAdminToken = async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send(adminCredentials);
    return res.body.token;
  };

  it('GET /api/admin/stats - Deve bloquear acesso sem token', async () => {
    const res = await request(app).get('/api/admin/stats');
    expect(res.status).toBe(401);
  });

  it('GET /api/admin/stats - Deve retornar dados para admin autenticado', async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('users');
    expect(res.body).toHaveProperty('schools');
    expect(res.body).toHaveProperty('themes');
  });

  it('GET /api/admin/users - Deve listar usuários para o admin', async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('POST /api/admin/users - Deve falhar ao criar usuário sem autorização', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .send({ fullName: 'Hack', email: 'hack@test.com', role: 'ADMIN' });
    
    expect(res.status).toBe(401);
  });
});
