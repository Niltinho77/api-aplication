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
const morgan = require('morgan');

const app = express();
const port = process.env.PORT || 3000;
const secret = 'your_jwt_secret';

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

// Middleware de logging detalhado
app.use(morgan('combined'));

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
  console.log('Authorization Header:', authHeader);
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) {
    console.error('Token não fornecido');
    return res.sendStatus(401);
  }

  jwt.verify(token, secret, (err, user) => {
    if (err) {
      console.error('Token inválido:', err);
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
}

function authorizeRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      console.error(`Acesso negado para o usuário: ${req.user.username} com papel: ${req.user.role}`);
      return res.sendStatus(403);
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

  const almoxVirtualValue = almoxVirtual === 'true';

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

// Rota para cadastrar um novo pedido
app.post('/api/pedidos', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const { numero, secao, deposito, situacao } = req.body;

  if (!numero || !secao || !deposito || !situacao) {
    return res.status(400).json({ success: false, message: 'Todos os campos são obrigatórios' });
  }

  try {
    // Verificar se já existe um pedido com o mesmo número e seção
    const checkQuery = 'SELECT * FROM pedidos WHERE numero = ? AND secao = ?';
    const existingPedido = await query(checkQuery, [numero, secao]);

    if (existingPedido.length > 0) {
      return res.status(409).json({ success: false, message: 'Já existe um pedido com este número e seção' });
    }

    const queryStr = 'INSERT INTO pedidos (numero, secao, deposito, situacao, data_pedido) VALUES (?, ?, ?, ?, CURDATE())';
    await query(queryStr, [numero, secao, deposito, situacao]);

    res.status(201).json({ success: true, message: 'Pedido cadastrado com sucesso!' });
  } catch (err) {
    console.error('Erro ao cadastrar pedido:', err);
    res.status(500).json({ success: false, message: 'Erro ao cadastrar pedido' });
  }
});

// Rota para atualizar a situação de um pedido
app.patch('/api/pedidos/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { situacao } = req.body;

  if (!situacao) {
    return res.status(400).json({ success: false, message: 'Situação é obrigatória' });
  }

  const validSituacoes = ['em separação', 'aguardando retirada', 'retirado'];
  if (!validSituacoes.includes(situacao)) {
    return res.status(400).json({ success: false, message: 'Situação inválida' });
  }

  const queryStr = 'UPDATE pedidos SET situacao = ? WHERE id = ?';

  try {
    const results = await query(queryStr, [situacao, id]);
    if (results.affectedRows > 0) {
      res.status(200).json({ success: true, message: 'Situação do pedido atualizada com sucesso!' });
    } else {
      res.status(404).json({ success: false, message: 'Pedido não encontrado' });
    }
  } catch (err) {
    console.error('Erro ao atualizar situação do pedido:', err);
    res.status(500).json({ success: false, message: 'Erro ao atualizar situação do pedido' });
  }
});

// Rota para pedidos recentes
app.get('/api/pedidosRecentes', authenticateToken, async (req, res) => {
  const queryStr = `
    SELECT id, numero, secao, deposito, situacao, data_pedido 
    FROM pedidos 
    WHERE situacao != 'retirado'
    ORDER BY data_pedido DESC
  `;

  try {
    const results = await query(queryStr);
    console.log('Pedidos recentes:', results);
    res.json({ success: true, pedidos: results });
  } catch (err) {
    console.error('Erro ao buscar pedidos recentes:', err);
    res.status(500).json({ success: false, message: 'Erro ao buscar pedidos recentes' });
  }
});

// Rota para obter todos os pedidos
app.get('/api/todosPedidos', authenticateToken, async (req, res) => {
  const queryStr = 'SELECT * FROM pedidos ORDER BY data_pedido DESC';

  try {
    const results = await query(queryStr);
    res.json({ success: true, pedidos: results });
  } catch (err) {
    console.error('Erro ao buscar todos os pedidos:', err);
    res.status(500).json({ success: false, message: 'Erro ao buscar todos os pedidos' });
  }
});

// Rota para excluir um pedido
app.delete('/api/pedidos/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const { id } = req.params;

  try {
    const queryStr = 'DELETE FROM pedidos WHERE id = ?';
    const result = await query(queryStr, [id]);

    if (result.affectedRows > 0) {
      res.json({ success: true, message: 'Pedido excluído com sucesso!' });
    } else {
      res.status(404).json({ success: false, message: 'Pedido não encontrado' });
    }
  } catch (err) {
    console.error('Erro ao excluir pedido:', err);
    res.status(500).json({ success: false, message: 'Erro ao excluir pedido' });
  }
});

// Rota para upload de PDF
app.post('/api/pedidos/:id/upload', authenticateToken, authorizeRole('admin'), upload.single('pdf'), async (req, res) => {
  const { id } = req.params;

  if (!req.file) {
    console.error('Nenhum arquivo foi enviado.');
    return res.status(400).json({ success: false, message: 'Nenhum arquivo foi enviado.' });
  }

  try {
    console.log('Iniciando upload para Cloudinary...');
    // Upload do PDF para o Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'pedidos_pdfs',
      resource_type: 'raw' // 'raw' para arquivos não imagem/vídeo
    });

    // Verifica e loga o resultado do upload
    if (result && result.secure_url) {
      console.log('Upload bem-sucedido:', result.secure_url);
    } else {
      console.error('Falha no upload:', result);
      throw new Error('Falha no upload do PDF para o Cloudinary.');
    }

    // Obtém a URL segura do PDF no Cloudinary
    const pdfUrl = result.secure_url;

    // Atualiza o caminho do PDF no banco de dados
    const queryStr = 'UPDATE pedidos SET pdf = ? WHERE id = ?';
    await query(queryStr, [pdfUrl, id]);

    // Remove o arquivo local após o upload para o Cloudinary
    fs.unlinkSync(req.file.path);

    res.status(200).json({ success: true, message: 'PDF anexado com sucesso!', pdfUrl });
  } catch (err) {
    console.error('Erro ao anexar PDF:', err);
    res.status(500).json({ success: false, message: 'Erro ao anexar PDF.' });
  }
});



// Rota para gerar relatórios
app.get('/api/relatorios', async (req, res) => {
  const searchTerm = req.query.searchTerm ? `%${req.query.searchTerm}%` : '%';

  const queryStr = `
    SELECT 
      p.codigo,
      p.nome,
      DATE_FORMAT(m.data, '%d-%m-%Y') AS data_formatada,
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
