describe('Navegação e Jogos', () => {
  beforeEach(() => {
    cy.login('admin@test.com', 'test123');
  });

  it('deve permitir entrar no lobby de Dominó', () => {
    cy.contains('Dominó Seduc').click();
    cy.contains('Explorar Jogos').should('be.visible');
  });

  it('deve permitir criar uma sala de Dominó', () => {
    cy.contains('Dominó Seduc').click();
    
    // Seleciona o primeiro tema disponível no grid
    cy.get('main').find('button').filter(':has(h3)').first().click({ force: true });
    
    // Clica em Jogar Agora no modal
    cy.contains('JOGAR AGORA!').click();
    
    // Verifica se entrou na sala
    cy.contains(/Aguardando Participantes/i, { timeout: 15000 }).should('be.visible');
  });

  it('deve permitir entrar no lobby de Xadrez', () => {
    cy.contains('Xadrez Real').click();
    
    // Inicia fluxo de criação de sala PVP
    cy.contains('Jogador vs Jogador').click();
    cy.contains('Criar Sala').first().click();
    cy.get('#btn-create-chess-room').click();
    
    // Verifica se a sala foi criada
    cy.contains('Código da Sala', { timeout: 10000 }).should('be.visible');
  });
});
