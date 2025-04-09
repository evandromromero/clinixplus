// Utilitários para manipulação de datas no sistema
import { format, parse, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Formata uma data para exibição no formato brasileiro
 * @param {string|Date} date - Data a ser formatada
 * @param {string} formatStr - Formato desejado
 * @returns {string} Data formatada
 */
export const formatDate = (date, formatStr = 'dd/MM/yyyy') => {
  if (!date) return '';
  
  try {
    // Se for string ISO, converte para objeto Date
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (!isValid(dateObj)) return '';
    
    return format(dateObj, formatStr, { locale: ptBR });
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return '';
  }
};

/**
 * Normaliza uma data para o formato YYYY-MM-DD sem conversão de fuso horário
 * @param {string|Date} date - Data a ser normalizada
 * @returns {string} Data no formato YYYY-MM-DD
 */
export const normalizeDate = (date) => {
  if (!date) return format(new Date(), 'yyyy-MM-dd');
  
  try {
    // Se já for string no formato YYYY-MM-DD, retorna diretamente
    if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return date;
    }
    
    // Se for string ISO ou objeto Date
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (!isValid(dateObj)) {
      return format(new Date(), 'yyyy-MM-dd');
    }
    
    // Extrai ano, mês e dia sem conversão de fuso horário
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Erro ao normalizar data:', error);
    return format(new Date(), 'yyyy-MM-dd');
  }
};

/**
 * Cria uma string de data no formato ISO sem conversão de fuso horário
 * Isso é importante para evitar problemas com o Firebase que pode converter datas automaticamente
 * @param {string} dateString - Data no formato YYYY-MM-DD
 * @returns {string} Data no formato ISO sem conversão de fuso horário
 */
export const createISODateWithoutTimezone = (dateString) => {
  if (!dateString) return `${format(new Date(), 'yyyy-MM-dd')}T12:00:00.000Z`;
  
  try {
    // Garantir que estamos usando o formato correto
    const normalizedDate = normalizeDate(dateString);
    
    // Criar uma string ISO com horário fixo (meio-dia) para evitar problemas de fuso horário
    return `${normalizedDate}T12:00:00.000Z`;
  } catch (error) {
    console.error('Erro ao criar data ISO sem fuso horário:', error);
    return `${format(new Date(), 'yyyy-MM-dd')}T12:00:00.000Z`;
  }
};

/**
 * Extrai apenas a data (YYYY-MM-DD) de uma string ISO
 * @param {string} isoString - String de data no formato ISO
 * @returns {string} Data no formato YYYY-MM-DD
 */
export const extractDateFromISO = (isoString) => {
  if (!isoString) return format(new Date(), 'yyyy-MM-dd');
  
  try {
    // Extrair apenas a parte da data
    return isoString.split('T')[0];
  } catch (error) {
    console.error('Erro ao extrair data de string ISO:', error);
    return format(new Date(), 'yyyy-MM-dd');
  }
};

/**
 * Cria um objeto de data no fuso horário local a partir de uma string YYYY-MM-DD
 * @param {string} dateString - Data no formato YYYY-MM-DD
 * @returns {Date} Objeto Date no fuso horário local
 */
export const createLocalDate = (dateString) => {
  if (!dateString) return new Date();
  
  try {
    // Garante que estamos usando apenas a parte da data
    const [year, month, day] = dateString.split('-').map(Number);
    
    // Cria uma data no fuso horário local
    return new Date(year, month - 1, day, 12, 0, 0);
  } catch (error) {
    console.error('Erro ao criar data local:', error);
    return new Date();
  }
};
