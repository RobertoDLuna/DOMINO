describe('Autenticação EduGames', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('deve mostrar erro ao tentar logar com credenciais inválidas', () => {
    cy.get('[data-testid="email-input"]').type('errado@teste.com');
    cy.get('[data-testid="password-input"]').type('senhaerrada');
    cy.get('[data-testid="login-button"]').click();
    
    cy.contains('E-mail ou senha inválidos').should('be.visible');
  });

  it('deve realizar login com sucesso como administrador', () => {
    cy.login('admin@test.com', 'test123');
    
    // Deve ser redirecionado para o Hub
    cy.contains('Nossos Jogos').should('be.visible');
    cy.contains('Admin Teste').should('be.visible');
  });

  it('deve mostrar o Painel Admin na sidebar para administradores', () => {
    cy.login('admin@test.com', 'test123');
    
    // Verifica se o botão de Admin está na sidebar
    cy.get('aside').contains('Painel Admin').should('be.visible');
  });

  it('deve realizar logout corretamente', () => {
    cy.login('admin@test.com', 'test123');
    
    // Clica no botão de sair na sidebar
    cy.get('aside').contains('Sair').click();
    
    // Confirma o logout (se houver confirm)
    // Se o confirm do browser for usado, o Cypress aceita automaticamente
    // Mas se for um modal customizado, precisamos clicar nele.
    // Como no código vi confirm('Deseja realmente sair?'), o Cypress lida com isso.

    // Verifica se voltou para a tela de login
    cy.contains('Bem-vindo').should('be.visible');
  });
});
