const bcrypt = require('bcryptjs');

const password = 'adminpassword'; // A senha que você está tentando usar
const hash = '$2a$10$WHxSSzKv49TB9t8XQKElv.oOIXJjrLEGNnNS0NS3.Inc3kfWy7yoC'; // Substitua pelo hash armazenado no banco de dados

bcrypt.compare(password, hash, (err, res) => {
  if (err) {
    console.error('Erro ao comparar a senha:', err);
  } else {
    console.log('Senha válida:', res); // Deve ser true se a senha estiver correta
  }
});
