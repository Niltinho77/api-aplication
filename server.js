const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bwipjs = require('bwip-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const app = express();
const port = process.env.PORT || 3000;
const secret = 'your_jwt_secret'; // Use um segredo mais seguro em produção

// Configuração do Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1y'
}));
app.use('/barcodes', express.static(path.join(__dirname, 'barcodes'), {
  maxAge: '1y'
}));

// Certifique-se de que os diretórios de uploads e barcodes existam
const uploadDir = path.join(__dirname, 'uploads');
const barcodeDir = path.join(__dirname, 'barcodes');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
if (!fs.existsSync(barcodeDir)) {
  fs.mkdirSync(barcodeDir);
}

// Configuração da conexão com o banco de dados
const pool = mysql.createPool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.NEON_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function query(sql, params) {
  const [rows, fields] = await pool.execute(sql, params);
  return rows;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

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
app.post('/api/criar_usuario', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ success: false, message: 'Todos os campos são obrigatórios' });
  }

  const hashedPassword = bcrypt.hashSync(password, 8);

  const queryStr = 'INSERT INTO usuarios (username, password, role) VALUES (?, ?, ?)';
  try {
    await query(queryStr, [username, hashedPassword, role]);
    res.status(201).json({ success: true, message: 'Usuário criado com sucesso!' });
  } catch (err) {
    console.error('Erro ao criar usuário:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Nome de usuário já existe' });
    } else {
      return res.status(500).json({ success: false, message: 'Erro ao criar usuário' });
    }
  }
});

// Rota para verificar token
app.post('/api/verifyToken', authenticateToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

// Rota para login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Todos os campos são obrigatórios' });
  }

  const queryStr = 'SELECT * FROM usuarios WHERE username = ?';
  try {
    const results = await query(queryStr, [username]);

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
  } catch (err) {
    console.error('Erro ao buscar usuário:', err);
    return res.status(500).json({ success: false, message: 'Erro ao buscar usuário' });
  }
});

// Rota para criar um novo produto com upload de imagem para o Cloudinary
app.post('/api/produtos', upload.single('imagem'), async (req, res) => {
  const { codigo, nome, almoxVirtual } = req.body;
  const file = req.file;

  if (!codigo || !nome || !file) {
    return res.status(400).json({ success: false, message: 'Código, nome e imagem são obrigatórios' });
  }

  const almoxVirtualValue = almoxVirtual === 'true'; // Converte a string para boolean

  try {
    const checkQuery = 'SELECT * FROM produtos WHERE codigo = ?';
    const checkResults = await query(checkQuery, [codigo]);

    if (checkResults.length > 0) {
      return res.status(409).json({ success: false, message: 'Código do produto já existe' });
    }

    const result = await cloudinary.uploader.upload(file.path, { folder: 'produtos' });
    const imagemUrl = result.secure_url;

    const insertQuery = 'INSERT INTO produtos (codigo, nome, quantidade, barcode_url, imagem_url, almox_virtual) VALUES (?, ?, 0, "", ?, ?)';
    const insertResults = await query(insertQuery, [codigo, nome, imagemUrl, almoxVirtualValue]);

    bwipjs.toBuffer({
      bcid: 'code128',
      text: codigo,
      scale: 3,
      height: 10,
      includetext: true,
      textxalign: 'center'
    }, async (err, png) => {
      if (err) {
        console.error('Erro ao gerar código de barras:', err);
        return res.status(500).json({ success: false, message: 'Erro ao gerar código de barras' });
      }

      const barcodePath = path.join(barcodeDir, `${codigo}.png`);
      fs.writeFileSync(barcodePath, png);

      const barcodeUrl = `/barcodes/${codigo}.png`;

      const updateQuery = 'UPDATE produtos SET barcode_url = ? WHERE codigo = ?';
      await query(updateQuery, [barcodeUrl, codigo]);

      fs.unlinkSync(file.path);

      res.status(201).json({ success: true, message: 'Produto criado com sucesso!', id: insertResults.insertId, barcodeUrl, imagemUrl });
    });
  } catch (err) {
    console.error('Erro ao criar produto:', err);
    return res.status(500).json({ success: false, message: 'Erro ao criar produto' });
  }
});


// Rota para redimensionar imagens dinamicamente
app.get('/uploads/:image', (req, res) => {
  const width = parseInt(req.query.width) || 800;
  const height = parseInt(req.query.height) || 600;
  const format = req.query.format || 'webp';

  const imagePath = path.join(uploadDir, req.params.image);

  if (fs.existsSync(imagePath)) {
    sharp(imagePath)
      .resize(width, height)
      .toFormat(format)
      .toBuffer()
      .then(data => {
        res.type(`image/${format}`);
        res.send(data);
      })
      .catch(err => {
        res.status(500).send('Erro ao processar a imagem');
      });
  } else {
    res.status(404).send('Imagem não encontrada');
  }
});

