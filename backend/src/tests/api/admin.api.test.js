const request = require('supertest');
const app = require('../../../server');

describe('Admin API (Security & Data)', () => {
  const adminCredentials = {
    email: 'admin@test.com',
    password: 'password123'
  };

  beforeAll(async () => {
    const { getPrisma } = require('../../shared/config/prismaClient');
    const bcrypt = require('bcryptjs');
    const prisma = getPrisma();
    const hash = await bcrypt.hash(adminCredentials.password, 10);
    
    await prisma.user.upsert({
      where: { email: adminCredentials.email },
      update: { password: hash, role: 'ADMIN' },
      create: {
        fullName: 'Admin Test',
        email: adminCredentials.email,
        password: hash,
        role: 'ADMIN'
      }
    });
  });

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

  it('POST /api/admin/users - Deve criar um novo usuário', async () => {
    const token = await getAdminToken();
    const mockEmail = `newuser${Date.now()}@test.com`;
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'New User',
        email: mockEmail,
        password: 'password123',
        role: 'PROFESSOR' // Enum válido do Prisma
      });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Usuário criado com sucesso.');
    expect(res.body.user.email).toBe(mockEmail);
  });

  it('PUT /api/admin/users/:id/reset-password - Deve redefinir senha de outro usuário', async () => {
    const token = await getAdminToken();
    const { getPrisma } = require('../../shared/config/prismaClient');
    const prisma = getPrisma();
    
    // Vamos pegar ou criar um usuário "vítima"
    const victim = await prisma.user.upsert({
      where: { email: 'victim@test.com' },
      update: {},
      create: {
        fullName: 'Victim User',
        email: 'victim@test.com',
        password: 'hash',
        role: 'PROFESSOR'
      }
    });
    
    const res = await request(app)
      .put(`/api/admin/users/${victim.id}/reset-password`)
      .set('Authorization', `Bearer ${token}`)
      .send({ tempPassword: 'newpassword123' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/Senha redefinida com sucesso/);
  });

  it('GET /api/admin/pending - Deve listar temas pendentes', async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .get('/api/admin/pending')
      .set('Authorization', `Bearer ${token}`);
    
    if (res.status === 401) console.log("PENDING 401 BODY:", res.body);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/admin/approved - Deve listar temas aprovados', async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .get('/api/admin/approved')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('PUT /api/admin/approve-theme/:id - Deve falhar se tema não existe e estourar erro 500 no Prisma', async () => {
    // Usando ID fake pra cair no catch/erro do prisma se aplicável, ou retornar 500
    const token = await getAdminToken();
    const res = await request(app)
      .put('/api/admin/approve-theme/fake-id')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(500); // Controller retorna 500 em erro do update
  });

  it('DELETE /api/admin/reject-theme/:id - Deve falhar com ID inválido (500)', async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .delete('/api/admin/reject-theme/fake-id')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(500);
  });

  it('POST /api/admin/import-schools - Deve importar lista de escolas', async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .post('/api/admin/import-schools')
      .set('Authorization', `Bearer ${token}`)
      .send({
        schools: [{ name: 'Escola Fake Test', inep: '123456' }]
      });
      
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
  });

  it('DELETE /api/admin/users/:id - Deve proibir exclusão da própria conta', async () => {
    const token = await getAdminToken();
    const { getPrisma } = require('../../shared/config/prismaClient');
    const prisma = getPrisma();
    const testAdmin = await prisma.user.findUnique({ where: { email: adminCredentials.email } });
    
    const res = await request(app)
      .delete(`/api/admin/users/${testAdmin.id}`)
      .set('Authorization', `Bearer ${token}`);
      
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/própria conta/);
  });
});
