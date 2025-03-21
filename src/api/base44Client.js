import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "67db59241111dc1b8c1c9500", 
  requiresAuth: false // Alterado para false para remover a verificação de autenticação
});
