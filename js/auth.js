const jwt = require('jsonwebtoken');

const secret = 'your_jwt_secret'; // Use um segredo mais seguro em produção

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  console.log('Authorization Header:', authHeader); // Log para depuração
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) {
    console.error('Token não fornecido');
    return res.sendStatus(401); // Não autorizado
  }

  jwt.verify(token, secret, (err, user) => {
    if (err) {
      console.error('Token inválido:', err);
      return res.sendStatus(403); // Proibido
    }
    req.user = user;
    next();
  });
}

function authorizeRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      console.error(`Acesso negado para o usuário: ${req.user.username} com papel: ${req.user.role}`);
      return res.sendStatus(403); // Proibido
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRole
};
