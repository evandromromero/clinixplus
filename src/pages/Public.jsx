import React, { useState, useEffect, useRef } from 'react';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  ArrowRight, 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  Instagram, 
  Facebook, 
  CheckCircle,
  ChevronRight,
  Shield,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SlideShow from "../components/public/SlideShow";
import AboutModal from "../components/public/AboutModal";
import ServiceCarousel from "../components/public/ServiceCarousel";
import TestimonialCarousel from "../components/public/TestimonialCarousel";
import AddTestimonialDialog from "../components/public/AddTestimonialDialog";
import { Service, CompanySettings, Testimonial, SubscriptionPlan, checkEnabledPermission, ContactMessage } from "@/firebase/entities";
import SubscriptionPlansSection from '../components/public/SubscriptionPlansSection';
import GiftCardSection from '../components/public/GiftCardSection';
import SEOHead from '../components/SEOHead';

export default function Public() {
  const [featuredServices, setFeaturedServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [company, setCompany] = useState({
    name: "ClinixPlus",
    email: "contato@clinixplus.com.br",
    phone: "(11) 9999-9999",
    whatsapp: "(11) 8888-8888",
    address: "Av. Paulista, 1000 - Bela Vista, São Paulo, SP",
    city: "São Paulo",
    state: "SP",
    zipcode: "01310-100",
    opening_hours: {
      weekdays: "8h às 20h",
      weekend: "9h às 18h"
    },
    logo_url: "https://esthétique.com.br/wp-content/uploads/2023/08/logo-marca-dagua.png",
    facebook_url: "#",
    instagram_url: "#",
    website_description: "Transformando beleza e autoestima desde 2010, com tratamentos estéticos de excelência e profissionais altamente qualificados.",
    website_primary_color: "#294380",
    website_secondary_color: "#69D2CD",
    about_image_url: "",
    about_full_description: "",
    whatsapp_message: "Olá! Gostaria de agendar uma consulta na ClinixPlus.",
    seo_settings: {
      meta_title: "ClinixPlus - Clínica de Estética e Bem-estar",
      meta_description: "Transformando beleza e autoestima desde 2010, com tratamentos estéticos de excelência e profissionais altamente qualificados.",
      meta_keywords: "clínica, estética, beleza, saúde, bem-estar, tratamentos faciais, massagens",
      meta_author: "ClinixPlus",
      favicon_url: "",
      site_name: "ClinixPlus"
    }
  });
  const [slideshowImages, setSlideshowImages] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showTestimonialDialog, setShowTestimonialDialog] = useState(false);
  const [showSubscriptionsSection, setShowSubscriptionsSection] = useState(true);
  const [showGiftCardsSection, setShowGiftCardsSection] = useState(true);
  const [footerServices, setFooterServices] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Estados para o formulário de contato
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState({ success: false, message: '' });
  const formRef = useRef();

  useEffect(() => {
    loadCompanySettings();
    loadServices();
    loadSlideShowImages();
    loadTestimonials();
    loadSubscriptionPlans();
    checkFeaturePermissions();
  }, []);

  const loadCompanySettings = async () => {
    try {
      const settings = await CompanySettings.list();
      if (settings && settings.length > 0) {
        setCompany(settings[0]);
      }
    } catch (error) {
      console.error("Erro ao carregar configurações da empresa:", error);
    }
  };

  const loadServices = async () => {
    try {
      setIsLoading(true);
      const allServices = await Service.list();
      const filtered = allServices
        .filter(service => service.show_on_website)
        .sort((a, b) => (a.website_order || 999) - (b.website_order || 999))
        .slice(0, 6);
      
      setFeaturedServices(filtered);

      const footerServicesList = allServices
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 10);
      
      setFooterServices(footerServicesList);
    } catch (error) {
      console.error("Erro ao carregar serviços:", error);
      setFeaturedServices([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSlideShowImages = async () => {
    try {
      const SlideShowImage = (await import('@/firebase/entities')).SlideShowImage;
      const slides = await SlideShowImage.list('order');
      setSlideshowImages(slides.filter(slide => slide.active !== false));
    } catch (error) {
      console.error("Erro ao carregar imagens do slideshow:", error);
    }
  };

  const loadTestimonials = async () => {
    try {
      const data = await Testimonial.list();
      setTestimonials(data.filter(t => t.approved));
    } catch (error) {
      console.error("Erro ao carregar depoimentos:", error);
    }
  };

  const loadSubscriptionPlans = async () => {
    try {
      const plans = await SubscriptionPlan.list();
      const activePlans = plans.filter(plan => plan.is_active !== false);
      
      const services = await Service.list();
      
      const enrichedPlans = activePlans.map(plan => {
        const planServices = plan.services?.map(svc => {
          const serviceDetails = services.find(s => s.id === svc.service_id);
          return {
            ...svc,
            name: serviceDetails?.name || "Serviço"
          };
        }) || [];
        
        return {
          ...plan,
          services: planServices
        };
      });
      
      setSubscriptionPlans(enrichedPlans);
    } catch (error) {
      console.error("Erro ao carregar planos de assinatura:", error);
    }
  };

  const checkFeaturePermissions = async () => {
    try {
      // Verificar permissão para planos de assinatura
      const subscriptionsEnabled = await checkEnabledPermission('manage_subscriptions');
      setShowSubscriptionsSection(subscriptionsEnabled);
      
      // Verificar permissão para gift cards
      const giftCardsEnabled = await checkEnabledPermission('manage_gift_cards');
      setShowGiftCardsSection(giftCardsEnabled);
      
      console.log('Permissões verificadas:', { 
        subscriptions: subscriptionsEnabled, 
        giftCards: giftCardsEnabled 
      });
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      // Em caso de erro, manter as seções visíveis por padrão
    }
  };

  const defaultSlides = [
    {
      title: "Transforme sua beleza com tecnologia avançada",
      description: "Nossos tratamentos combinam tecnologia de ponta com profissionais especializados para resultados extraordinários.",
      image_url: "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
      button_text: "Conheça nossos tratamentos",
      button_url: "#services"
    },
    {
      title: "Experiência personalizada para sua pele",
      description: "Cada pele é única. Nossos tratamentos faciais são totalmente adaptados às suas necessidades específicas.",
      image_url: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
      button_text: "Agende uma avaliação",
      button_url: "#contact"
    },
    {
      title: "Bem-estar e relaxamento para corpo e mente",
      description: "Nossas massagens terapêuticas promovem o relaxamento profundo e restauram o equilíbrio do seu corpo.",
      image_url: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
      button_text: "Ver todas as terapias",
      button_url: "#services"
    }
  ];

  const slidesToDisplay = slideshowImages.length > 0 ? slideshowImages : defaultSlides;

  const benefits = [
    "Profissionais altamente qualificados",
    "Tecnologias de ponta",
    "Ambiente acolhedor e tranquilo",
    "Atendimento personalizado",
    "Protocolos exclusivos",
    "Resultados comprovados"
  ];

  const truncateText = (text, limit) => {
    if (!text) return '';
    if (text.length <= limit) return text;
    return text.slice(0, limit) + '...';
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price || 0);
  };

  const getFormattedAddress = () => {
    const address = company.address || "";
    const city = company.city ? `, ${company.city}` : "";
    const state = company.state ? ` - ${company.state}` : "";
    const zipcode = company.zipcode ? `, ${company.zipcode}` : "";
    
    return `${address}${city}${state}${zipcode}`;
  };

  const getGoogleMapsUrl = () => {
    const formattedAddress = encodeURIComponent(getFormattedAddress());
    return `https://maps.googleapis.com/maps/api/staticmap?center=${formattedAddress}&zoom=15&size=1200x400&markers=color:red%7C${formattedAddress}&key=DEMO_KEY`;
  };

  const formatWhatsAppLink = (phoneNumber, message) => {
    const cleanPhone = phoneNumber ? phoneNumber.replace(/\D/g, '') : '';
    const phone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const encodedMessage = encodeURIComponent(message || "Olá! Gostaria de agendar uma consulta.");
    return `https://wa.me/${phone}?text=${encodedMessage}`;
  };

  const defaultSubscriptionPlans = [
    {
      id: "default1",
      name: "Plano Básico",
      monthly_price: 199.90,
      description: "Ideal para quem está iniciando nos cuidados estéticos",
      services: [
        { quantity: 1, name: "Limpeza de Pele" },
        { quantity: 1, name: "Massagem Relaxante" }
      ],
      benefits: [
        "10% de desconto em produtos",
        "Avaliação mensal gratuita"
      ]
    },
    {
      id: "default2",
      name: "Plano Premium",
      monthly_price: 349.90,
      description: "Nossa opção mais completa para quem valoriza o autocuidado",
      services: [
        { quantity: 1, name: "Limpeza de Pele Profunda" },
        { quantity: 2, name: "Massagem Relaxante" },
        { quantity: 1, name: "Tratamento Facial" }
      ],
      benefits: [
        "15% de desconto em produtos",
        "Avaliação mensal gratuita",
        "Acesso a workshops exclusivos"
      ]
    },
    {
      id: "default3",
      name: "Plano Família",
      monthly_price: 599.90,
      description: "Perfeito para compartilhar bem-estar com quem você ama",
      services: [
        { quantity: 2, name: "Limpeza de Pele" },
        { quantity: 2, name: "Massagem Relaxante" },
        { quantity: 2, name: "Tratamento à escolha" }
      ],
      benefits: [
        "20% de desconto em produtos",
        "Avaliações gratuitas",
        "Horários preferenciais"
      ]
    }
  ];

  const plansToDisplay = subscriptionPlans.length > 0 ? subscriptionPlans : defaultSubscriptionPlans;

  // Serviços padrão para exibir quando não houver serviços cadastrados
  const defaultServices = [
    {
      name: "Tratamentos Faciais",
      description: "Nossas terapias faciais são personalizadas para atender às necessidades específicas da sua pele.",
      image_url: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=500&q=80"
    },
    {
      name: "Massagens Terapêuticas",
      description: "Técnicas avançadas de massagem para relaxar, regenerar e revitalizar seu corpo.",
      image_url: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=500&q=80"
    },
    {
      name: "Tratamentos Corporais",
      description: "Soluções inovadoras para modelagem corporal, redução de medidas e tratamento da celulite.",
      image_url: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=500&q=80"
    }
  ];

  const servicesDisplay = featuredServices.length > 0 ? featuredServices : defaultServices;

  // Função para validar o formulário de contato
  const validateForm = () => {
    const errors = {};
    
    if (!contactForm.name.trim()) {
      errors.name = "Nome é obrigatório";
    }
    
    if (!contactForm.email.trim()) {
      errors.email = "E-mail é obrigatório";
    } else if (!/\S+@\S+\.\S+/.test(contactForm.email)) {
      errors.email = "E-mail inválido";
    }
    
    if (!contactForm.phone.trim()) {
      errors.phone = "Telefone é obrigatório";
    }
    
    if (!contactForm.subject || contactForm.subject === "Selecione um assunto") {
      errors.subject = "Selecione um assunto";
    }
    
    if (!contactForm.message.trim()) {
      errors.message = "Mensagem é obrigatória";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Função para enviar o formulário de contato
  const handleSendContactForm = async (e) => {
    e.preventDefault();
    
    // Validar formulário
    if (!validateForm()) {
      return;
    }
    
    setIsSending(true);
    setSendResult({ success: false, message: '' });
    
    try {
      // Preparar os dados da mensagem
      const messageData = {
        name: contactForm.name,
        email: contactForm.email,
        phone: contactForm.phone,
        subject: contactForm.subject,
        message: contactForm.message,
        company_name: company.name,
        to_email: company.email
      };
      
      // Salvar mensagem no Firebase
      await ContactMessage.create(messageData);
      
      // Sucesso
      setSendResult({
        success: true,
        message: 'Mensagem enviada com sucesso! Entraremos em contato em breve.'
      });
      
      // Limpar formulário
      setContactForm({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setSendResult({
        success: false,
        message: 'Erro ao enviar mensagem. Por favor, tente novamente ou entre em contato por telefone.'
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-white min-h-screen">
      <SEOHead 
        title={company.seo_settings.meta_title} 
        description={company.seo_settings.meta_description} 
        keywords={company.seo_settings.meta_keywords} 
        author={company.seo_settings.meta_author} 
        favicon={company.seo_settings.favicon_url} 
        siteName={company.seo_settings.site_name} 
      />
      <header className="bg-[#11142D] text-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center py-2 gap-2">
            {/* Contatos - Lado Esquerdo */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <a href={`tel:${company.phone}`} className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {company.phone}
              </a>
              <a href={`mailto:${company.email}`} className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {company.email}
              </a>
            </div>
            
            {/* Botão Painel - Lado Direito */}
            <div className="flex items-center gap-3">
              {company.facebook_url && (
                <a href={company.facebook_url} className="text-white/70 hover:text-[#69D2CD]">
                  <Facebook className="h-4 w-4" />
                </a>
              )}
              {company.instagram_url && (
                <a href={company.instagram_url} className="text-white/70 hover:text-[#69D2CD]">
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              <Link
                to={createPageUrl("ClientPortal")}
                className="bg-[#69D2CD]/20 text-white px-3 py-1.5 rounded-md text-sm hover:bg-[#69D2CD]/30 transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                Área do Cliente
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to={createPageUrl("Login")}
                className="bg-[#69D2CD] text-white px-3 py-1.5 rounded-md text-sm hover:bg-[#5BC1BB] transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                Painel Administrativo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div>
              <img 
                src={company.logo_url} 
                alt={company.name} 
                className="h-10 md:h-12 w-auto"
              />
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6 text-sm">
              <a href="#home" className="hover:text-[#69D2CD] transition-colors">Home</a>
              <a href="#services" className="hover:text-[#69D2CD] transition-colors">Serviços</a>
              <a href="#about" className="hover:text-[#69D2CD] transition-colors">Sobre</a>
              {showSubscriptionsSection && (
                <a href="#subscriptions" className="hover:text-[#69D2CD] transition-colors">Planos</a>
              )}
              {showGiftCardsSection && (
                <a href="#gift-cards" className="hover:text-[#69D2CD] transition-colors">Gift Cards</a>
              )}
              <a href="#testimonials" className="hover:text-[#69D2CD] transition-colors">Depoimentos</a>
              <a href="#contact" className="hover:text-[#69D2CD] transition-colors">Contato</a>
            </div>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-md"
            >
              {isMobileMenuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile Navigation */}
          <div className={`md:hidden ${isMobileMenuOpen ? 'block' : 'hidden'} pt-4`}>
            <div className="flex flex-col gap-4">
              <a href="#home" className="hover:text-[#69D2CD] transition-colors py-2">Home</a>
              <a href="#services" className="hover:text-[#69D2CD] transition-colors py-2">Serviços</a>
              <a href="#about" className="hover:text-[#69D2CD] transition-colors py-2">Sobre</a>
              {showSubscriptionsSection && (
                <a href="#subscriptions" className="hover:text-[#69D2CD] transition-colors py-2">Planos</a>
              )}
              {showGiftCardsSection && (
                <a href="#gift-cards" className="hover:text-[#69D2CD] transition-colors py-2">Gift Cards</a>
              )}
              <a href="#testimonials" className="hover:text-[#69D2CD] transition-colors py-2">Depoimentos</a>
              <a href="#contact" className="hover:text-[#69D2CD] transition-colors py-2">Contato</a>
            </div>
          </div>
        </div>
      </nav>

      <section id="home" className="relative h-[600px]">
        <SlideShow slides={slidesToDisplay.map(slide => ({
          title: slide.title,
          description: slide.description,
          image: slide.image_url,
          button: {
            text: slide.button_text,
            url: slide.button_url
          }
        }))} />
      </section>

      <section id="services" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#0D0F36] mb-4">Nossos Serviços Especializados</h2>
            <p className="text-gray-600 max-w-3xl mx-auto">
              Oferecemos uma ampla gama de tratamentos estéticos adaptados às suas necessidades individuais, utilizando as mais avançadas tecnologias e produtos de alta qualidade.
            </p>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#294380]"></div>
            </div>
          ) : (
            <ServiceCarousel 
              services={servicesDisplay} 
              formatPrice={formatPrice}
              formatWhatsAppLink={formatWhatsAppLink}
              companyWhatsapp={company.whatsapp}
              whatsappMessage={company.whatsapp_message}
            />
          )}
        </div>
      </section>

      {showSubscriptionsSection && (
        <SubscriptionPlansSection plans={plansToDisplay} />
      )}

      {showGiftCardsSection && (
        <GiftCardSection />
      )}

      <section id="about" className="py-20 bg-gradient-to-br from-[#F1F6CE]/20 to-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <img 
                src={company.about_image_url || "https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"} 
                alt="Nossa Clínica" 
                className="rounded-lg shadow-lg"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";
                }}
              />
            </div>
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-[#0D0F36] mb-4">Sobre a {company.name}</h2>
              <p className="text-gray-700">
                {truncateText(company.website_description, 150)}
              </p>
              
              <div className="grid grid-cols-2 gap-4 pt-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle className="text-[#69D2CD] h-5 w-5 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
              
              <div className="pt-4">
                <AboutModal 
                  title={`Sobre a ${company.name}`} 
                  description={company.about_full_description || `Fundada em 2010, a ${company.name} nasceu do desejo de oferecer tratamentos estéticos inovadores com resultados reais e duradouros. Nossa equipe multidisciplinar é formada por profissionais altamente qualificados, apaixonados por transformar vidas através da beleza e bem-estar.\n\nUtilizamos tecnologias de ponta e seguimos rigorosos protocolos de qualidade e biossegurança para garantir a sua satisfação e segurança em todos os procedimentos.`}
                >
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    {benefits.map((benefit, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className="text-[#69D2CD] h-5 w-5 flex-shrink-0" />
                        <span className="text-gray-700">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </AboutModal>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="testimonials" className="py-20 bg-[#0D0F36] text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">O Que Nossos Clientes Dizem</h2>
            <p className="text-white/80 max-w-3xl mx-auto">
              A satisfação de nossos clientes é nossa maior conquista. Confira alguns depoimentos de quem já experimentou nossos tratamentos.
            </p>
          </div>
          
          <TestimonialCarousel testimonials={testimonials} />
          
          <div className="text-center mt-12">
            <AddTestimonialDialog />
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-[#294380] to-[#69D2CD]">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Transforme-se com a {company.name}</h2>
          <p className="text-white/90 max-w-2xl mx-auto mb-8">
            Agende uma avaliação gratuita e descubra os tratamentos ideais para suas necessidades estéticas.
          </p>
          <a 
            href={formatWhatsAppLink(company.whatsapp, company.whatsapp_message)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center bg-white text-[#294380] hover:bg-[#F1F6CE] px-6 py-3 rounded-md font-medium transition-colors"
          >
            Agendar Consulta
            <Calendar className="ml-2 h-4 w-4" />
          </a>
        </div>
      </section>

      <section id="contact" className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-[#0D0F36] mb-4">Entre em Contato</h2>
              <p className="text-gray-600">
                Estamos à disposição para tirar suas dúvidas e agendar sua consulta. Preencha o formulário ao lado ou entre em contato por um dos canais abaixo.
              </p>
              
              <div className="space-y-4 pt-4">
                <div className="flex items-start gap-4">
                  <MapPin className="text-[#294380] h-6 w-6 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-[#0D0F36]">Endereço</h4>
                    <p className="text-gray-600">{getFormattedAddress()}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <Phone className="text-[#294380] h-6 w-6 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-[#0D0F36]">Telefone</h4>
                    <p className="text-gray-600">{company.phone}</p>
                    {company.whatsapp && (
                      <p className="text-gray-600">{company.whatsapp} (WhatsApp)</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <Mail className="text-[#294380] h-6 w-6 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-[#0D0F36]">E-mail</h4>
                    <p className="text-gray-600">{company.email}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <Clock className="text-[#294380] h-6 w-6 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-[#0D0F36]">Horário de Funcionamento</h4>
                    <p className="text-gray-600">Segunda a Sexta: {company.opening_hours?.weekdays}</p>
                    <p className="text-gray-600">Sábado: {company.opening_hours?.weekend}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold text-[#0D0F36] mb-4">Envie sua mensagem</h3>
              <form 
                ref={formRef} 
                className="space-y-4" 
                onSubmit={handleSendContactForm}
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
                  <input 
                    type="text" 
                    value={contactForm.name} 
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[#69D2CD] focus:border-transparent"
                  />
                  {formErrors.name && (
                    <p className="text-red-600 text-sm">{formErrors.name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                  <input 
                    type="email" 
                    value={contactForm.email} 
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[#69D2CD] focus:border-transparent"
                  />
                  {formErrors.email && (
                    <p className="text-red-600 text-sm">{formErrors.email}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <input 
                    type="tel" 
                    value={contactForm.phone} 
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[#69D2CD] focus:border-transparent"
                  />
                  {formErrors.phone && (
                    <p className="text-red-600 text-sm">{formErrors.phone}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assunto</label>
                  <select 
                    value={contactForm.subject} 
                    onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[#69D2CD] focus:border-transparent"
                  >
                    <option>Selecione um assunto</option>
                    <option>Agendamento</option>
                    <option>Informações sobre tratamentos</option>
                    <option>Preços</option>
                    <option>Outros</option>
                  </select>
                  {formErrors.subject && (
                    <p className="text-red-600 text-sm">{formErrors.subject}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem</label>
                  <textarea 
                    rows="4" 
                    value={contactForm.message} 
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[#69D2CD] focus:border-transparent"
                  ></textarea>
                  {formErrors.message && (
                    <p className="text-red-600 text-sm">{formErrors.message}</p>
                  )}
                </div>
                <Button 
                  type="submit" 
                  className="bg-[#294380] hover:bg-[#0D0F36] w-full"
                  disabled={isSending}
                >
                  {isSending ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[#69D2CD]"></div>
                      <span className="ml-2">Enviando...</span>
                    </div>
                  ) : (
                    <span>Enviar mensagem</span>
                  )}
                </Button>
                {sendResult.success && (
                  <p className="text-green-600 text-sm mt-2">{sendResult.message}</p>
                )}
                {sendResult.success === false && sendResult.message && (
                  <p className="text-red-600 text-sm mt-2">{sendResult.message}</p>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>

      <section className="h-80 bg-gray-200">
        <div className="h-full w-full bg-center bg-cover" style={{ backgroundImage: `url('${getGoogleMapsUrl()}')` }}>
        </div>
      </section>

      <footer className="bg-[#0D0F36] text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <img src={company.logo_url} alt={company.name} className="h-12 mb-4" />
              <p className="text-white/70 mb-4">
                {company.website_description}
              </p>
              <div className="flex gap-4">
                {company.instagram_url && (
                  <a href={company.instagram_url} className="text-white/70 hover:text-[#69D2CD]">
                    <Instagram className="h-5 w-5" />
                  </a>
                )}
                {company.facebook_url && (
                  <a href={company.facebook_url} className="text-white/70 hover:text-[#69D2CD]">
                    <Facebook className="h-5 w-5" />
                  </a>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-medium mb-4">Links Rápidos</h4>
              <ul className="space-y-2">
                <li><a href="#home" className="text-white/70 hover:text-[#69D2CD]">Home</a></li>
                <li><a href="#services" className="text-white/70 hover:text-[#69D2CD]">Serviços</a></li>
                <li><a href="#about" className="text-white/70 hover:text-[#69D2CD]">Sobre Nós</a></li>
                <li><a href="#testimonials" className="text-white/70 hover:text-[#69D2CD]">Depoimentos</a></li>
                <li><a href="#contact" className="text-white/70 hover:text-[#69D2CD]">Contato</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-medium mb-4">Nossos Serviços</h4>
              <ul className="space-y-2">
                {footerServices.length > 0 ? (
                  footerServices.map((service, index) => (
                    <li key={index}>
                      <a href="#services" className="text-white/70 hover:text-[#69D2CD]">
                        {service.name}
                      </a>
                    </li>
                  ))
                ) : (
                  <>
                    <li><a href="#" className="text-white/70 hover:text-[#69D2CD]">Tratamentos Faciais</a></li>
                    <li><a href="#" className="text-white/70 hover:text-[#69D2CD]">Massagens Terapêuticas</a></li>
                    <li><a href="#" className="text-white/70 hover:text-[#69D2CD]">Tratamentos Corporais</a></li>
                    <li><a href="#" className="text-white/70 hover:text-[#69D2CD]">Depilação a Laser</a></li>
                    <li><a href="#" className="text-white/70 hover:text-[#69D2CD]">Rejuvenescimento</a></li>
                  </>
                )}
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-medium mb-4">Contato</h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-[#69D2CD] flex-shrink-0 mt-0.5" />
                  <span className="text-white/70">{getFormattedAddress()}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-[#69D2CD] flex-shrink-0" />
                  <span className="text-white/70">{company.phone}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-[#69D2CD] flex-shrink-0" />
                  <span className="text-white/70">{company.email}</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/10 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center">
            <p className="text-white/50 text-sm"> 2024 {company.name}. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
