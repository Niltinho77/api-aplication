const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bwipjs = require('bwip-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const app = express();
const port = process.env.PORT || 3000;
const secret = 'your_jwt_secret'; // Use um segredo mais seguro em produção

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Certifique-se de que o diretório uploads existe
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configuração da conexão com o banco de dados
const connection = mysql.createConnection({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.NEON_PORT,
});

connection.connect(err => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
    return;
  }
  console.log('Conectado ao banco de dados MySQL');
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

app.post('/api/upload', upload.single('image'), (req, res) => {
  const { originalname, filename, mimetype, size } = req.file;
  const filePath = `uploads/${filename}`;

  const query = 'INSERT INTO images (originalname, filename, mimetype, size, path) VALUES (?, ?, ?, ?, ?)';
  connection.query(query, [originalname, filename, mimetype, size, filePath], (err, results) => {
    if (err) {
      console.error('Erro ao inserir no banco de dados:', err);
      return res.status(500).json({ error: 'Erro ao inserir no banco de dados' });
    }
    res.status(201).json({ message: 'Upload realizado com sucesso', file: req.file });
  });
});

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

// Rota para adicionar um novo usuário
app.post('/api/criar_usuario', authenticateToken, authorizeRole('admin'), (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ success: false, message: 'Todos os campos são obrigatórios' });
  }

  const hashedPassword = bcrypt.hashSync(password, 8);

  const query = 'INSERT INTO usuarios (username, password, role) VALUES (?, ?, ?)';
  connection.query(query, [username, hashedPassword, role], (err, results) => {
    if (err) {
      console.error('Erro ao criar usuário:', err);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ success: false, message: 'Nome de usuário já existe' });
      } else {
        return res.status(500).json({ success: false, message: 'Erro ao criar usuário' });
      }
    }

    res.status(201).json({ success: true, message: 'Usuário criado com sucesso!' });
  });
});

// Rota para verificar token
app.post('/api/verifyToken', authenticateToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

// Rota para login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Todos os campos são obrigatórios' });
  }

  const query = 'SELECT * FROM usuarios WHERE username = ?';
  connection.query(query, [username], (err, results) => {
    if (err) {
      console.error('Erro ao buscar usuário:', err);
      return res.status(500).json({ success: false, message: 'Erro ao buscar usuário' });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }

    const user = results[0];

    const passwordIsValid = bcrypt.compareSync(password, user.password);
    if (!passwordIsValid) {
      return res.status(401).json({ success: false, message: 'Senha inválida' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, secret, { expiresIn: '1h' });

    res.json({ success: true, token });
  });
});

// Rota para criar um novo produto com upload de imagem
app.post('/api/produtos', upload.single('imagem'), (req, res) => {
  const { codigo, nome } = req.body;
  const imagem = req.file ? req.file.filename : null;

  if (!codigo || !nome || !imagem) {
    return res.status(400).json({ success: false, message: 'Código, nome e imagem são obrigatórios' });
  }

  const query = 'INSERT INTO produtos (codigo, nome, quantidade, barcode_url, imagem_url) VALUES (?, ?, 0, "", ?)';
  connection.query(query, [codigo, nome, imagem], (err, results) => {
    if (err) {
      console.error('Erro ao criar produto:', err);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ success: false, message: 'Código do produto já existe' });
      } else {
        return res.status(500).json({ success: false, message: 'Erro ao criar produto' });
      }
    }

    // Redimensionar e comprimir a imagem
    sharp(req.file.path)
      .resize(800) // Redimensionar para 800px de largura
      .jpeg({ quality: 80 }) // Comprimir a imagem com qualidade de 80%
      .toBuffer((err, buffer) => {
        if (err) {
          console.error('Erro ao processar imagem:', err);
          return res.status(500).json({ success: false, message: 'Erro ao processar imagem' });
        }

        // Salvar a imagem processada
        fs.writeFileSync(req.file.path, buffer);

        // Gerar código de barras
        bwipjs.toBuffer({
          bcid: 'code128',
          text: codigo,
          scale: 3,
          height: 10,
          includetext: true,
          textxalign: 'center'
        }, (err, png) => {
          if (err) {
            console.error('Erro ao gerar código de barras:', err);
            return res.status(500).json({ success: false, message: 'Erro ao gerar código de barras' });
          }

          const barcodeDir = path.join(__dirname, 'barcodes');
          if (!fs.existsSync(barcodeDir)) {
            fs.mkdirSync(barcodeDir);
          }

          const barcodePath = path.join(barcodeDir, `${codigo}.png`);
          fs.writeFileSync(barcodePath, png);

          const barcodeUrl = `/barcodes/${codigo}.png`;

          // Atualizar produto com a URL do código de barras
          const updateQuery = 'UPDATE produtos SET barcode_url = ? WHERE codigo = ?';
          connection.query(updateQuery, [barcodeUrl, codigo], (updateErr) => {
            if (updateErr) {
              console.error('Erro ao atualizar URL do código de barras do produto:', updateErr);
              return res.status(500).json({ success: false, message: 'Erro ao atualizar URL do código de barras do produto' });
            }

            res.status(201).json({ success: true, message: 'Produto criado com sucesso!', id: results.insertId, barcodeUrl });
          });
        });
      });
  });
});

