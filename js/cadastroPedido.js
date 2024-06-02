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

    if (result.success) {
      mensagemDiv.innerHTML = '<p style="color: green;">Pedido cadastrado com sucesso!</p>';
      document.getElementById('cadastroPedidoForm').reset();
    } else {
      mensagemDiv.innerHTML = `<p style="color: red;">Erro: ${result.message}</p>`;
    }
  } catch (error) {
    console.error('Erro ao cadastrar pedido:', error);
    mensagemDiv.innerHTML = '<p style="color: red;">Erro ao cadastrar pedido.</p>';
  }
});
