import api from './api.js';

let isAdmin = false;

async function verificarAdmin() {
  try {
    const response = await api('/api/verifyToken', 'POST');
    if (response.success) {
      isAdmin = response.user.role === 'admin';
    } else {
      throw new Error('Token inválido');
    }
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    localStorage.removeItem('token');
    window.location.href = '/login.html';
  }
}

// Função para remover um produto
async function removerProduto(codigoProduto) {
  if (!isAdmin) {
    alert('Você não tem permissão para remover produtos.');
    return;
  }
  try {
    const response = await api(`/api/produtos/${codigoProduto}`, 'DELETE');
    if (response.success) {
      alert(response.message || 'Produto removido com sucesso!');
      atualizarTabelaEstoque(); // Atualiza a tabela após a remoção com sucesso
    } else {
      throw new Error(response.message || 'Erro ao remover produto.');
    }
  } catch (error) {
    console.error('Erro ao remover produto:', error);
    alert(`Erro ao remover produto: ${error.message}`);
  }
}

// Função para atualizar a tabela de estoque
async function atualizarTabelaEstoque(filtro = '') {
  try {
    filtro = String(filtro);

    const response = await api('/api/produtos', 'GET');
    const produtos = response.produtos;
    const tabelaEstoque = document.getElementById('tabelaEstoque');

    const produtosFiltrados = produtos.filter(produto =>
      produto.nome.toLowerCase().includes(filtro.toLowerCase()) ||
      produto.codigo.includes(filtro)
    );

    if (produtosFiltrados.length > 0) {
      let conteudoTabela = '<div class="produto-container">';

      produtosFiltrados.forEach(produto => {
        conteudoTabela += `
          <div class="produto-card">
            <img src="/uploads/${produto.imagem_url}"  loading="lazy" alt="${produto.nome}" class="produto-imagem">
            <div class="produto-info">
              <h3>${produto.nome}</h3>
              <p>Código: ${produto.codigo}</p>
              <p>Quantidade: ${produto.quantidade}</p>
              ${isAdmin ? `<a href="/barcodes/${produto.codigo}.png" download="${produto.codigo}_barcode.png">Baixar Code</a>` : ''}
              ${isAdmin ? `<button id="btn_rmv" data-codigo="${produto.codigo}" onclick="removerProduto('${produto.codigo}')">Remover</button>` : ''}
            </div>
          </div>`;
      });

      conteudoTabela += '</div>';
      tabelaEstoque.innerHTML = conteudoTabela;
    } else {
      tabelaEstoque.innerHTML = '<p>Nenhum produto corresponde ao filtro aplicado.</p>';
    }
  } catch (error) {
    console.error('Erro ao atualizar tabela de estoque:', error);
    alert(`Erro ao atualizar tabela de estoque: ${error.message}`);
  }
}

// Função para pesquisar produtos
async function pesquisarProduto(filtro) {
  try {
    await atualizarTabelaEstoque(filtro);
  } catch (error) {
    console.error('Erro ao pesquisar produtos:', error);
  }
}

// Adiciona um event listener para o carregamento inicial do documento
document.addEventListener('DOMContentLoaded', async () => {
  await verificarAdmin();
  atualizarTabelaEstoque();

  // Adiciona um event listener para o campo de pesquisa
  document.getElementById('pesquisaProduto').addEventListener('input', (event) => {
    pesquisarProduto(event.target.value);
  });
});

// Torna as funções acessíveis globalmente
window.pesquisarProduto = pesquisarProduto;
window.atualizarTabelaEstoque = atualizarTabelaEstoque;
window.removerProduto = removerProduto;
