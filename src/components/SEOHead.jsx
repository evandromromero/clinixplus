import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';

/**
 * Componente para gerenciar as meta tags SEO do site
 * @param {Object} props - Propriedades do componente
 * @param {string} props.title - Título da página
 * @param {string} props.description - Descrição da página
 * @param {string} props.keywords - Palavras-chave da página
 * @param {string} props.author - Autor da página
 * @param {string} props.faviconUrl - URL do favicon
 * @param {string} props.siteName - Nome do site
 */
const SEOHead = ({ 
  title, 
  description, 
  keywords, 
  author, 
  faviconUrl, 
  siteName 
}) => {
  // Valores padrão caso não sejam fornecidos
  const pageTitle = title || siteName || 'ClinixPlus';
  const pageDescription = description || 'Sistema de gestão para clínicas de estética';
  const pageKeywords = keywords || 'clínica, estética, beleza, saúde, bem-estar';
  const pageAuthor = author || 'ClinixPlus';
  const pageFavicon = faviconUrl || '/favicon.ico';

  // Atualiza o título da página
  useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);

  return (
    <Helmet>
      {/* Meta tags básicas */}
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta name="keywords" content={pageKeywords} />
      <meta name="author" content={pageAuthor} />
      
      {/* Meta tags Open Graph para compartilhamento em redes sociais */}
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={siteName || 'ClinixPlus'} />
      
      {/* Meta tags Twitter Card */}
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      
      {/* Favicon */}
      <link rel="icon" href={pageFavicon} />
      <link rel="shortcut icon" href={pageFavicon} />
    </Helmet>
  );
};

export default SEOHead;
