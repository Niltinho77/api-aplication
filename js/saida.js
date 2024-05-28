import api from './api.js';

async function darSaida(event) {
  event.preventDefault();
  const codigo = document.getElementById('codigoSaida').value.trim();
  const quantidade = parseInt(document.getElementById('quantidadeSaida').value, 10);

  if (!codigo || isNaN(quantidade) || quantidade <= 0) {
    alert('Por favor, preencha todos os campos corretamente. A quantidade deve ser um número maior que zero.');
    return;
  }

  try {
    const produtoResponse = await api(`/api/produtos/${codigo}`, 'GET');
    if (!produtoResponse.success) {
      throw new Error('Produto não encontrado.');
    }

    const produto = produtoResponse.produto;
    if (quantidade > produto.quantidade) {
      throw new Error('Quantidade de saída maior que a quantidade disponível em estoque.');
    }

    const response = await api(`/api/produtos/saida/${codigo}`, 'PATCH', { quantidade });
    if (response.success) {
      alert(response.message || 'Saída de produto registrada com sucesso!');
      window.close(); // Fechar a janela após o sucesso
    } else {
      throw new Error(response.message || 'Erro ao registrar saída.');
    }
  } catch (error) {
    if (error.message.includes('Produto não encontrado')) {
      alert('Erro: Produto inexistente.');
    } else if (error.message.includes('Quantidade de saída maior que a quantidade disponível em estoque')) {
      alert('Erro: Quantidade de saída maior que a quantidade disponível em estoque.');
    } else {
      console.error('Erro ao registrar saída:', error);
      alert(`Erro ao registrar saída: ${error.message}`);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('formSaida').addEventListener('submit', darSaida);
});
