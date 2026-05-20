process.env.JWT_SECRET = 'test-secret';
const jwt = require('jsonwebtoken');
const { authMiddleware, restrictRole } = require('./authMiddleware');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    next = vi.fn();
    process.env.JWT_SECRET = 'test-secret';
  });

  describe('authMiddleware', () => {
    it('deve retornar 401 se nenhum token for fornecido', () => {
      authMiddleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Token não fornecido." });
      expect(next).not.toHaveBeenCalled();
    });

    it('deve retornar 401 se o token for inválido', () => {
      req.headers['authorization'] = 'Bearer token-invalido';
      
      authMiddleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Token inválido." });
      expect(next).not.toHaveBeenCalled();
    });

    it('deve chamar next() e popular req.user se o token for válido', () => {
      const payload = { id: 1, email: 'test@test.com', role: 'ADMIN' };
      const validToken = jwt.sign(payload, process.env.JWT_SECRET);
      
      req.headers['authorization'] = `Bearer ${validToken}`;
      
      authMiddleware(req, res, next);
      
      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user).toBeDefined();
      expect(req.user.email).toBe(payload.email);
    });
  });

  describe('restrictRole', () => {
    it('deve permitir acesso se a role do usuário estiver na lista', () => {
      req.user = { role: 'ADMIN' };
      const middleware = restrictRole(['ADMIN', 'PROFESSOR']);
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('deve retornar 403 se a role do usuário não for permitida', () => {
      req.user = { role: 'ALUNO' };
      const middleware = restrictRole(['ADMIN', 'PROFESSOR']);
      
      middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: "Você não tem permissão para realizar esta ação." });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
