// Define a função para abrir a página de cadastro de produtos em uma nova janela
function abrirCadastro() {
  window.open('cadastro.html', 'Cadastro', 'width=1200,height=800');
}

// Define a função para abrir a página de entrada de produtos em uma nova janela
function abrirEntrada() {
  window.open('entrada.html', 'Entrada', 'width=1200,height=800');
}

// Define a função para abrir a página de saída de produtos em uma nova janela
function abrirSaida() {
  window.open('saida.html', 'Saída', 'width=1200,height=800');
}

// Define a função para abrir a página de visualização do estoque de produtos em uma nova janela
function abrirEstoque() {
  window.open('estoque.html', 'Estoque', 'width=1200,height=800');
}

// Adiciona um ouvinte de evento ao botão de geração de relatórios para abrir a respectiva página em uma nova janela
document.getElementById('openReportPage').addEventListener('click', function() {
  window.open('relatorios.html', 'Relatórios', 'width=1200,height=800'); // Abre em uma nova janela
});

  
import api from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  try {
    const response = await fetch('/api/verifyToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Token inválido');
    }

    const data = await response.json();

    if (data.success) {
      if (data.user.role === 'admin') {
        document.getElementById('cadastroBtn').disabled = false;
        document.getElementById('entradaBtn').disabled = false;
        document.getElementById('saidaBtn').disabled = false;
        document.getElementById('openReportPage').disabled = false;
        document.getElementById('abrirEstoque').disabled = false;
      } else {
        document.getElementById('abrirEstoque').disabled = false;
      }
    } else {
      throw new Error('Token inválido');
    }

    // Carregar widgets de pedidos
    await carregarPedidos();
  } catch (error) {
    console.error(error);
    localStorage.removeItem('token');
    window.location.href = '/login.html';
  }
});

function logout() {
  localStorage.removeItem('token');
  window.location.href = '/login.html';
}

async function carregarPedidos() {
  const widgetsContainer = document.getElementById('widgets-container');
  const widgetTemplate = document.getElementById('widget-template').cloneNode(true);
  widgetTemplate.style.display = 'block';
  widgetTemplate.removeAttribute('id');

  try {
    const response = await api('/api/pedidos', 'GET');
    if (response.success) {
      response.pedidos.forEach(pedido => {
        const widget = widgetTemplate.cloneNode(true);
        widget.querySelector('.pedido-numero').textContent = pedido.numero;
        widget.querySelector('.pedido-secao').textContent = pedido.secao;
        widget.querySelector('.pedido-situacao').textContent = pedido.situacao;
        widgetsContainer.appendChild(widget);
      });
    } else {
      throw new Error(response.message || 'Erro ao carregar pedidos.');
    }
  } catch (error) {
    console.error('Erro ao carregar pedidos:', error);
  }
}

window.logout = logout;
