import api from './api.js';

async function gerarRelatorioDeProdutos(searchTerm = '') {
  try {
    const response = await api(`/api/relatorios?searchTerm=${encodeURIComponent(searchTerm)}`, 'GET');

    if (response.success) {
      const produtos = response.produtos;
      const tabelaRelatorio = document.getElementById('tabelaRelatorio');
      const mensagemErro = document.getElementById('mensagemErro');

      if (produtos.length > 0) {
        let conteudoTabela = `<table border="1">
          <tr>
            <th>Código</th>
            <th>Nome</th>
            <th>Data</th>
            <th>Entrada</th>
            <th>Saída</th>
          </tr>`;

        produtos.forEach(produto => {
          conteudoTabela += `<tr>
            <td>${produto.codigo}</td>
            <td>${produto.nome}</td>
            <td>${produto.data_formatada}</td>
            <td>${produto.tipo === 'entrada' ? produto.quantidade : ''}</td>
            <td>${produto.tipo === 'saida' ? produto.quantidade : ''}</td>
          </tr>`;
        });

        conteudoTabela += '</table>';
        tabelaRelatorio.innerHTML = conteudoTabela;
        mensagemErro.style.display = 'none';
      } else {
        tabelaRelatorio.innerHTML = '<p>Nenhum resultado encontrado.</p>';
        mensagemErro.style.display = 'block';
      }
    } else {
      throw new Error(response.message || 'Erro ao buscar dados do relatório.');
    }
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    alert(`Erro ao gerar relatório: ${error.message}`);
  }
}

function filtrarRelatorio() {
  const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
  gerarRelatorioDeProdutos(searchTerm);
}

document.addEventListener('DOMContentLoaded', function() {
  gerarRelatorioDeProdutos();

  document.getElementById('voltarHome').addEventListener('click', function() {
    window.close();
  });

  document.getElementById('searchInput').addEventListener('input', filtrarRelatorio);
});
