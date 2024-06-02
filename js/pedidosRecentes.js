document.addEventListener('DOMContentLoaded', () => {
  carregarPedidosRecentes();
});

function carregarPedidosRecentes() {
  fetch('/api/pedidosRecentes')
    .then(response => response.json())
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
            <th>Ação</th>
          </tr>`;

        data.pedidos.forEach(pedido => {
          conteudoTabela += `<tr>
            <td>${pedido.numero}</td>
            <td>${pedido.secao}</td>
            <td>${pedido.deposito}</td>
            <td>${pedido.situacao}</td>
            <td>
              <select class="alterar-situacao" data-id="${pedido.id}" style="display: none;">
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
            alterarSituacaoPedido(id, situacao);
          });
        });

        const token = localStorage.getItem('token');
        fetch('/api/verifyToken', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }).then(response => response.json()).then(data => {
          if (data.success && data.user.role === 'admin') {
            document.querySelectorAll('.alterar-situacao').forEach(select => {
              select.style.display = 'inline-block';
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

function alterarSituacaoPedido(id, situacao) {
  fetch(`/api/pedidos/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({ situacao })
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        carregarPedidosRecentes();
      } else {
        alert('Erro ao alterar situação do pedido.');
      }
    })
    .catch(error => {
      console.error('Erro ao alterar situação do pedido:', error);
    });
}
