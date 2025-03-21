import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronRightIcon } from 'lucide-react';

export default function ServiceCarousel({ services, formatPrice, formatWhatsAppLink, companyWhatsapp, whatsappMessage }) {
  const [currentPage, setCurrentPage] = useState(0);
  const servicesPerPage = 3;
  const totalPages = Math.ceil(services.length / servicesPerPage);
  
  // Auto-rotação do carrossel
  useEffect(() => {
    if (services.length <= servicesPerPage) return;
    
    const interval = setInterval(() => {
      setCurrentPage((prev) => (prev === totalPages - 1 ? 0 : prev + 1));
    }, 6000);
    
    return () => clearInterval(interval);
  }, [totalPages, services.length, servicesPerPage]);
  
  const nextPage = () => {
    setCurrentPage((prev) => (prev === totalPages - 1 ? 0 : prev + 1));
  };
  
  const prevPage = () => {
    setCurrentPage((prev) => (prev === 0 ? totalPages - 1 : prev - 1));
  };
  
  const currentServices = services.slice(
    currentPage * servicesPerPage,
    (currentPage + 1) * servicesPerPage
  );
  
  return (
    <div className="relative">
      <div className="grid md:grid-cols-3 gap-10">
        {currentServices.map((service, index) => (
          <div key={index} className="bg-white rounded-lg shadow-lg overflow-hidden transition-transform hover:transform hover:scale-105">
            <div className="h-60 overflow-hidden">
              <img 
                src={service.image_url || `https://images.unsplash.com/photo-${1570172619644 + index * 10000}-dfd03ed5d881?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80`} 
                alt={service.name} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null; 
                  e.target.src = "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80";
                }}
              />
            </div>
            <div className="p-6">
              <h3 className="text-xl font-semibold text-[#294380] mb-2">{service.name}</h3>
              <p className="text-gray-600 mb-4">{service.description}</p>
              {service.price && service.show_price_on_website && (
                <p className="text-lg font-bold text-[#0D0F36] mb-4">
                  {formatPrice(service.price)}
                </p>
              )}
              <a 
                href={formatWhatsAppLink(companyWhatsapp, whatsappMessage)}
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center bg-[#294380] text-white hover:bg-[#1a2a55] px-4 py-2 rounded font-medium transition-colors"
              >
                Agendar Agora
                <ChevronRight className="ml-1 h-4 w-4" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Mostrar controles de navegação apenas se houver mais de uma página */}
      {totalPages > 1 && (
        <>
          <button 
            onClick={prevPage}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 p-2 bg-white rounded-full shadow-md text-[#0D0F36] hover:bg-[#69D2CD]/20"
            aria-label="Página anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <button 
            onClick={nextPage}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 p-2 bg-white rounded-full shadow-md text-[#0D0F36] hover:bg-[#69D2CD]/20"
            aria-label="Próxima página"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          
          {/* Indicadores de página */}
          <div className="flex justify-center gap-2 mt-6">
            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  index === currentPage 
                    ? 'bg-[#294380] scale-110' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Ir para página ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}