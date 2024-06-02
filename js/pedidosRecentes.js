document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (token) {
    carregarPedidosRecentes(token);
  } else {
    window.location.href = '/login.html';
  }
});

function carregarPedidosRecentes(token) {
  fetch('/api/pedidosRecentes', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })
    .then(response => {
      if (!response.ok) {
        return response.text().then(text => { throw new Error(`Erro ao carregar pedidos recentes: ${text}`); });
      }
      return response.json();
    })
    .then(data => {
      console.log('Dados recebidos:', JSON.stringify(data, null, 2)); // Log detalhado dos dados recebidos
      const pedidosRecentes = document.getElementById('pedidosRecentes');
      pedidosRecentes.innerHTML = '';

      if (data.success && data.pedidos.length > 0) {
        let conteudoTabela = `<table border="1">
          <tr>
            <th>Número do Pedido</th>
            <th>Seção</th>
            <th>Depósito</th>
            <th>Situação</th>
          </tr>`;

        data.pedidos.forEach(pedido => {
          conteudoTabela += `<tr>
            <td>${pedido.numero}</td>
            <td>${pedido.secao}</td>
            <td>${pedido.deposito}</td>
            <td>
              <select class="alterar-situacao" data-id="${pedido.id}">
                <option value="em separação" ${pedido.situacao === 'em separação' ? 'selected' : ''}>Em Separação</option>
                <option value="aguardando retirada" ${pedido.situacao === 'aguardando retirada' ? 'selected' : ''}>Aguardando Retirada</option>
                <option value="concluido" ${pedido.situacao === 'concluido' ? 'selected' : ''}>concluido</option>
              </select>
            </td>
          </tr>`;
        });

        conteudoTabela += '</table>';
        pedidosRecentes.innerHTML = conteudoTabela;

        document.querySelectorAll('.alterar-situacao').forEach(select => {
          select.addEventListener('change', function () {
            const id = this.dataset.id;
            const situacao = this.value;
            alterarSituacaoPedido(id, situacao, token);
          });
        });
      } else {
        pedidosRecentes.innerHTML = '<p>Nenhum pedido recente encontrado.</p>';
      }
    })
    .catch(error => {
      console.error('Erro ao carregar pedidos recentes:', error);
    });
}
