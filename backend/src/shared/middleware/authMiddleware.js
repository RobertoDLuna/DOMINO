const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'domino-secret-key-2026';

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: "Token não fornecido." });

  const [, token] = authHeader.split(' ');

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, role }
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido." });
  }
};

const restrictRole = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: "Você não tem permissão para realizar esta ação." });
  }
  next();
};

module.exports = { authMiddleware, restrictRole };
