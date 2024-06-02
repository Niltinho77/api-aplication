import api from './api.js';

async function carregarPedidosRecentes() {
  try {
    const response = await api('/api/pedidos_recentes', 'GET');
    const pedidosRecentes = document.getElementById('pedidosRecentes');

    if (response.success) {
      const pedidos = response.pedidos;

      if (pedidos.length > 0) {
        let conteudo = '<table border="1">';
        conteudo += `
          <tr>
            <th>Número</th>
            <th>Seção</th>
            <th>Depósito</th>
            <th>Situação</th>
          </tr>`;

        pedidos.forEach(pedido => {
          conteudo += `
            <tr>
              <td>${pedido.numero}</td>
              <td>${pedido.secao}</td>
              <td>${pedido.deposito}</td>
              <td>${pedido.situacao}</td>
            </tr>`;
        });

        conteudo += '</table>';
        pedidosRecentes.innerHTML = conteudo;
      } else {
        pedidosRecentes.innerHTML = '<p>Nenhum pedido recente encontrado.</p>';
      }
    } else {
      pedidosRecentes.innerHTML = '<p>Erro ao carregar pedidos recentes.</p>';
    }
  } catch (error) {
    console.error('Erro ao carregar pedidos recentes:', error);
    pedidosRecentes.innerHTML = '<p>Erro ao carregar pedidos recentes.</p>';
  }
}

document.addEventListener('DOMContentLoaded', carregarPedidosRecentes);
