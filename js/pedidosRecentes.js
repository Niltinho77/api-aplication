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
                <option value="concluído" ${pedido.situacao === 'concluído' ? 'selected' : ''}>Concluído</option>
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

        fetch('/api/verifyToken', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }).then(response => response.json()).then(data => {
          if (data.success && data.user.role === 'admin') {
            document.querySelectorAll('.alterar-situacao').forEach(select => {
              select.disabled = false;
            });
          }
        });
      } else {
        pedidosRecentes.innerHTML = '<p>Nenhum pedido recente encontrado.</p>';
      }
    })
    .catch(error => {
      console.error('Erro ao carregar pedidos recentes:', error);
    });
}

function alterarSituacaoPedido(id, situacao, token) {
  fetch(`/api/pedidos/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ situacao })
  })
    .then(response => {
      if (!response.ok) {
        return response.text().then(text => { throw new Error(`Erro ao alterar situação do pedido: ${text}`); });
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        carregarPedidosRecentes(token);
      } else {
        alert('Erro ao alterar situação do pedido.');
      }
    })
    .catch(error => {
      console.error('Erro ao alterar situação do pedido:', error);
    });
}