// Rota para obter um produto específico
app.get('/api/produtos/:codigo', (req, res) => {
  const codigo = req.params.codigo;
  const query = 'SELECT * FROM produtos WHERE codigo = ?';
  connection.query(query, [codigo], (err, results) => {
    if (err) {
      console.error('Erro ao buscar produto:', err);
      return res.status(500).json({ success: false, message: 'Erro ao buscar produto' });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado' });
    }

    res.json({ success: true, produto: results[0] });
  });
});

// Rota para remover um produto
app.delete('/api/produtos/:codigo', authenticateToken, authorizeRole('admin'), (req, res) => {
  const codigo = req.params.codigo;

  const query = 'DELETE FROM produtos WHERE codigo = ?';
  connection.query(query, [codigo], (err, results) => {
    if (err) {
      console.error('Erro ao remover produto:', err);
      return res.status(500).json({ success: false, message: 'Erro ao remover produto' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado' });
    }

    res.json({ success: true, message: 'Produto removido com sucesso!' });
  });
});

// Rota para registrar entrada de produto
app.patch('/api/produtos/entrada/:codigo', (req, res) => {
  const codigo = req.params.codigo;
  const { quantidade } = req.body;

  if (quantidade <= 0) {
    return res.status(400).json({ success: false, message: 'Quantidade deve ser maior que zero' });
  }

  const query = 'UPDATE produtos SET quantidade = quantidade + ? WHERE codigo = ?';
  connection.query(query, [quantidade, codigo], (err, results) => {
    if (err) {
      console.error('Erro ao atualizar produto:', err);
      return res.status(500).json({ success: false, message: 'Erro ao atualizar produto' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado' });
    }

    res.json({ success: true, message: 'Entrada registrada com sucesso!' });
  });
});

// Rota para registrar saída de produto
app.patch('/api/produtos/saida/:codigo', (req, res) => {
  const codigo = req.params.codigo;
  const { quantidade } = req.body;

  if (quantidade <= 0) {
    return res.status(400).json({ success: false, message: 'Quantidade deve ser maior que zero' });
  }

  const query = 'UPDATE produtos SET quantidade = quantidade - ? WHERE codigo = ? AND quantidade >= ?';
  connection.query(query, [quantidade, codigo, quantidade], (err, results) => {
    if (err) {
      console.error('Erro ao atualizar produto:', err);
      return res.status(500).json({ success: false, message: 'Erro ao atualizar produto' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado ou quantidade insuficiente em estoque' });
    }

    res.json({ success: true, message: 'Saída registrada com sucesso!' });
  });
});

// Rota para listar todos os produtos
app.get('/api/produtos', (req, res) => {
  const query = 'SELECT * FROM produtos';
  connection.query(query, (err, results) => {
    if (err) {
      console.error('Erro ao buscar produtos:', err);
      return res.status(500).json({ success: false, message: 'Erro ao buscar produtos' });
    }

    res.json({ success: true, produtos: results });
  });
});

// Rota para gerar relatórios
app.get('/api/relatorios', (req, res) => {
  const searchTerm = req.query.searchTerm ? `%${req.query.searchTerm}%` : '%';

  const query = `
    SELECT 
      p.codigo,
      p.nome,
      m.data,
      m.tipo,
      m.quantidade
    FROM movimentacoes m
    JOIN produtos p ON m.codigo_produto = p.codigo
    WHERE p.codigo LIKE ? OR p.nome LIKE ? OR m.data LIKE ?
    ORDER BY m.data DESC
  `;

  console.log('Consulta SQL:', query);
  console.log('Parâmetros:', [searchTerm, searchTerm, searchTerm]);

  connection.query(query, [searchTerm, searchTerm, searchTerm], (err, results) => {
    if (err) {
      console.error('Erro ao buscar relatório:', err);
      return res.status(500).json({ success: false, message: 'Erro ao buscar relatório' });
    }

    res.json({ success: true, produtos: results });
  });
});

// Servir arquivos estáticos
const oneDay = 24 * 60 * 60 * 1000; // Um dia em milissegundos
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: oneDay }));
app.use('/barcodes', express.static(path.join(__dirname, 'barcodes'), { maxAge: oneDay }));

// Rota para acessar a página de criação de usuários (somente admin)
app.get('/criar_usuario', authenticateToken, authorizeRole('admin'), (req, res) => {
  res.sendFile(path.join(__dirname, 'criar_usuario.html'));
});

// Rotas para páginas HTML
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/cadastro', (req, res) => {
  res.sendFile(path.join(__dirname, 'cadastro.html'));
});

app.get('/entrada', (req, res) => {
  res.sendFile(path.join(__dirname, 'entrada.html'));
});

app.get('/estoque', (req, res) => {
  res.sendFile(path.join(__dirname, 'estoque.html'));
});

app.get('/saida', (req, res) => {
  res.sendFile(path.join(__dirname, 'saida.html'));
});

app.get('/relatorios', (req, res) => {
  res.sendFile(path.join(__dirname, 'relatorios.html'));
});

app.get('/adicionar_usuario', (req, res) => {
  res.sendFile(path.join(__dirname, 'adicionar_usuario.html'));
});

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor Express rodando em http://localhost:${port}`);
});

module.exports = app;
