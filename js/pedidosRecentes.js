document.addEventListener('DOMContentLoaded', async () => {
  const pedidosRecentesContainer = document.getElementById('pedidosRecentes');
  const token = localStorage.getItem('token');

  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  try {
    const response = await fetch('/api/pedidosRecentes', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (data.success) {
      const pedidos = data.pedidos;
      pedidosRecentesContainer.innerHTML = '';

      if (pedidos.length > 0) {
        pedidos.forEach(pedido => {
          const pedidoElement = document.createElement('div');
          pedidoElement.className = 'pedido';

          pedidoElement.innerHTML = `
            <p><strong>Seção:</strong> ${pedido.secao}</p>
            <p><strong>Número:</strong> ${pedido.numero}</p>
            <p><strong>Depósito:</strong> ${pedido.deposito}</p>
            <p><strong>Situação:</strong> ${pedido.situacao}</p>
            <p><strong>Data do Pedido:</strong> ${new Date(pedido.data_pedido).toLocaleDateString('pt-BR')}</p>
          `;

          pedidosRecentesContainer.appendChild(pedidoElement);
        });
      } else {
        pedidosRecentesContainer.innerHTML = '<p>Nenhum pedido recente.</p>';
      }
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Erro ao buscar pedidos recentes:', error);
    pedidosRecentesContainer.innerHTML = '<p>Erro ao carregar pedidos recentes.</p>';
  }
});
