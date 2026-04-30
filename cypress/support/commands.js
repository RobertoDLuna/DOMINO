Cypress.Commands.add('login', (email, password) => {
  cy.visit('/login');
  cy.get('[data-testid="email-input"]').type(email);
  cy.get('[data-testid="password-input"]').type(password);
  cy.get('[data-testid="login-button"]').click();
  
  // Aguarda o redirecionamento para o Hub
  cy.contains('Nossos Jogos', { timeout: 10000 }).should('be.visible');
});
