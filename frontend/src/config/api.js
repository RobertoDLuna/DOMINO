/**
 * Configuração Central de API e Sockets
 * Este arquivo unifica como o frontend se comunica com o backend.
 */

const isProduction = import.meta.env.PROD;

// Em produção, se a VITE_API_URL não estiver definida, assumimos que o 
// backend está no mesmo domínio/servidor que o frontend.
const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl;
  
  // Fallback para produção: usa o endereço atual do navegador (ex: https://dominio.com/api)
  if (isProduction) {
    return window.location.origin;
  }
  
  // Fallback para desenvolvimento local
  return 'http://localhost:3001';
};

export const API_BASE_URL = getBaseUrl();
export const API_URL = `${API_BASE_URL}/api`;
export const SOCKET_URL = API_BASE_URL;

console.log(`📡 [Rede] Ambiente: ${isProduction ? 'PRODUÇÃO' : 'DESENVOLVIMENTO'}`);
console.log(`🔗 [Rede] API URL: ${API_URL}`);
console.log(`🔌 [Rede] SOCKET URL: ${SOCKET_URL}`);
