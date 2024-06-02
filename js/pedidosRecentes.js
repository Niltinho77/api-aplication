async function api(url, method, body = null) {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const options = {
    method,
    headers
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  return response.json();
}

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
            <select class="alterar-situacao" data-id="${pedido.id}">
              <option value="em separação" ${pedido.situacao === 'em separação' ? 'selected' : ''}>Em Separação</option>
              <option value="aguardando retirada" ${pedido.situacao === 'aguardando retirada' ? 'selected' : ''}>Aguardando Retirada</option>
              <option value="retirado" ${pedido.situacao === 'retirado' ? 'selected' : ''}>Retirado</option>
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
          alterarSituacaoPedido(id, situacao);
        });
      });
    } else {
      pedidosRecentes.innerHTML = '<p>Nenhum pedido recente encontrado.</p>';
    }
  } catch (error) {
    console.error('Erro ao carregar pedidos recentes:', error);
  }
}

async function alterarSituacaoPedido(id, situacao) {
  try {
    const response = await api(`/api/pedidos/${id}`, 'PATCH', { situacao });
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
