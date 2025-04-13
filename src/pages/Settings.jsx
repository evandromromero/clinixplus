import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CompanySettings, Testimonial, SlideShowImage, Employee, ContactMessage } from '@/firebase/entities';
import {
  Building2,
  Settings as SettingsIcon,
  ImageIcon,
  MessageSquare,
  Star,
  Trash2,
  Check,
  X,
  Edit,
  ChevronUp,
  ChevronDown,
  Plus,
  Link as LinkIcon,
  Instagram,
  Facebook,
  RefreshCw,
  Image,
  AlertTriangle,
  Mail,
  Eye,
  EyeOff
} from 'lucide-react';
import SEOHead from '../components/SEOHead';

export default function Settings() {
  console.log('=== Settings component mounted ===');
  
  const [employees, setEmployees] = useState([]);
  const [companySettings, setCompanySettings] = useState({
    name: "ClinixPlus",
    cnpj: "",
    email: "contato@exemplo.com",
    phone: "(00) 0000-0000",
    whatsapp: "(00) 0000-0000",
    address: "Rua Exemplo, 123",
    city: "São Paulo",
    state: "SP",
    zipcode: "00000-000",
    timezone: "America/Sao_Paulo",
    opening_hours: {
      weekdays: "8h às 20h",
      weekend: "9h às 18h"
    },
    logo_url: "",
    logo_size: {
      admin: "medium",  // small, medium, large
      site: "medium"    // small, medium, large
    },
    facebook_url: "",
    instagram_url: "",
    website_description: "Descrição da empresa para o site",
    website_primary_color: "#294380",
    website_secondary_color: "#69D2CD",
    about_image_url: "",
    about_full_description: "",
    whatsapp_message: "Olá! Gostaria de agendar um horário.",
    payment_settings: {
      mercadopago_enabled: false,
      mercadopago_public_key: "",
      mercadopago_access_token: "",
      mercadopago_client_id: "",
      mercadopago_client_secret: "",
      mercadopago_sandbox: true
    },
    seo_settings: {
      meta_title: "",
      meta_description: "",
      meta_keywords: "",
      meta_author: "",
      favicon_url: "",
      site_name: ""
    }
  });
  
  const [testimonials, setTestimonials] = useState([]);
  const [slideShowImages, setSlideShowImages] = useState([]);
  const [currentSlide, setCurrentSlide] = useState({
    title: '',
    description: '',
    image_url: '',
    button_text: '',
    button_url: '',
    order: 999,
    active: true
  });
  
  const [showSlideForm, setShowSlideForm] = useState(false);
  const [editingSlideId, setEditingSlideId] = useState(null);
  const [previewLogo, setPreviewLogo] = useState('');
  const [previewAboutImage, setPreviewAboutImage] = useState('');
  const [alert, setAlert] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [activeTab, setActiveTab] = useState("business");
  
  // Estados para gerenciamento de mensagens de contato
  const [contactMessages, setContactMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showMessageDetails, setShowMessageDetails] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Lista de fusos horários do Brasil
  const timezones = [
    { value: "America/Sao_Paulo", label: "São Paulo (UTC-3)" },
    { value: "America/Manaus", label: "Manaus (UTC-4)" },
    { value: "America/Belem", label: "Belém (UTC-3)" },
    { value: "America/Fortaleza", label: "Fortaleza (UTC-3)" },
    { value: "America/Recife", label: "Recife (UTC-3)" },
    { value: "America/Noronha", label: "Fernando de Noronha (UTC-2)" },
    { value: "America/Rio_Branco", label: "Rio Branco (UTC-5)" },
    { value: "America/Campo_Grande", label: "Campo Grande (UTC-4)" },
    { value: "America/Cuiaba", label: "Cuiabá (UTC-4)" },
    { value: "America/Boa_Vista", label: "Boa Vista (UTC-4)" },
    { value: "America/Porto_Velho", label: "Porto Velho (UTC-4)" },
    { value: "America/Eirunepe", label: "Eirunepé (UTC-5)" }
  ];

  useEffect(() => {
    console.log('Initial useEffect triggered');
    loadInitialData();
  }, []);
  
  // Efeito para carregar mensagens de contato quando a aba de emails for selecionada
  useEffect(() => {
    if (activeTab === 'emails') {
      loadContactMessages();
    }
  }, [activeTab]);
  
  const loadInitialData = async () => {
    console.log('Loading initial data...');
    setLoadError({});
    
    try {
      await Promise.all([
        loadCompanySettings(),
        loadTestimonials(),
        loadSlideShowImages(),
        loadEmployees()
      ]);
    } catch (error) {
      console.error("Erro ao carregar dados iniciais:", error);
      setLoadError({
        general: error
      });
    }
  };
  
  // Função para carregar mensagens de contato
  const loadContactMessages = async () => {
    try {
      setIsLoadingMessages(true);
      const messages = await ContactMessage.list();
      setContactMessages(messages);
    } catch (error) {
      console.error("Erro ao carregar mensagens de contato:", error);
      setAlert({
        type: 'error',
        message: 'Erro ao carregar mensagens de contato: ' + error.message
      });
    } finally {
      setIsLoadingMessages(false);
    }
  };
  
  // Função para marcar mensagem como lida
  const handleMarkAsRead = async (messageId) => {
    try {
      await ContactMessage.markAsRead(messageId);
      
      // Atualizar a lista de mensagens
      setContactMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === messageId ? { ...msg, read: true } : msg
        )
      );
      
      setAlert({
        type: 'success',
        message: 'Mensagem marcada como lida!'
      });
    } catch (error) {
      console.error("Erro ao marcar mensagem como lida:", error);
      setAlert({
        type: 'error',
        message: 'Erro ao marcar mensagem como lida: ' + error.message
      });
    }
  };
  
  // Função para excluir mensagem
  const handleDeleteMessage = async (messageId) => {
    if (!confirm('Tem certeza que deseja excluir esta mensagem?')) {
      return;
    }
    
    try {
      await ContactMessage.delete(messageId);
      
      // Atualizar a lista de mensagens
      setContactMessages(prevMessages => 
        prevMessages.filter(msg => msg.id !== messageId)
      );
      
      // Se a mensagem excluída for a selecionada, fechar o modal de detalhes
      if (selectedMessage && selectedMessage.id === messageId) {
        setSelectedMessage(null);
        setShowMessageDetails(false);
      }
      
      setAlert({
        type: 'success',
        message: 'Mensagem excluída com sucesso!'
      });
    } catch (error) {
      console.error("Erro ao excluir mensagem:", error);
      setAlert({
        type: 'error',
        message: 'Erro ao excluir mensagem: ' + error.message
      });
    }
  };
  
  // Função para visualizar detalhes da mensagem
  const handleViewMessageDetails = async (message) => {
    setSelectedMessage(message);
    setShowMessageDetails(true);
    
    // Se a mensagem não estiver marcada como lida, marcá-la
    if (!message.read) {
      await handleMarkAsRead(message.id);
    }
  };

  const loadCompanySettings = async () => {
    try {
      const settings = await CompanySettings.get();
      if (settings) {
        // Garantir que as configurações de tamanho da logo existam
        if (!settings.logo_size) {
          settings.logo_size = {
            admin: "medium",
            site: "medium"
          };
        }
        
        setCompanySettings(settings);
        setPreviewLogo(settings.logo_url || '');
        setPreviewAboutImage(settings.about_image_url || '');
      }
    } catch (error) {
      console.error('Error in loadCompanySettings:', error);
      setLoadError(prev => ({ ...prev, companySettings: error }));
    }
  };

  const loadEmployees = async () => {
    try {
      const data = await Employee.list();
      setEmployees(data || []);
      return data;
    } catch (error) {
      console.error("Erro ao carregar funcionários:", error);
      setEmployees([]);
      return [];
    }
  };

  const loadSlideShowImages = async () => {
    try {
      const images = await SlideShowImage.list('order');
      setSlideShowImages(images || []);
      return images;
    } catch (error) {
      console.error("Erro ao carregar imagens do slideshow:", error);
      setSlideShowImages([]);
      return [];
    }
  };

  const loadTestimonials = async () => {
    try {
      const data = await Testimonial.list();
      setTestimonials(data || []);
      return data;
    } catch (error) {
      console.error("Erro ao carregar depoimentos:", error);
      setTestimonials([]);
      return [];
    }
  };
  
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewLogo(reader.result);
        setCompanySettings({
          ...companySettings,
          logo_url: reader.result
        });
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleAboutImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewAboutImage(reader.result);
        setCompanySettings({
          ...companySettings,
          about_image_url: reader.result
        });
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleSaveCompanySettings = async () => {
    try {
      setIsLoading(true);
      console.log('Saving company settings:', companySettings);
      
      // Remove o ID antes de salvar
      const { id, ...settingsToSave } = companySettings;
      
      const updatedSettings = await CompanySettings.update(settingsToSave);
      
      setCompanySettings(updatedSettings);
      setAlert({
        type: 'success',
        message: 'Configurações da empresa salvas com sucesso!'
      });
    } catch (error) {
      console.error('Error saving company settings:', error);
      setAlert({
        type: 'error',
        message: 'Erro ao salvar as configurações da empresa'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSaveSiteSettings = async () => {
    try {
      setIsLoading(true);
      
      if (companySettings.id) {
        await CompanySettings.update(companySettings.id, {
          website_description: companySettings.website_description,
          website_primary_color: companySettings.website_primary_color,
          website_secondary_color: companySettings.website_secondary_color,
          about_image_url: companySettings.about_image_url,
          about_full_description: companySettings.about_full_description,
          facebook_url: companySettings.facebook_url,
          instagram_url: companySettings.instagram_url
        });
        
        setAlert({
          type: 'success',
          message: 'Configurações do site salvas com sucesso!'
        });
      }
    } catch (error) {
      console.error('Error saving site settings:', error);
      setAlert({
        type: 'error',
        message: 'Erro ao salvar configurações do site: ' + (error?.message || 'Erro desconhecido')
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetSlideForm = () => {
    setCurrentSlide({
      title: '',
      description: '',
      image_url: '',
      button_text: '',
      button_url: '',
      order: 999,
      active: true
    });
    setEditingSlideId(null);
  };
  
  const handleEditSlide = (slide) => {
    setCurrentSlide(slide);
    setEditingSlideId(slide.id);
    setShowSlideForm(true);
  };
  
  const handleDeleteSlide = async (id) => {
    try {
      await SlideShowImage.delete(id);
      setAlert({
        type: 'success',
        message: 'Slide excluído com sucesso!'
      });
      loadSlideShowImages();
    } catch (error) {
      console.error("Erro ao deletar slide:", error);
      setAlert({
        type: 'error',
        message: 'Erro ao deletar slide: ' + error.message
      });
    }
  };
  
  const handleSlideChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'image_url') {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setCurrentSlide({
            ...currentSlide,
            image_url: reader.result
          });
        };
        reader.readAsDataURL(file);
      }
    } else {
      setCurrentSlide({
        ...currentSlide,
        [name]: value
      });
    }
  };
  
  const handleSaveSlide = async () => {
    try {
      if (!currentSlide.title || !currentSlide.image_url) {
        setAlert({
          type: 'error',
          message: 'Por favor, preencha o título e adicione uma imagem'
        });
        return;
      }
      
      if (editingSlideId) {
        await SlideShowImage.update(editingSlideId, currentSlide);
        setAlert({
          type: 'success',
          message: 'Slide atualizado com sucesso!'
        });
      } else {
        await SlideShowImage.create(currentSlide);
        setAlert({
          type: 'success',
          message: 'Slide adicionado com sucesso!'
        });
      }
      
      setShowSlideForm(false);
      resetSlideForm();
      loadSlideShowImages();
    } catch (error) {
      console.error("Erro ao salvar slide:", error);
      setAlert({
        type: 'error',
        message: 'Erro ao salvar slide: ' + error.message
      });
    }
  };
  
  const handleSaveWhatsappSettings = async () => {
    try {
      setIsLoading(true);
      
      if (companySettings.id) {
        await CompanySettings.update(companySettings.id, {
          whatsapp: companySettings.whatsapp,
          whatsapp_message: companySettings.whatsapp_message
        });
        
        setAlert({
          type: 'success',
          message: 'Configurações de WhatsApp salvas com sucesso!'
        });
      }
    } catch (error) {
      console.error("Erro ao salvar configurações de WhatsApp:", error);
      setAlert({
        type: 'error',
        message: 'Erro ao salvar configurações de WhatsApp: ' + error.message
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleApproveTestimonial = async (id, approved) => {
    try {
      await Testimonial.update(id, { approved });
      setAlert({
        type: 'success',
        message: approved ? 'Depoimento aprovado!' : 'Depoimento rejeitado!'
      });
      loadTestimonials();
    } catch (error) {
      console.error("Erro ao atualizar depoimento:", error);
      setAlert({
        type: 'error',
        message: 'Erro ao atualizar depoimento: ' + error.message
      });
    }
  };
  
  const handleDeleteTestimonial = async (id) => {
    try {
      await Testimonial.delete(id);
      setAlert({
        type: 'success',
        message: 'Depoimento excluído com sucesso!'
      });
      loadTestimonials();
    } catch (error) {
      console.error("Erro ao deletar depoimento:", error);
      setAlert({
        type: 'error',
        message: 'Erro ao deletar depoimento: ' + error.message
      });
    }
  };

  const SimpleAlert = ({ message, type = 'success', onClose }) => {
    const bgColor = type === 'success' ? 'bg-green-100' : 'bg-red-100';
    const textColor = type === 'success' ? 'text-green-800' : 'text-red-800';
    const borderColor = type === 'success' ? 'border-green-200' : 'border-red-200';
    const Icon = type === 'success' ? Check : AlertTriangle;
    
    useEffect(() => {
      if (onClose) {
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
      }
    }, [onClose]);
    
    return (
      <div className={`rounded-lg border ${borderColor} ${bgColor} p-4 mb-4`}>
        <div className="flex items-start gap-2">
          <Icon className={`h-5 w-5 ${textColor}`} />
          <div className={`flex-1 ${textColor}`}>{message}</div>
          {onClose && (
            <button 
              onClick={onClose}
              className={`${textColor} hover:opacity-70`}
            >
              ×
            </button>
          )}
        </div>
      </div>
    );
  };

  const RateLimitErrorHandler = ({ error, onRetry, children }) => {
    if (!error) return children;
    
    return (
      <Card className="border-red-200 bg-red-50 mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h3 className="text-lg font-semibold text-red-700">Erro ao carregar dados</h3>
          </div>
          
          <p className="text-red-600 mb-4">
            {error.message?.includes('429') || error.message?.includes('Rate limit') 
              ? 'Limite de requisições excedido. Por favor, aguarde um momento e tente novamente.'
              : 'Ocorreu um erro ao carregar os dados. Por favor, tente novamente.'}
          </p>
          
          <div className="flex gap-3">
            <Button 
              onClick={onRetry}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Tentar novamente
            </Button>
            
            <Button 
              variant="outline" 
              className="border-red-600 text-red-600 hover:bg-red-50"
              onClick={() => window.location.reload()}
            >
              Recarregar página
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const handleTabChange = (value) => {
    console.log("Changing tab to:", value);
    setActiveTab(value);
  };

  return (
    <div className="space-y-6">
      <SEOHead 
        title={companySettings.seo_settings?.meta_title || "Configurações - ClinixPlus"} 
        description={companySettings.seo_settings?.meta_description || "Painel de configurações do sistema ClinixPlus"} 
        keywords={companySettings.seo_settings?.meta_keywords || "configurações, sistema, clínica, estética"} 
        author={companySettings.seo_settings?.meta_author || "ClinixPlus"} 
        faviconUrl={companySettings.seo_settings?.favicon_url || "/favicon.ico"} 
        siteName={companySettings.seo_settings?.site_name || "ClinixPlus"} 
      />
      {alert && (
        <SimpleAlert
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert(null)}
        />
      )}
      
      <h2 className="text-3xl font-bold text-gray-800">Configurações</h2>
      
      {loadError && Object.keys(loadError).length > 0 && (
        <RateLimitErrorHandler 
          error={loadError.general || loadError.companySettings} 
          onRetry={loadInitialData} 
        />
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-7">
          <TabsTrigger 
            value="business" 
            className="flex items-center gap-2"
            onClick={() => handleTabChange("business")}
          >
            <Building2 className="h-4 w-4" /> Empresa
          </TabsTrigger>
          <TabsTrigger 
            value="site" 
            className="flex items-center gap-2"
            onClick={() => handleTabChange("site")}
          >
            <ImageIcon className="h-4 w-4" /> Site
          </TabsTrigger>
          <TabsTrigger 
            value="testimonials" 
            className="flex items-center gap-2"
            onClick={() => handleTabChange("testimonials")}
          >
            <MessageSquare className="h-4 w-4" /> Depoimentos
          </TabsTrigger>
          <TabsTrigger 
            value="whatsapp" 
            className="flex items-center gap-2"
            onClick={() => handleTabChange("whatsapp")}
          >
            <SettingsIcon className="h-4 w-4" /> WhatsApp
          </TabsTrigger>
          <TabsTrigger 
            value="payments" 
            className="flex items-center gap-2"
            onClick={() => handleTabChange("payments")}
          >
            <SettingsIcon className="h-4 w-4" /> Pagamentos
          </TabsTrigger>
          <TabsTrigger 
            value="seo" 
            className="flex items-center gap-2"
            onClick={() => handleTabChange("seo")}
          >
            <LinkIcon className="h-4 w-4" /> SEO
          </TabsTrigger>
          <TabsTrigger 
            value="emails" 
            className="flex items-center gap-2"
            onClick={() => handleTabChange("emails")}
          >
            <Mail className="h-4 w-4" /> Emails
          </TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Empresa</CardTitle>
              <CardDescription>Configure as informações básicas da sua empresa</CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome da Empresa</label>
                  <Input
                    value={companySettings.name || ""}
                    onChange={(e) => setCompanySettings({...companySettings, name: e.target.value})}
                    placeholder="Nome da sua empresa"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">CNPJ</label>
                  <Input
                    value={companySettings.cnpj || ""}
                    onChange={(e) => setCompanySettings({...companySettings, cnpj: e.target.value})}
                    placeholder="XX.XXX.XXX/0001-XX"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    value={companySettings.email || ""}
                    onChange={(e) => setCompanySettings({...companySettings, email: e.target.value})}
                    placeholder="contato@suaempresa.com"
                    type="email"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Telefone</label>
                  <Input
                    value={companySettings.phone || ""}
                    onChange={(e) => setCompanySettings({...companySettings, phone: e.target.value})}
                    placeholder="(XX) XXXX-XXXX"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Endereço</label>
                  <Input
                    value={companySettings.address || ""}
                    onChange={(e) => setCompanySettings({...companySettings, address: e.target.value})}
                    placeholder="Rua, número, bairro"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cidade</label>
                  <Input
                    value={companySettings.city || ""}
                    onChange={(e) => setCompanySettings({...companySettings, city: e.target.value})}
                    placeholder="Cidade"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Estado</label>
                  <Input
                    value={companySettings.state || ""}
                    onChange={(e) => setCompanySettings({...companySettings, state: e.target.value})}
                    placeholder="Estado"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">CEP</label>
                  <Input
                    value={companySettings.zipcode || ""}
                    onChange={(e) => setCompanySettings({...companySettings, zipcode: e.target.value})}
                    placeholder="XXXXX-XXX"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fuso Horário</label>
                  <Select
                    value={companySettings.timezone}
                    onValueChange={(value) => setCompanySettings({...companySettings, timezone: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o fuso horário" />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">
                    Este fuso horário será usado para todos os agendamentos e relatórios
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Horário de Funcionamento (Dias de Semana)</label>
                  <Input
                    value={companySettings.opening_hours?.weekdays || ""}
                    onChange={(e) => setCompanySettings({
                      ...companySettings, 
                      opening_hours: {
                        ...companySettings.opening_hours,
                        weekdays: e.target.value
                      }
                    })}
                    placeholder="8h às 20h"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Horário de Funcionamento (Fim de Semana)</label>
                  <Input
                    value={companySettings.opening_hours?.weekend || ""}
                    onChange={(e) => setCompanySettings({
                      ...companySettings, 
                      opening_hours: {
                        ...companySettings.opening_hours,
                        weekend: e.target.value
                      }
                    })}
                    placeholder="9h às 18h"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <label className="text-sm font-medium">Logo da Empresa</label>
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {previewLogo && (
                    <div className={`border rounded flex items-center justify-center overflow-hidden
                      ${companySettings.logo_size?.admin === 'small' ? 'w-24 h-24' : 
                        companySettings.logo_size?.admin === 'large' ? 'w-48 h-48' : 'w-32 h-32'}`}
                    >
                      <img 
                        src={previewLogo} 
                        alt="Logo" 
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  )}
                  <div className="flex flex-col gap-3">
                    <label className="cursor-pointer">
                      <div className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200 transition">
                        Selecionar imagem
                      </div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleLogoChange}
                      />
                    </label>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tamanho no Painel Admin</label>
                      <div className="flex gap-2">
                        <Button 
                          type="button" 
                          variant={companySettings.logo_size?.admin === 'small' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCompanySettings({
                            ...companySettings, 
                            logo_size: { ...companySettings.logo_size, admin: 'small' }
                          })}
                        >
                          Pequeno
                        </Button>
                        <Button 
                          type="button" 
                          variant={companySettings.logo_size?.admin === 'medium' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCompanySettings({
                            ...companySettings, 
                            logo_size: { ...companySettings.logo_size, admin: 'medium' }
                          })}
                        >
                          Médio
                        </Button>
                        <Button 
                          type="button" 
                          variant={companySettings.logo_size?.admin === 'large' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCompanySettings({
                            ...companySettings, 
                            logo_size: { ...companySettings.logo_size, admin: 'large' }
                          })}
                        >
                          Grande
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tamanho no Site</label>
                      <div className="flex gap-2">
                        <Button 
                          type="button" 
                          variant={companySettings.logo_size?.site === 'small' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCompanySettings({
                            ...companySettings, 
                            logo_size: { ...companySettings.logo_size, site: 'small' }
                          })}
                        >
                          Pequeno
                        </Button>
                        <Button 
                          type="button" 
                          variant={companySettings.logo_size?.site === 'medium' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCompanySettings({
                            ...companySettings, 
                            logo_size: { ...companySettings.logo_size, site: 'medium' }
                          })}
                        >
                          Médio
                        </Button>
                        <Button 
                          type="button" 
                          variant={companySettings.logo_size?.site === 'large' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCompanySettings({
                            ...companySettings, 
                            logo_size: { ...companySettings.logo_size, site: 'large' }
                          })}
                        >
                          Grande
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 flex justify-end">
                <Button
                  onClick={handleSaveCompanySettings}
                  className="bg-[#294380] hover:bg-[#0D0F36]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : 'Salvar Configurações'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="site" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Site</CardTitle>
              <CardDescription>Personalize como seu site será exibido para os clientes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Descrição da Empresa</label>
                  <Textarea
                    value={companySettings.website_description || ""}
                    onChange={(e) => setCompanySettings({...companySettings, website_description: e.target.value})}
                    placeholder="Breve descrição da sua empresa que aparecerá no site"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cor Primária</label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="color"
                        value={companySettings.website_primary_color || "#294380"}
                        onChange={(e) => setCompanySettings({...companySettings, website_primary_color: e.target.value})}
                        className="w-16 h-10"
                      />
                      <Input
                        type="text"
                        value={companySettings.website_primary_color || "#294380"}
                        onChange={(e) => setCompanySettings({...companySettings, website_primary_color: e.target.value})}
                        placeholder="#294380"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cor Secundária</label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="color"
                        value={companySettings.website_secondary_color || "#69D2CD"}
                        onChange={(e) => setCompanySettings({...companySettings, website_secondary_color: e.target.value})}
                        className="w-16 h-10"
                      />
                      <Input
                        type="text"
                        value={companySettings.website_secondary_color || "#69D2CD"}
                        onChange={(e) => setCompanySettings({...companySettings, website_secondary_color: e.target.value})}
                        placeholder="#69D2CD"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">URL do Facebook</label>
                    <div className="flex items-center gap-2">
                      <Facebook className="w-5 h-5 text-blue-600" />
                      <Input
                        value={companySettings.facebook_url || ""}
                        onChange={(e) => setCompanySettings({...companySettings, facebook_url: e.target.value})}
                        placeholder="https://facebook.com/suaempresa"
                        type="url"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">URL do Instagram</label>
                    <div className="flex items-center gap-2">
                      <Instagram className="w-5 h-5 text-pink-600" />
                      <Input
                        value={companySettings.instagram_url || ""}
                        onChange={(e) => setCompanySettings({...companySettings, instagram_url: e.target.value})}
                        placeholder="https://instagram.com/suaempresa"
                        type="url"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Imagem da Seção Sobre</label>
                  <div className="flex items-center gap-4">
                    {previewAboutImage && (
                      <div className="w-32 h-32 border rounded flex items-center justify-center overflow-hidden">
                        <img 
                          src={previewAboutImage} 
                          alt="Sobre" 
                          className="max-w-full max-h-full object-cover"
                        />
                      </div>
                    )}
                    <label className="cursor-pointer">
                      <div className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200 transition">
                        Selecionar imagem
                      </div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleAboutImageChange}
                      />
                    </label>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Descrição Completa (Modal Saiba Mais)</label>
                  <Textarea
                    value={companySettings.about_full_description || ""}
                    onChange={(e) => setCompanySettings({...companySettings, about_full_description: e.target.value})}
                    placeholder="Descreva sua empresa em detalhes para o modal 'Saiba Mais'"
                    rows={6}
                  />
                </div>
              </div>
              
              <div className="pt-4">
                <h3 className="text-lg font-medium mb-4">Slides do Banner</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button
                      onClick={() => {
                        resetSlideForm();
                        setShowSlideForm(true);
                      }}
                      className="bg-[#294380] hover:bg-[#0D0F36]"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Adicionar Slide
                    </Button>
                  </div>
                  
                  {slideShowImages.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 text-center">Ordem</TableHead>
                          <TableHead>Título</TableHead>
                          <TableHead className="hidden md:table-cell">Imagem</TableHead>
                          <TableHead className="hidden md:table-cell">Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {slideShowImages.map((slide) => (
                          <TableRow key={slide.id}>
                            <TableCell className="text-center font-medium">{slide.order}</TableCell>
                            <TableCell>{slide.title}</TableCell>
                            <TableCell className="hidden md:table-cell">
                              {slide.image_url && (
                                <div className="w-12 h-12 overflow-hidden rounded">
                                  <img
                                    src={slide.image_url}
                                    alt={slide.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {slide.active ? (
                                <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                              ) : (
                                <Badge variant="outline" className="text-gray-500">Inativo</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditSlide(slide)}
                                  className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteSlide(slide.id)}
                                  className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-6 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">Nenhum slide cadastrado ainda.</p>
                      <p className="text-sm text-gray-400 mt-1">Adicione slides para o banner do seu site.</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="pt-4 flex justify-end">
                <Button
                  onClick={handleSaveSiteSettings}
                  className="bg-[#294380] hover:bg-[#0D0F36]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : 'Salvar Configurações do Site'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="testimonials" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Depoimentos</CardTitle>
              <CardDescription>Gerencie os depoimentos de clientes para exibição no site</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Depoimentos Pendentes</h3>
                </div>
                
                {testimonials.filter(t => !t.approved).length > 0 ? (
                  <div className="space-y-4">
                    {testimonials
                      .filter(t => !t.approved)
                      .map((testimonial) => (
                        <Card key={testimonial.id} className="bg-gray-50">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center mb-2">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star 
                                      key={i}
                                      className={`w-4 h-4 ${i < testimonial.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                    />
                                  ))}
                                </div>
                                <p className="text-gray-800 italic mb-2">"{testimonial.text}"</p>
                                <p className="text-sm font-medium">{testimonial.name}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  onClick={() => handleApproveTestimonial(testimonial.id, true)}
                                  className="h-8 w-8 text-green-600 border-green-200 hover:bg-green-50 hover:border-green-300"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  onClick={() => handleApproveTestimonial(testimonial.id, false)}
                                  className="h-8 w-8 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  onClick={() => handleDeleteTestimonial(testimonial.id)}
                                  className="h-8 w-8 text-gray-600 border-gray-200 hover:bg-gray-100"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">Não há depoimentos pendentes de aprovação.</p>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Depoimentos Aprovados</h3>
                </div>
                
                {testimonials.filter(t => t.approved).length > 0 ? (
                  <div className="space-y-4">
                    {testimonials
                      .filter(t => t.approved)
                      .map((testimonial) => (
                        <Card key={testimonial.id}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center mb-2">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star 
                                      key={i}
                                      className={`w-4 h-4 ${i < testimonial.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                    />
                                  ))}
                                </div>
                                <p className="text-gray-800 italic mb-2">"{testimonial.text}"</p>
                                <p className="text-sm font-medium">{testimonial.name}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  onClick={() => handleDeleteTestimonial(testimonial.id)}
                                  className="h-8 w-8 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">Nenhum depoimento aprovado ainda.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="whatsapp" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de WhatsApp</CardTitle>
              <CardDescription>Configure o botão de WhatsApp para seu site</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Número de WhatsApp</label>
                  <Input
                    value={companySettings.whatsapp || ""}
                    onChange={(e) => setCompanySettings({...companySettings, whatsapp: e.target.value})}
                    placeholder="(XX) XXXXX-XXXX"
                  />
                  <p className="text-xs text-gray-500">
                    Digite apenas números, sem formatação. Inclua o código do país (Ex: 5511XXXXXXXXX).
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mensagem Padrão</label>
                  <Textarea
                    value={companySettings.whatsapp_message || ""}
                    onChange={(e) => setCompanySettings({...companySettings, whatsapp_message: e.target.value})}
                    placeholder="Olá! Gostaria de agendar um horário."
                    rows={3}
                  />
                  <p className="text-xs text-gray-500">
                    Esta mensagem será pré-preenchida quando o cliente clicar no botão de WhatsApp.
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Prévia do Link</h4>
                  <p className="text-sm text-gray-700 mb-2">
                    {`https://wa.me/${companySettings.whatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(companySettings.whatsapp_message || '')}`}
                  </p>
                  <a 
                    href={`https://wa.me/${companySettings.whatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(companySettings.whatsapp_message || '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#294380] text-sm flex items-center hover:underline"
                  >
                    <LinkIcon className="w-3 h-3 mr-1" /> Testar link
                  </a>
                </div>
              </div>
              
              <div className="pt-4 flex justify-end">
                <Button
                  onClick={handleSaveWhatsappSettings}
                  className="bg-[#294380] hover:bg-[#0D0F36]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : 'Salvar Configurações de WhatsApp'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Pagamento</CardTitle>
              <CardDescription>Configure as configurações de pagamento para seu site</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Habilitar Mercado Pago</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="mercadopago_enabled"
                      name="mercadopago_enabled"
                      checked={companySettings.payment_settings?.mercadopago_enabled}
                      onChange={(e) => setCompanySettings({
                        ...companySettings,
                        payment_settings: {
                          ...companySettings.payment_settings,
                          mercadopago_enabled: e.target.checked
                        }
                      })}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="mercadopago_enabled" className="text-sm font-medium">
                      Habilitar Mercado Pago
                    </label>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Chave Pública do Mercado Pago</label>
                  <Input
                    value={companySettings.payment_settings?.mercadopago_public_key || ""}
                    onChange={(e) => setCompanySettings({
                      ...companySettings,
                      payment_settings: {
                        ...companySettings.payment_settings,
                        mercadopago_public_key: e.target.value
                      }
                    })}
                    placeholder="Chave pública do Mercado Pago"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Token de Acesso do Mercado Pago</label>
                  <Input
                    value={companySettings.payment_settings?.mercadopago_access_token || ""}
                    onChange={(e) => setCompanySettings({
                      ...companySettings,
                      payment_settings: {
                        ...companySettings.payment_settings,
                        mercadopago_access_token: e.target.value
                      }
                    })}
                    placeholder="Token de acesso do Mercado Pago"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">ID do Cliente do Mercado Pago</label>
                  <Input
                    value={companySettings.payment_settings?.mercadopago_client_id || ""}
                    onChange={(e) => setCompanySettings({
                      ...companySettings,
                      payment_settings: {
                        ...companySettings.payment_settings,
                        mercadopago_client_id: e.target.value
                      }
                    })}
                    placeholder="ID do cliente do Mercado Pago"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Segredo do Cliente do Mercado Pago</label>
                  <Input
                    value={companySettings.payment_settings?.mercadopago_client_secret || ""}
                    onChange={(e) => setCompanySettings({
                      ...companySettings,
                      payment_settings: {
                        ...companySettings.payment_settings,
                        mercadopago_client_secret: e.target.value
                      }
                    })}
                    placeholder="Segredo do cliente do Mercado Pago"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Modo Sandbox do Mercado Pago</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="mercadopago_sandbox"
                      name="mercadopago_sandbox"
                      checked={companySettings.payment_settings?.mercadopago_sandbox}
                      onChange={(e) => setCompanySettings({
                        ...companySettings,
                        payment_settings: {
                          ...companySettings.payment_settings,
                          mercadopago_sandbox: e.target.checked
                        }
                      })}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="mercadopago_sandbox" className="text-sm font-medium">
                      Modo Sandbox do Mercado Pago
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 flex justify-end">
                <Button
                  onClick={handleSaveCompanySettings}
                  className="bg-[#294380] hover:bg-[#0D0F36]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : 'Salvar Configurações de Pagamento'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="seo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de SEO</CardTitle>
              <CardDescription>Configure as configurações de SEO para seu site</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Título da Página</label>
                  <Input
                    value={companySettings.seo_settings?.meta_title || ""}
                    onChange={(e) => setCompanySettings({
                      ...companySettings,
                      seo_settings: {
                        ...companySettings.seo_settings,
                        meta_title: e.target.value
                      }
                    })}
                    placeholder="Título da página"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Descrição da Página</label>
                  <Textarea
                    value={companySettings.seo_settings?.meta_description || ""}
                    onChange={(e) => setCompanySettings({
                      ...companySettings,
                      seo_settings: {
                        ...companySettings.seo_settings,
                        meta_description: e.target.value
                      }
                    })}
                    placeholder="Descrição da página"
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Palavras-chave da Página</label>
                  <Input
                    value={companySettings.seo_settings?.meta_keywords || ""}
                    onChange={(e) => setCompanySettings({
                      ...companySettings,
                      seo_settings: {
                        ...companySettings.seo_settings,
                        meta_keywords: e.target.value
                      }
                    })}
                    placeholder="Palavras-chave da página"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Autor da Página</label>
                  <Input
                    value={companySettings.seo_settings?.meta_author || ""}
                    onChange={(e) => setCompanySettings({
                      ...companySettings,
                      seo_settings: {
                        ...companySettings.seo_settings,
                        meta_author: e.target.value
                      }
                    })}
                    placeholder="Autor da página"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">URL do Favicon</label>
                  <Input
                    value={companySettings.seo_settings?.favicon_url || ""}
                    onChange={(e) => setCompanySettings({
                      ...companySettings,
                      seo_settings: {
                        ...companySettings.seo_settings,
                        favicon_url: e.target.value
                      }
                    })}
                    placeholder="URL do favicon"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome do Site</label>
                  <Input
                    value={companySettings.seo_settings?.site_name || ""}
                    onChange={(e) => setCompanySettings({
                      ...companySettings,
                      seo_settings: {
                        ...companySettings.seo_settings,
                        site_name: e.target.value
                      }
                    })}
                    placeholder="Nome do site"
                  />
                </div>
              </div>
              
              <div className="pt-4 flex justify-end">
                <Button
                  onClick={handleSaveCompanySettings}
                  className="bg-[#294380] hover:bg-[#0D0F36]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : 'Salvar Configurações de SEO'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="emails" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Emails</CardTitle>
              <CardDescription>Configure as configurações de emails para seu site</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email de Contato</label>
                  <Input
                    value={companySettings.email || ""}
                    onChange={(e) => setCompanySettings({...companySettings, email: e.target.value})}
                    placeholder="contato@suaempresa.com"
                    type="email"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Mensagens de Contato</h3>
                {isLoadingMessages ? (
                  <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">Carregando mensagens...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {contactMessages.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12 text-center">ID</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Mensagem</TableHead>
                            <TableHead className="hidden md:table-cell">Data</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {contactMessages.map((message) => (
                            <TableRow 
                              key={message.id}
                              className={!message.read ? "bg-blue-50" : ""}
                            >
                              <TableCell className="text-center font-medium">{message.id.substring(0, 6)}...</TableCell>
                              <TableCell>{message.name}</TableCell>
                              <TableCell>{message.email}</TableCell>
                              <TableCell>{message.message.length > 30 ? message.message.substring(0, 30) + '...' : message.message}</TableCell>
                              <TableCell className="hidden md:table-cell">
                                {message.created_at ? new Date(message.created_at).toLocaleString('pt-BR') : 'N/A'}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end items-center gap-2">
                                  {!message.read && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleMarkAsRead(message.id)}
                                      className="text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50"
                                      title="Marcar como lida"
                                    >
                                      <EyeOff className="w-4 h-4" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleViewMessageDetails(message)}
                                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                    title="Ver detalhes"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteMessage(message.id)}
                                    className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                    title="Excluir mensagem"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-6 bg-gray-50 rounded-lg">
                        <p className="text-gray-500">Nenhuma mensagem de contato encontrada.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <Dialog open={showSlideForm} onOpenChange={setShowSlideForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSlideId ? 'Editar Slide' : 'Adicionar Novo Slide'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Título</label>
              <Input
                name="title"
                value={currentSlide.title}
                onChange={handleSlideChange}
                placeholder="Título do slide"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                name="description"
                value={currentSlide.description}
                onChange={handleSlideChange}
                placeholder="Descrição do slide"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Imagem</label>
              <div className="flex items-center gap-4">
                {currentSlide.image_url && (
                  <div className="w-32 h-24 border rounded flex items-center justify-center overflow-hidden">
                    <img 
                      src={currentSlide.image_url} 
                      alt="Preview" 
                      className="max-w-full max-h-full object-cover"
                    />
                  </div>
                )}
                <label className="cursor-pointer">
                  <div className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200 transition">
                    {currentSlide.image_url ? 'Trocar imagem' : 'Selecionar imagem'}
                  </div>
                  <input 
                    type="file" 
                    name="image_url"
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleSlideChange}
                  />
                </label>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Texto do Botão</label>
                <Input
                  name="button_text"
                  value={currentSlide.button_text}
                  onChange={handleSlideChange}
                  placeholder="Ex: Saiba mais"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Link do Botão</label>
                <Input
                  name="button_url"
                  value={currentSlide.button_url}
                  onChange={handleSlideChange}
                  placeholder="Ex: #services"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Ordem</label>
                <Input
                  type="number"
                  name="order"
                  value={currentSlide.order}
                  onChange={handleSlideChange}
                  placeholder="999"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  name="active"
                  checked={currentSlide.active}
                  onChange={(e) => handleSlideChange({
                    target: {
                      name: 'active',
                      value: e.target.checked
                    }
                  })}
                  className="rounded border-gray-300"
                />
                <label htmlFor="active" className="text-sm font-medium">
                  Slide ativo
                </label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetSlideForm();
                setShowSlideForm(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveSlide}
              className="bg-[#294380] hover:bg-[#0D0F36]"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : 'Salvar Slide'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showMessageDetails} onOpenChange={setShowMessageDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Mensagem</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome:</label>
              <p className="text-gray-800">{selectedMessage?.name}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email:</label>
              <p className="text-gray-800">{selectedMessage?.email}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Telefone:</label>
              <p className="text-gray-800">{selectedMessage?.phone || 'Não informado'}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Assunto:</label>
              <p className="text-gray-800">{selectedMessage?.subject || 'Não informado'}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Mensagem:</label>
              <p className="text-gray-800 whitespace-pre-wrap">{selectedMessage?.message}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Data:</label>
              <p className="text-gray-800">
                {selectedMessage?.created_at ? new Date(selectedMessage.created_at).toLocaleString('pt-BR') : 'N/A'}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status:</label>
              <p className="text-gray-800">
                {selectedMessage?.read ? 
                  <span className="text-green-600 flex items-center"><Check className="w-4 h-4 mr-1" /> Lida</span> : 
                  <span className="text-yellow-600 flex items-center"><AlertTriangle className="w-4 h-4 mr-1" /> Não lida</span>
                }
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowMessageDetails(false);
              }}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
