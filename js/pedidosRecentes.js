import api from './api.js';

async function carregarPedidosRecentes() {
  try {
    const response = await api('/api/pedidosRecentes', 'GET');
    const pedidosRecentes = document.getElementById('pedidosRecentes');
    pedidosRecentes.innerHTML = '';

    if (response.success && response.pedidos.length > 0) {
      let conteudoTabela = `<table border="1">
        <tr>
          <th>Número do Pedido</th>
          <th>Seção</th>
          <th>Depósito</th>
          <th>Situação</th>
          <th>Ação</th>
        </tr>`;

      response.pedidos.forEach(pedido => {
        conteudoTabela += `<tr>
          <td>${pedido.numero}</td>
          <td>${pedido.secao}</td>
          <td>${pedido.deposito}</td>
          <td>${pedido.situacao}</td>
          <td>
            <select class="alterar-situacao" data-id="${pedido.numero}">
              <option value="em separação" ${pedido.situacao === 'em separação' ? 'selected' : ''}>Em Separação</option>
              <option value="aguardando retirada" ${pedido.situacao === 'aguardando retirada' ? 'selected' : ''}>Aguardando Retirada</option>
              <option value="concluído" ${pedido.situacao === 'concluído' ? 'selected' : ''}>Concluído</option>
            </select>
          </td>
        </tr>`;
      });

      conteudoTabela += '</table>';
      pedidosRecentes.innerHTML = conteudoTabela;

      document.querySelectorAll('.alterar-situacao').forEach(select => {
        select.addEventListener('change', function () {
          const numero = this.dataset.id;
          const situacao = this.value;
          alterarSituacaoPedido(numero, situacao);
        });
      });
    } else {
      pedidosRecentes.innerHTML = '<p>Nenhum pedido recente encontrado.</p>';
    }
  } catch (error) {
    console.error('Erro ao carregar pedidos recentes:', error);
  }
}

async function alterarSituacaoPedido(numero, situacao) {
  try {
    const response = await api(`/api/pedidos/${numero}`, 'PATCH', { situacao });
    if (response.success) {
      carregarPedidosRecentes();
    } else {
      alert('Erro ao alterar situação do pedido.');
    }
  } catch (error) {
    console.error('Erro ao alterar situação do pedido:', error);
  }
}

document.addEventListener('DOMContentLoaded', carregarPedidosRecentes);
