const request = require('supertest');
const app = require('../../../server');

describe('Auth API (Endpoints)', () => {
  const testUser = {
    email: 'admin@test.com',
    password: 'test123'
  };

  it('POST /api/auth/login - Deve logar com sucesso e retornar token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe(testUser.email);
  });

  it('POST /api/auth/login - Deve falhar com senha errada', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'wrongpassword'
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('POST /api/auth/login - Deve falhar com usuário inexistente', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@test.com',
        password: 'any'
      });

    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me - Deve validar token e retornar usuário', async () => {
    // Primeiro loga para pegar o token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send(testUser);
    
    const token = loginRes.body.token;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(testUser.email);
  });

  it('GET /api/auth/me - Deve falhar sem token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
