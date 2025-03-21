import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { CompanySettings } from '@/api/entities';
import { Testimonial } from '@/api/entities';
import { SlideShowImage } from '@/api/entities';
import { Employee } from '@/api/entities';
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
  Image
} from 'lucide-react';
import SimpleAlert from '../components/SimpleAlert';
import RateLimitHandler from '@/components/RateLimitHandler';

export default function Settings() {
  const [employees, setEmployees] = useState([]);
  const [companySettings, setCompanySettings] = useState({
    name: "",
    cnpj: "",
    email: "",
    phone: "",
    whatsapp: "",
    address: "",
    city: "",
    state: "",
    zipcode: "",
    opening_hours: {
      weekdays: "8h às 20h",
      weekend: "9h às 18h"
    },
    logo_url: "",
    facebook_url: "",
    instagram_url: "",
    website_description: "",
    website_primary_color: "#294380",
    website_secondary_color: "#69D2CD",
    about_image_url: "",
    about_full_description: "",
    whatsapp_message: "Olá! Gostaria de agendar um horário."
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
  
  // Carregar dados
  useEffect(() => {
    loadCompanySettings();
    loadEmployees();
    loadSlideShowImages();
    loadTestimonials();
  }, []);
  
  const loadEmployees = async () => {
    try {
      const data = await Employee.list();
      setEmployees(data);
      return data;
    } catch (error) {
      console.error("Erro ao carregar funcionários:", error);
      setLoadError(error);
      throw error;
    }
  };

  const loadCompanySettings = async () => {
    try {
      const settings = await CompanySettings.list();
      if (settings && settings.length > 0) {
        setCompanySettings(settings[0]);
        setPreviewLogo(settings[0].logo_url);
        setPreviewAboutImage(settings[0].about_image_url);
      }
      return settings;
    } catch (error) {
      console.error("Erro ao carregar configurações da empresa:", error);
      setLoadError(error);
      throw error;
    }
  };

  const loadSlideShowImages = async () => {
    try {
      const images = await SlideShowImage.list('order');
      setSlideShowImages(images);
      return images;
    } catch (error) {
      console.error("Erro ao carregar imagens do slideshow:", error);
      setLoadError(error);
      throw error;
    }
  };

  const loadTestimonials = async () => {
    try {
      const data = await Testimonial.list();
      setTestimonials(data);
      return data;
    } catch (error) {
      console.error("Erro ao carregar depoimentos:", error);
      setLoadError(error);
      throw error;
    }
  };
  
  // Handlers de imagens
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
  
  // Salvar configurações
  const handleSaveCompanySettings = async () => {
    try {
      setIsLoading(true);
      
      if (companySettings.id) {
        await CompanySettings.update(companySettings.id, companySettings);
      } else {
        await CompanySettings.create(companySettings);
      }
      
      setAlert({
        type: 'success',
        message: 'Configurações salvas com sucesso!'
      });
      
      loadCompanySettings();
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      setAlert({
        type: 'error',
        message: 'Erro ao salvar configurações: ' + error.message
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handlers de slides
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
  
  // Handlers de WhatsApp
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
  
  // Handlers de depoimentos
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
  
  return (
    <div className="space-y-6">
      {alert && (
        <SimpleAlert
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert(null)}
        />
      )}
      
      <RateLimitHandler error={loadError} onRetry={() => {
        loadCompanySettings();
        loadEmployees();
        loadSlideShowImages();
        loadTestimonials();
      }}>
        <h2 className="text-3xl font-bold text-gray-800">Configurações</h2>

        <Tabs defaultValue="business" className="space-y-6">
          <TabsList className="grid w-full grid-cols-1 md:grid-cols-4">
            <TabsTrigger value="business" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Empresa
            </TabsTrigger>
            <TabsTrigger value="site" className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> Site
            </TabsTrigger>
            <TabsTrigger value="testimonials" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Depoimentos
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" /> WhatsApp
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
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Logo da Empresa</label>
                  <div className="flex items-center gap-4">
                    {previewLogo && (
                      <div className="w-32 h-32 border rounded flex items-center justify-center overflow-hidden">
                        <img 
                          src={previewLogo} 
                          alt="Logo" 
                          className="max-w-full max-h-full object-contain"
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
                        onChange={handleLogoChange}
                      />
                    </label>
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
                <CardDescription>Personalize a aparência e conteúdo do seu site público</CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Descrição do Site</label>
                    <Textarea
                      value={companySettings.website_description || ""}
                      onChange={(e) => setCompanySettings({...companySettings, website_description: e.target.value})}
                      placeholder="Uma breve descrição da sua empresa para o site"
                      rows={4}
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">URL do Facebook</label>
                      <div className="relative">
                        <Facebook className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                          value={companySettings.facebook_url || ""}
                          onChange={(e) => setCompanySettings({...companySettings, facebook_url: e.target.value})}
                          placeholder="https://facebook.com/suaempresa"
                          className="pl-8"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">URL do Instagram</label>
                      <div className="relative">
                        <Instagram className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                          value={companySettings.instagram_url || ""}
                          onChange={(e) => setCompanySettings({...companySettings, instagram_url: e.target.value})}
                          placeholder="https://instagram.com/suaempresa"
                          className="pl-8"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cor Primária</label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="color"
                        value={companySettings.website_primary_color || "#294380"}
                        onChange={(e) => setCompanySettings({...companySettings, website_primary_color: e.target.value})}
                        className="w-16 h-10"
                      />
                      <Input
                        value={companySettings.website_primary_color || "#294380"}
                        onChange={(e) => setCompanySettings({...companySettings, website_primary_color: e.target.value})}
                        placeholder="#294380"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cor Secundária</label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="color"
                        value={companySettings.website_secondary_color || "#69D2CD"}
                        onChange={(e) => setCompanySettings({...companySettings, website_secondary_color: e.target.value})}
                        className="w-16 h-10"
                      />
                      <Input
                        value={companySettings.website_secondary_color || "#69D2CD"}
                        onChange={(e) => setCompanySettings({...companySettings, website_secondary_color: e.target.value})}
                        placeholder="#69D2CD"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Imagem da Sessão Sobre</label>
                  <div className="flex items-center gap-4">
                    {previewAboutImage && (
                      <div className="w-32 h-32 border rounded flex items-center justify-center overflow-hidden">
                        <img 
                          src={previewAboutImage} 
                          alt="Imagem Sobre" 
                          className="max-w-full max-h-full object-contain"
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
                  <label className="text-sm font-medium">Descrição Completa (Seção Sobre)</label>
                  <Textarea
                    value={companySettings.about_full_description || ""}
                    onChange={(e) => setCompanySettings({...companySettings, about_full_description: e.target.value})}
                    placeholder="Descrição detalhada da sua empresa para a seção Sobre"
                    rows={6}
                  />
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
                    ) : 'Salvar Configurações do Site'}
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Slideshow da Página Inicial</CardTitle>
                  <CardDescription>Gerencie as imagens do slideshow da página inicial</CardDescription>
                </div>
                <Button 
                  onClick={() => {
                    resetSlideForm();
                    setShowSlideForm(true);
                  }}
                  className="bg-[#294380] hover:bg-[#0D0F36]"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Slide
                </Button>
              </CardHeader>
              
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Imagem</TableHead>
                        <TableHead>Título</TableHead>
                        <TableHead>Ordem</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {slideShowImages.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                            Nenhum slide cadastrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        slideShowImages.map((slide) => (
                          <TableRow key={slide.id}>
                            <TableCell>
                              <div className="w-16 h-12 rounded bg-gray-100 overflow-hidden">
                                {slide.image_url ? (
                                  <img 
                                    src={slide.image_url} 
                                    alt={slide.title} 
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Image className="h-6 w-6 text-gray-400" />
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{slide.title}</TableCell>
                            <TableCell>{slide.order}</TableCell>
                            <TableCell>
                              <span 
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  slide.active 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {slide.active ? 'Ativo' : 'Inativo'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditSlide(slide)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600"
                                  onClick={() => handleDeleteSlide(slide.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="testimonials" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Depoimentos de Clientes</CardTitle>
                <CardDescription>Gerencie os depoimentos exibidos no site público</CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Depoimento</TableHead>
                        <TableHead>Avaliação</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {testimonials.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                            Nenhum depoimento encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        testimonials.map((testimonial) => (
                          <TableRow key={testimonial.id}>
                            <TableCell className="font-medium">{testimonial.name}</TableCell>
                            <TableCell>
                              <div className="max-w-xs truncate">{testimonial.text}</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < testimonial.rating 
                                        ? 'text-yellow-400 fill-current' 
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span 
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  testimonial.approved 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {testimonial.approved ? 'Aprovado' : 'Pendente'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {!testimonial.approved && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-green-600"
                                    onClick={() => handleApproveTestimonial(testimonial.id, true)}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600"
                                  onClick={() => handleDeleteTestimonial(testimonial.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="whatsapp" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurações do WhatsApp</CardTitle>
                <CardDescription>
                  Configure o número do WhatsApp e mensagem padrão para contato
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Número do WhatsApp</label>
                    <Input
                      value={companySettings.whatsapp || ""}
                      onChange={(e) => setCompanySettings({...companySettings, whatsapp: e.target.value})}
                      placeholder="(XX) XXXXX-XXXX"
                    />
                    <p className="text-sm text-gray-500">
                      Digite apenas números, sem espaços ou caracteres especiais
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Mensagem Padrão</label>
                    <Textarea
                      value={companySettings.whatsapp_message || ""}
                      onChange={(e) => setCompanySettings({...companySettings, whatsapp_message: e.target.value})}
                      placeholder="Olá! Gostaria de agendar um horário."
                      rows={4}
                    />
                    <p className="text-sm text-gray-500">
                      Esta mensagem será pré-preenchida quando o cliente clicar no botão do WhatsApp
                    </p>
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
                      ) : 'Salvar Configurações do WhatsApp'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </RateLimitHandler>
      
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
    </div>
  );
}