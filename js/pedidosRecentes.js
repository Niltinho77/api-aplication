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
      console.log('Dados recebidos:', JSON.stringify(data, null, 2));
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
                <option value="retirado" ${pedido.situacao === 'retirado' ? 'selected' : ''}>Retirado</option>
              </select>
            </td>
          </tr>`;
        });

        conteudoTabela += '</table>';
        pedidosRecentes.innerHTML = conteudoTabela;

        const isAdmin = data.user && data.user.role === 'admin';
        console.log('User is admin:', isAdmin);

        document.querySelectorAll('.alterar-situacao').forEach(select => {
          select.disabled = !isAdmin;
          console.log(`Select ID: ${select.dataset.id} isDisabled: ${select.disabled}`);
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

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  fetch('/api/verifyToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }).then(response => {
    if (!response.ok) {
      throw new Error('Token inválido');
    }
    return response.json();
  }).then(data => {
    console.log('Resposta da API:', data);
    if (data.success) {
      const userRole = data.user ? data.user.role : null;
      console.log('User role:', userRole);
      if (userRole === 'admin') {
        document.getElementById('cadastroBtn').disabled = false;
        document.getElementById('entradaBtn').disabled = false;
        document.getElementById('saidaBtn').disabled = false;
        document.getElementById('openReportPage').disabled = false;
        document.getElementById('abrirEstoque').disabled = false;
        document.getElementById('cadastroPedidoBtn').style.display = 'block';
      } else {
        document.getElementById('abrirEstoque').disabled = false;
      }
      carregarPedidosRecentes(token);
    } else {
      throw new Error('Token inválido');
    }
  }).catch(error => {
    console.error(error);
    localStorage.removeItem('token');
    window.location.href = '/login.html';
  });
});
