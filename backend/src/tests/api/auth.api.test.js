const request = require('supertest');
const app = require('../../../server');

describe('Auth API (Endpoints)', () => {
  const testUser = {
    email: 'authadmin@test.com',
    password: 'password123'
  };

  beforeAll(async () => {
    const { getPrisma } = require('../../shared/config/prismaClient');
    const bcrypt = require('bcryptjs');
    const prisma = getPrisma();
    const hash = await bcrypt.hash(testUser.password, 10);
    
    await prisma.user.upsert({
      where: { email: testUser.email },
      update: { password: hash, role: 'ADMIN' },
      create: {
        fullName: 'Auth Admin Test',
        email: testUser.email,
        password: hash,
        role: 'ADMIN'
      }
    });
  });

  const newUser = {
    fullName: 'Novo Usuario',
    email: 'novo@teste.com',
    password: 'senhaSegura123',
    role: 'ALUNO'
  };

  it('POST /api/auth/register - Deve cadastrar um novo usuário', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(newUser);

    // O status 201 ou 400 (se o usuário já existir no banco de testes local)
    // Vamos checar se ele cria com sucesso caso o db esteja limpo
    if (res.status === 201) {
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe(newUser.email);
    } else {
      expect(res.status).toBe(400); // Já cadastrado em run anterior
    }
  });

  it('POST /api/auth/register - Deve falhar se a senha for muito curta (< 8 chars)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...newUser, email: 'outro@teste.com', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('8 caracteres');
  });

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
        password: 'anypassword'
      });

    expect(res.status).toBe(401);
  });

  it('POST /api/auth/change-password - Deve alterar a senha com sucesso', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: newUser.email, password: newUser.password });
    
    const token = loginRes.body.token;

    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        newPassword: 'novaSenha123'
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Senha alterada com sucesso.');

    // Restaura a senha para os testes rodarem de novo futuramente
    await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${res.body.token}`) // Usa o novo token gerado
      .send({ newPassword: newUser.password });
  });

  it('POST /api/auth/change-password - Deve falhar se a senha tiver menos de 8 caracteres', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: newUser.email, password: newUser.password });
    
    const token = loginRes.body.token;

    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        newPassword: 'short'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('8 caracteres');
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
