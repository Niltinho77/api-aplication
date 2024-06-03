document.addEventListener('DOMContentLoaded', async function() {
    const token = localStorage.getItem('token');
    const mensagemDiv = document.getElementById('mensagem');
  
    try {
      const response = await fetch('/api/pedidosAntigos', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
  
      const result = await response.json();
  
      if (response.status === 200) {
        renderPedidosAntigos(result.pedidos, result.user.role === 'admin');
      } else {
        mensagemDiv.innerHTML = `<p style="color: red;">Erro: ${result.message}</p>`;
      }
    } catch (error) {
      console.error('Erro ao consultar pedidos antigos:', error);
      mensagemDiv.innerHTML = '<p style="color: red;">Erro ao consultar pedidos antigos.</p>';
    }
  });
  
  function renderPedidosAntigos(pedidos, isAdmin) {
    const pedidosAntigos = document.getElementById('pedidosAntigos');
    pedidosAntigos.innerHTML = '';
  
    if (pedidos.length > 0) {
      pedidos.forEach(pedido => {
        const pedidoDiv = document.createElement('div');
        pedidoDiv.className = 'pedido-item';
  
        pedidoDiv.innerHTML = `
          <p><strong>Número:</strong> ${pedido.numero}</p>
          <p><strong>Seção:</strong> ${pedido.secao}</p>
          <p><strong>Depósito:</strong> ${pedido.deposito}</p>
          <p><strong>Situação:</strong> ${pedido.situacao}</p>
          <p><strong>Data do Pedido:</strong> ${pedido.data_pedido}</p>
          ${isAdmin ? `<button onclick="excluirPedido(${pedido.id})">Excluir</button>` : ''}
        `;
  
        pedidosAntigos.appendChild(pedidoDiv);
      });
    } else {
      pedidosAntigos.innerHTML = '<p>Nenhum pedido antigo encontrado.</p>';
    }
  }
  
  async function excluirPedido(id) {
    const token = localStorage.getItem('token');
    const mensagemDiv = document.getElementById('mensagem');
  
    try {
      const response = await fetch(`/api/pedidos/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
  
      const result = await response.json();
  
      if (response.status === 200) {
        mensagemDiv.innerHTML = '<p style="color: green;">Pedido excluído com sucesso!</p>';
        document.querySelector(`.pedido-item[data-id="${id}"]`).remove();
      } else {
        mensagemDiv.innerHTML = `<p style="color: red;">Erro: ${result.message}</p>`;
      }
    } catch (error) {
      console.error('Erro ao excluir pedido:', error);
      mensagemDiv.innerHTML = '<p style="color: red;">Erro ao excluir pedido.</p>';
    }
  }
  