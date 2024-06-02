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
        widget.querySelector('.pedido-numero').textContent = `Número: ${pedido.numero}`;
        widget.querySelector('.pedido-secao').textContent = `Seção: ${pedido.secao}`;
        widget.querySelector('.pedido-situacao').textContent = `Situação: ${pedido.situacao}`;
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
