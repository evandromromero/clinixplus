import React, { useState, useEffect } from 'react';
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
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SlideShow from "../components/public/SlideShow";
import AboutModal from "../components/public/AboutModal";
import ServiceCarousel from "../components/public/ServiceCarousel";
import TestimonialCarousel from "../components/public/TestimonialCarousel";
import AddTestimonialDialog from "../components/public/AddTestimonialDialog";
import { Service, CompanySettings, Testimonial, SubscriptionPlan } from "@/firebase/entities";
import SubscriptionPlansSection from '../components/public/SubscriptionPlansSection';
import GiftCardSection from '../components/public/GiftCardSection';

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
    whatsapp_message: "Olá! Gostaria de agendar uma consulta na ClinixPlus."
  });
  const [slideshowImages, setSlideshowImages] = useState([]);
  const [footerServices, setFooterServices] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);

  useEffect(() => {
    loadCompanySettings();
    loadServices();
    loadSlideShowImages();
    loadTestimonials();
    loadSubscriptionPlans();
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

  const defaultServices = [
    {
      name: "Tratamentos Faciais",
      description: "Nossas terapias faciais são personalizadas para atender às necessidades específicas da sua pele.",
      image_url: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80"
    },
    {
      name: "Massagens Terapêuticas",
      description: "Técnicas avançadas de massagem para relaxar, regenerar e revitalizar seu corpo.",
      image_url: "https://images.unsplash.com/photo-1519824145371-296894a0daa9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80"
    },
    {
      name: "Tratamentos Corporais",
      description: "Soluções inovadoras para modelagem corporal, redução de medidas e tratamento da celulite.",
      image_url: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80"
    }
  ];

  const servicesDisplay = featuredServices.length > 0 ? featuredServices : defaultServices;

  const defaultSlides = [
    {
      title: "Transforme sua beleza com tecnologia avançada",
      description: "Nossos tratamentos combinam tecnologia de ponta com profissionais especializados para resultados extraordinários.",
      image_url: "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
      button_text: "Conheça nossos tratamentos",
      button_url: "#services"
    },
    {
      title: "Experiência personalizada para sua pele",
      description: "Cada pele é única. Nossos tratamentos faciais são totalmente adaptados às suas necessidades específicas.",
      image_url: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
      button_text: "Agende uma avaliação",
      button_url: "#contact"
    },
    {
      title: "Bem-estar e relaxamento para corpo e mente",
      description: "Nossas massagens terapêuticas promovem o relaxamento profundo e restauram o equilíbrio do seu corpo.",
      image_url: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
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

  return (
    <div className="bg-white min-h-screen">
      <header className="bg-[#0D0F36] text-white">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Phone className="w-4 h-4" />
                <span className="text-sm">{company.phone}</span>
              </div>
              <div className="flex items-center gap-1">
                <Mail className="w-4 h-4" />
                <span className="text-sm">{company.email}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a href={company.instagram_url} className="text-white hover:text-[#69D2CD]">
                <Instagram className="w-4 h-4" />
              </a>
              <a href={company.facebook_url} className="text-white hover:text-[#69D2CD]">
                <Facebook className="w-4 h-4" />
              </a>
              <Link to={createPageUrl("Login")} className="bg-[#69D2CD] text-[#0D0F36] px-3 py-1 rounded-full text-xs font-semibold hover:bg-white transition-colors flex items-center">
                <Shield className="w-3 h-3 mr-1" />
                Painel Administrativo
              </Link>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <img src={company.logo_url} alt={company.name} className="h-10" />
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#home" className="text-[#0D0F36] font-medium hover:text-[#69D2CD] transition-colors">Home</a>
              <a href="#services" className="text-[#0D0F36] font-medium hover:text-[#69D2CD] transition-colors">Serviços</a>
              <a href="#subscriptions" className="text-[#0D0F36] font-medium hover:text-[#69D2CD] transition-colors">Assinaturas</a>
              <a href="#gift-cards" className="text-[#0D0F36] font-medium hover:text-[#69D2CD] transition-colors">Gift Cards</a>
              <a href="#about" className="text-[#0D0F36] font-medium hover:text-[#69D2CD] transition-colors">Sobre</a>
              <a href="#testimonials" className="text-[#0D0F36] font-medium hover:text-[#69D2CD] transition-colors">Depoimentos</a>
              <a href="#contact" className="text-[#0D0F36] font-medium hover:text-[#69D2CD] transition-colors">Contato</a>
              <Link to={createPageUrl("ClientPortal")}>
                <Button className="bg-[#294380] hover:bg-[#0D0F36] text-white">
                  Área do Cliente
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="md:hidden">
              <Button variant="ghost" size="sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-menu"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
              </Button>
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

      <SubscriptionPlansSection plans={plansToDisplay} />

      <GiftCardSection />

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
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
                  <input type="text" className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[#69D2CD] focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                  <input type="email" className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[#69D2CD] focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <input type="tel" className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[#69D2CD] focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assunto</label>
                  <select className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[#69D2CD] focus:border-transparent">
                    <option>Selecione um assunto</option>
                    <option>Agendamento</option>
                    <option>Informações sobre tratamentos</option>
                    <option>Preços</option>
                    <option>Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem</label>
                  <textarea rows="4" className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[#69D2CD] focus:border-transparent"></textarea>
                </div>
                <Button className="bg-[#294380] hover:bg-[#0D0F36] w-full">
                  Enviar mensagem
                </Button>
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
            <div className="mt-4 md:mt-0">
              <Link to={createPageUrl("ClientPortal")} className="text-[#69D2CD] hover:text-white flex items-center">
                Área do Cliente
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