// Rota para obter um produto específico
app.get('/api/produtos/:codigo', async (req, res) => {
  const codigo = req.params.codigo;
  const queryStr = 'SELECT * FROM produtos WHERE codigo = ?';

  try {
    const results = await query(queryStr, [codigo]);

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado' });
    }

    res.json({ success: true, produto: results[0] });
  } catch (err) {
    console.error('Erro ao buscar produto:', err);
    return res.status(500).json({ success: false, message: 'Erro ao buscar produto' });
  }
});

// Rota para remover um produto
app.delete('/api/produtos/:codigo', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const codigo = req.params.codigo;
  const queryStr = 'DELETE FROM produtos WHERE codigo = ?';

  try {
    const results = await query(queryStr, [codigo]);

    if (results.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado' });
    }

    res.json({ success: true, message: 'Produto removido com sucesso!' });
  } catch (err) {
    console.error('Erro ao remover produto:', err);
    return res.status(500).json({ success: false, message: 'Erro ao remover produto' });
  }
});

// Rota para registrar entrada de produto
app.patch('/api/produtos/entrada/:codigo', async (req, res) => {
  const codigo = req.params.codigo;
  const { quantidade } = req.body;

  if (quantidade <= 0) {
    return res.status(400).json({ success: false, message: 'Quantidade deve ser maior que zero' });
  }

  const queryStrUpdate = 'UPDATE produtos SET quantidade = quantidade + ? WHERE codigo = ?';
  const queryStrInsert = 'INSERT INTO movimentacoes (codigo_produto, data, tipo, quantidade) VALUES (?, NOW(), ?, ?)';

  try {
    const resultsUpdate = await query(queryStrUpdate, [quantidade, codigo]);

    if (resultsUpdate.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado' });
    }

    await query(queryStrInsert, [codigo, 'entrada', quantidade]);

    res.json({ success: true, message: 'Entrada registrada com sucesso!' });
  } catch (err) {
    console.error('Erro ao registrar entrada:', err);
    return res.status(500).json({ success: false, message: 'Erro ao registrar entrada' });
  }
});

// Rota para registrar saída de produto
app.patch('/api/produtos/saida/:codigo', async (req, res) => {
  const codigo = req.params.codigo;
  const { quantidade } = req.body;

  if (quantidade <= 0) {
    return res.status(400).json({ success: false, message: 'Quantidade deve ser maior que zero' });
  }

  const queryStrUpdate = 'UPDATE produtos SET quantidade = quantidade - ? WHERE codigo = ? AND quantidade >= ?';
  const queryStrInsert = 'INSERT INTO movimentacoes (codigo_produto, data, tipo, quantidade) VALUES (?, NOW(), ?, ?)';

  try {
    const resultsUpdate = await query(queryStrUpdate, [quantidade, codigo, quantidade]);

    if (resultsUpdate.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado ou quantidade insuficiente em estoque' });
    }

    await query(queryStrInsert, [codigo, 'saida', quantidade]);

    res.json({ success: true, message: 'Saída registrada com sucesso!' });
  } catch (err) {
    console.error('Erro ao registrar saída:', err);
    return res.status(500).json({ success: false, message: 'Erro ao registrar saída' });
  }
});


// Rota para listar todos os produtos
app.get('/api/produtos', async (req, res) => {
  const queryStr = 'SELECT * FROM produtos';

  try {
    const results = await query(queryStr);

    res.json({ success: true, produtos: results });
  } catch (err) {
    console.error('Erro ao buscar produtos:', err);
    return res.status(500).json({ success: false, message: 'Erro ao buscar produtos' });
  }
});

// Rota para listar todos os pedidos
app.get('/api/pedidos', async (req, res) => {
  const queryStr = 'SELECT numero, secao, situacao FROM pedidos'; // Ajuste a consulta conforme a estrutura do seu banco de dados

  try {
    const results = await query(queryStr);
    res.json({ success: true, pedidos: results });
  } catch (err) {
    console.error('Erro ao buscar pedidos:', err);
    res.status(500).json({ success: false, message: 'Erro ao buscar pedidos' });
  }
});


// Rota para gerar relatórios
app.get('/api/relatorios', async (req, res) => {
  const searchTerm = req.query.searchTerm ? `%${req.query.searchTerm}%` : '%';

  const queryStr = `
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

  console.log('Consulta SQL:', queryStr);
  console.log('Parâmetros:', [searchTerm, searchTerm, searchTerm]);

  try {
    const results = await query(queryStr, [searchTerm, searchTerm, searchTerm]);

    res.json({ success: true, produtos: results });
  } catch (err) {
    console.error('Erro ao buscar relatório:', err);
    return res.status(500).json({ success: false, message: 'Erro ao buscar relatório' });
  }
});

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname)));

// Rota para acessar a página de criação de usuários (somente admin)
app.get('/criar_usuario', authenticateToken, authorizeRole('admin'), (req, res) => {
  res.sendFile(path.join(__dirname, 'criar_usuario.html'));
});

// Rotas para páginas HTML
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
