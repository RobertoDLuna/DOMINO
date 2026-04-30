describe('Painel Administrativo', () => {
  beforeEach(() => {
    cy.login('admin@test.com', 'test123');
  });

  it('deve abrir o painel administrativo através da sidebar', () => {
    cy.get('aside').contains('Painel Admin').click();
    
    // Verifica se o modal do painel admin abriu
    cy.contains('PAINEL ADMIN').should('be.visible');
    cy.contains('Usuários').should('be.visible');
  });

  it('deve permitir fechar o painel administrativo', () => {
    cy.get('aside').contains('Painel Admin').click();
    // Clica no botão de fechar (X)
    cy.get('button[title="Fechar Painel"]').click();
    
    // Verifica se voltou ao Hub
    cy.contains('PAINEL ADMIN').should('not.exist');
    cy.contains('Nossos Jogos').should('be.visible');
  });
});
