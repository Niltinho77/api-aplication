// Define a função para abrir a página de cadastro de produtos em uma nova janela
function abrirCadastro() {
  window.open('cadastro.html', 'Cadastro', 'width=1200,height=800');
}

// Define a função para abrir a página de entrada de produtos em uma nova janela
function abrirEntrada() {
  window.open('entrada.html', 'Entrada', 'width=1200,height=800');
}

// Define a função para abrir a página de saída de produtos em uma nova janela
function abrirSaida() {
  window.open('saida.html', 'Saída', 'width=1200,height=800');
}

// Define a função para abrir a página de visualização do estoque de produtos em uma nova janela
function abrirEstoque() {
  window.open('estoque.html', 'Estoque', 'width=1200,height=800');
}

// Adiciona um ouvinte de evento ao botão de geração de relatórios para abrir a respectiva página em uma nova janela
document.getElementById('openReportPage').addEventListener('click', function() {
  window.open('relatorios.html', 'Relatórios', 'width=1200,height=800'); // Abre em uma nova janela
});

  
  