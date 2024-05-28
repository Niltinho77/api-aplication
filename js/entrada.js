import api from './api.js';

async function darEntrada(event) {
  event.preventDefault();
  const codigo = document.getElementById('codigoEntrada').value.trim();
  const quantidade = parseInt(document.getElementById('quantidadeEntrada').value, 10);

  if (!codigo || isNaN(quantidade) || quantidade <= 0) {
    alert('Por favor, preencha todos os campos corretamente. A quantidade deve ser um número maior que zero.');
    return;
  }

  try {
    const produtoResponse = await api(`/api/produtos/${codigo}`, 'GET');
    if (!produtoResponse.success) {
      throw new Error('Produto não encontrado.');
    }

    const response = await api(`/api/produtos/entrada/${codigo}`, 'PATCH', { quantidade });
    if (response.success) {
      alert(response.message || 'Entrada de produto registrada com sucesso!');
      window.close(); // Fechar a janela após o sucesso
    } else {
      throw new Error(response.message || 'Erro ao registrar entrada jjjjj.');
    }
  } catch (error) {
    if (error.message.includes('Produto não encontrado')) {
      alert('Erro: Produto inexistente.');
    } else {
      console.error('Erro ao registrar entrada:', error);
      alert(`Erro ao registrar entrada: ${error.message}`);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('formEntrada').addEventListener('submit', darEntrada);
});
