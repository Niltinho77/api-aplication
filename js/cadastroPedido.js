document.getElementById('cadastroPedidoForm').addEventListener('submit', async function(event) {
  event.preventDefault();

  const numero = document.getElementById('numero').value;
  const secao = document.getElementById('secao').value;
  const deposito = document.getElementById('deposito').value;
  const situacao = document.getElementById('situacao').value;

  const token = localStorage.getItem('token');
  const mensagemDiv = document.getElementById('mensagem');

  try {
    const response = await fetch('/api/pedidos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ numero, secao, deposito, situacao })
    });

    const result = await response.json();

    if (response.status === 201) {
      mensagemDiv.innerHTML = '<p style="color: green;">Pedido cadastrado com sucesso!</p>';
      window.opener.carregarPedidosRecentes(token, true); // Atualiza a página inicial
      window.close(); // Fecha a janela de cadastro
    } else {
      mensagemDiv.innerHTML = `<p style="color: red;">Erro: ${result.message}</p>`;
    }
  } catch (error) {
    console.error('Erro ao cadastrar pedido:', error);
    mensagemDiv.innerHTML = '<p style="color: red;">Erro ao cadastrar pedido.</p>';
  }
});
