import api from './api.js';

async function cadastrarProduto(event) {
  event.preventDefault();
  const codigo = document.getElementById('codigo').value.trim();
  const nome = document.getElementById('nome').value.trim();
  const imagem = document.getElementById('imagem').files[0];

  if (!codigo || !nome || !imagem) {
    alert('Por favor, preencha todos os campos e selecione uma imagem.');
    return;
  }

  const formData = new FormData();
  formData.append('codigo', codigo);
  formData.append('nome', nome);
  formData.append('imagem', imagem);

  try {
    const response = await fetch('/api/produtos', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (result.success) {
      alert('Produto cadastrado com sucesso!');
      window.close(); // Fechar a janela após o sucesso
    } else {
      throw new Error(result.message || 'Erro ao cadastrar produto.');
    }
  } catch (error) {
    if (error.message.includes('Código do produto já existe')) {
      alert('Erro: Produto já existente.');
    } else {
      console.error('Erro ao cadastrar produto:', error);
      alert(`Erro ao cadastrar produto: ${error.message}`);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('formCadastro').addEventListener('submit', cadastrarProduto);
});
