const bcrypt = require('bcryptjs');

// A senha que você está tentando usar
const password = 'adminpassword'; 

// O hash armazenado no banco de dados (substitua pelo hash real)
const hash = '$2a$10$WHxSSzKv49TB9t8XQKElv.oOIXJjrLEGNnNS0NS3.Inc3kfWy7yoC'; 

bcrypt.compare(password, hash, (err, res) => {
  if (err) {
    console.error('Erro ao comparar a senha:', err);
  } else {
    console.log('Senha válida:', res); // Deve ser true se a senha estiver correta
  }
});
