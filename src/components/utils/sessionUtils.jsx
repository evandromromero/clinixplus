/**
 * Este arquivo ainda pode ser usado em outras partes do aplicativo
 * mas estamos implementando a mesma função diretamente nos componentes
 * que estavam causando erro de importação
 */
export const calculateTotalSessions = (services) => {
  if (!services || !Array.isArray(services)) {
    return 0;
  }
  
  return services.reduce((total, service) => {
    return total + (service.quantity || 0);
  }, 0);
};

export const calculateRemainingSessionsForPackage = (clientPackage) => {
  if (!clientPackage) return 0;
  
  const totalSessions = clientPackage.total_sessions || 0;
  const usedSessions = clientPackage.sessions_used || 0;
  
  return Math.max(0, totalSessions - usedSessions);
};

export const isPackageExpired = (clientPackage) => {
  if (!clientPackage || !clientPackage.expiration_date) return true;
  
  const today = new Date();
  const expirationDate = new Date(clientPackage.expiration_date);
  
  return today > expirationDate;
};