document.addEventListener('DOMContentLoaded', async function() {
    const token = localStorage.getItem('token');
    const resultadosDiv = document.getElementById('resultados');
    const searchInput = document.getElementById('search');
    let isAdmin = false;
  
    async function verificarAdmin() {
      try {
        const response = await fetch('/api/verifyToken', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
  
        const result = await response.json();
        if (response.ok && result.success) {
          isAdmin = result.user.role === 'admin';
        }
      } catch (error) {
        console.error('Erro ao verificar o token:', error);
      }
    }
  
    async function carregarPedidos() {
      try {
        const response = await fetch('/api/todosPedidos', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
  
        const result = await response.json();
  
        if (response.ok) {
          renderizarPedidos(result.pedidos);
        } else {
          resultadosDiv.innerHTML = `<p style="color: red;">Erro: ${result.message}</p>`;
        }
      } catch (error) {
        console.error('Erro ao carregar pedidos:', error);
        resultadosDiv.innerHTML = '<p style="color: red;">Erro ao carregar pedidos.</p>';
      }
    }
  
    function renderizarPedidos(pedidos) {
      resultadosDiv.innerHTML = '';
      pedidos.forEach(pedido => {
        const pedidoElement = document.createElement('div');
        pedidoElement.classList.add('pedido-item');
        pedidoElement.innerHTML = `
          <p><strong>Número:</strong> ${pedido.numero}</p>
          <p><strong>Seção:</strong> ${pedido.secao}</p>
          <p><strong>Depósito:</strong> ${pedido.deposito}</p>
          <p><strong>Situação:</strong> ${pedido.situacao}</p>
          ${isAdmin ? `<button onclick="excluirPedido(${pedido.id})">Excluir Pedido</button>` : ''}
        `;
        resultadosDiv.appendChild(pedidoElement);
      });
    }
  
    async function excluirPedido(id) {
      try {
        const response = await fetch(`/api/pedidos/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
  
        const result = await response.json();
  
        if (response.ok) {
          alert('Pedido excluído com sucesso!');
          carregarPedidos();
        } else {
          alert(`Erro ao excluir pedido: ${result.message}`);
        }
      } catch (error) {
        console.error('Erro ao excluir pedido:', error);
        alert('Erro ao excluir pedido.');
      }
    }
  
    function filtrarPedidos(event) {
      const termo = event.target.value.toLowerCase();
      const pedidos = document.querySelectorAll('.pedido-item');
  
      pedidos.forEach(pedido => {
        const numero = pedido.querySelector('p:nth-child(1)').textContent.toLowerCase();
        const secao = pedido.querySelector('p:nth-child(2)').textContent.toLowerCase();
        if (numero.includes(termo) || secao.includes(termo)) {
          pedido.style.display = '';
        } else {
          pedido.style.display = 'none';
        }
      });
    }
  
    searchInput.addEventListener('input', filtrarPedidos);
  
    await verificarAdmin();
    carregarPedidos();
  
    // Torna a função excluirPedido acessível globalmente
    window.excluirPedido = excluirPedido;
  });
  