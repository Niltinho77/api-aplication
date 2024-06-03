document.getElementById('consultaPedidoForm').addEventListener('submit', async function(event) {
    event.preventDefault();
  
    const numero = document.getElementById('numero').value;
    const secao = document.getElementById('secao').value;
    const token = localStorage.getItem('token');
    const resultadosDiv = document.getElementById('resultados');
  
    try {
      const response = await fetch('/api/consultaPedidos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ numero, secao })
      });
  
      const result = await response.json();
  
      if (response.ok) {
        resultadosDiv.innerHTML = '';
        result.pedidos.forEach(pedido => {
          const pedidoElement = document.createElement('div');
          pedidoElement.innerHTML = `
            <p><strong>Número:</strong> ${pedido.numero}</p>
            <p><strong>Seção:</strong> ${pedido.secao}</p>
            <p><strong>Depósito:</strong> ${pedido.deposito}</p>
            <p><strong>Situação:</strong> ${pedido.situacao}</p>
            <button onclick="excluirPedido(${pedido.id})">Excluir Pedido</button>
          `;
          resultadosDiv.appendChild(pedidoElement);
        });
      } else {
        resultadosDiv.innerHTML = `<p style="color: red;">Erro: ${result.message}</p>`;
      }
    } catch (error) {
      console.error('Erro ao consultar pedido:', error);
      resultadosDiv.innerHTML = '<p style="color: red;">Erro ao consultar pedido.</p>';
    }
  });
  
  async function excluirPedido(id) {
    const token = localStorage.getItem('token');
  
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
        document.getElementById('consultaPedidoForm').submit();
      } else {
        alert(`Erro ao excluir pedido: ${result.message}`);
      }
    } catch (error) {
      console.error('Erro ao excluir pedido:', error);
      alert('Erro ao excluir pedido.');
    }
  }
  