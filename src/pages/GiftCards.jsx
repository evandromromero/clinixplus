import React, { useState, useEffect, useRef } from 'react';
import { GiftCard, Client, Sale, CompanySettings } from '@/firebase/entities';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Gift, 
  Search, 
  Calendar, 
  Plus, 
  Check, 
  Copy, 
  RefreshCw, 
  X,
  ChevronRight,
  Send,
  Printer,
  Share2,
  Image,
  Download
} from "lucide-react";
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createPageUrl } from "@/utils";
import { useNavigate } from 'react-router-dom';
import GiftCardTemplate from '../components/giftcard/GiftCardTemplate';
import RateLimitHandler from '@/components/RateLimitHandler';
import { toast } from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import html2canvas from 'html2canvas';
import html2pdf from 'html2pdf.js';

export default function GiftCards() {
  const [giftCards, setGiftCards] = useState([]);
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("ativos");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRedeemDialog, setShowRedeemDialog] = useState(false);
  const [selectedGiftCard, setSelectedGiftCard] = useState(null);
  const [showConfirmCancelDialog, setShowConfirmCancelDialog] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [searchClient, setSearchClient] = useState("");
  const [clientSearchResults, setClientSearchResults] = useState([]);
  const [companyName, setCompanyName] = useState("");
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  
  const giftCardTemplateRef = useRef(null);
  const navigate = useNavigate();

  const [newGiftCard, setNewGiftCard] = useState({
    value: 100,
    client_id: "",
    recipient_name: "",
    recipient_email: "",
    recipient_phone: "",
    message: "",
    expiration_date: format(addMonths(new Date(), 12), 'yyyy-MM-dd'),
    design_template: "padrao",
    company_name: ""
  });

  useEffect(() => {
    loadData();
    loadCompanySettings();
  }, []);

  const loadCompanySettings = async () => {
    try {
      // Buscar todos os documentos de company_settings
      const settingsList = await CompanySettings.list();
      // Usar o primeiro documento encontrado
      if (settingsList && settingsList.length > 0) {
        const settings = settingsList[0];
        if (settings?.name) {
          setCompanyName(settings.name);
          setNewGiftCard(prev => ({
            ...prev,
            company_name: settings.name
          }));
        }
      }
    } catch (error) {
      console.error("Erro ao carregar configurações da empresa:", error);
    }
  };

  const loadData = async () => {
    try {
      const [giftCardsData, clientsData] = await Promise.all([
        GiftCard.list(),
        Client.list()
      ]);
      setGiftCards(giftCardsData);
      setClients(clientsData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  const handleSearchClient = (term) => {
    setSearchClient(term);
    if (!term.trim()) {
      setClientSearchResults([]);
      return;
    }

    const results = clients.filter(client => 
      client.name.toLowerCase().includes(term.toLowerCase()) ||
      (client.cpf && client.cpf.includes(term))
    );
    setClientSearchResults(results);
  };

  const selectClient = (client) => {
    setNewGiftCard({
      ...newGiftCard,
      client_id: client.id
    });
    setSearchClient(client.name);
    setClientSearchResults([]);
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) code += '-';
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Função para capturar o Gift Card como imagem base64
  const captureGiftCardAsBase64 = async () => {
    if (!giftCardTemplateRef.current) return null;
    
    try {
      const canvas = await html2canvas(giftCardTemplateRef.current);
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error("Erro ao capturar imagem do gift card:", error);
      toast.error("Erro ao gerar imagem do gift card");
      return null;
    }
  };

  const handleCreateGiftCard = async () => {
    try {
      if (!newGiftCard.client_id) {
        toast.error("Selecione um cliente");
        return;
      }

      if (!newGiftCard.value || newGiftCard.value <= 0) {
        toast.error("Informe um valor válido");
        return;
      }

      if (!newGiftCard.expiration_date) {
        toast.error("Informe uma data de expiração");
        return;
      }

      // Capturar a imagem do gift card como base64
      const imageBase64 = await captureGiftCardAsBase64();

      // Gerar código aleatório
      const code = generateRandomCode();

      // Criar o gift card
      const giftCardData = await GiftCard.create({
        ...newGiftCard,
        code,
        status: 'active',
        image_base64: imageBase64,
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString()
      });

      toast.success("Gift Card criado com sucesso!");
      
      // Fechar o diálogo
      resetForm();
      setShowCreateDialog(false);
      
      // Redirecionar para a página de vendas com o ID do gift card
      navigate(`/sales-register?gift_card=${giftCardData.id}`);
      
      // Armazenar o código para uso posterior (opcional)
      localStorage.setItem('last_giftcard_code', code);
      
      // Recarregar os gift cards
      await loadData();
    } catch (error) {
      console.error("Erro ao criar gift card:", error);
      toast.error("Erro ao criar gift card");
    }
  };

  const resetForm = () => {
    setNewGiftCard({
      value: 100,
      client_id: "",
      recipient_name: "",
      recipient_email: "",
      recipient_phone: "",
      message: "",
      expiration_date: format(addMonths(new Date(), 12), 'yyyy-MM-dd'),
      design_template: "padrao",
      company_name: companyName
    });
    setSearchClient("");
  };

  const handleRedeemGiftCard = async () => {
    try {
      if (!redeemCode.trim()) {
        toast.error("Digite o código do gift card");
        return;
      }

      // Garantir que estamos buscando diretamente do Firebase
      console.log("Buscando gift card com código:", redeemCode);
      
      // Primeiro, tentar encontrar na lista carregada
      const foundGiftCard = giftCards.find(
        card => card.code === redeemCode && (card.status === "ativo" || card.status === "active")
      );

      if (foundGiftCard) {
        console.log("Gift card encontrado na lista local:", foundGiftCard);
        
        try {
          // Atualizar o status do gift card para "usado"/"used"
          await GiftCard.update(foundGiftCard.id, {
            status: "used",
            redemption_date: new Date().toISOString()
          });
          
          console.log("Gift card marcado como usado");
          
          setSelectedGiftCard(foundGiftCard);
          setShowRedeemDialog(false);
          
          toast.success("Gift Card resgatado com sucesso!");
          
          // Redirecionar para a página de vendas com desconto do gift card
          console.log("Redirecionando para:", `/sales-register?apply_giftcard=${foundGiftCard.id}`);
          
          // Usar window.location para garantir o redirecionamento
          window.location.href = `/sales-register?apply_giftcard=${foundGiftCard.id}`;
          return;
        } catch (updateError) {
          console.error("Erro ao atualizar status do gift card:", updateError);
          toast.error("Erro ao atualizar status do gift card");
          return;
        }
      }

      // Se não encontrar na lista, tentar buscar diretamente do Firebase
      console.log("Gift card não encontrado na lista local, buscando do Firebase...");
      
      try {
        // Buscar todos os gift cards do Firebase
        const allGiftCards = await GiftCard.list();
        console.log("Gift cards encontrados no Firebase:", allGiftCards.length);
        
        // Procurar pelo código específico
        const firebaseGiftCard = allGiftCards.find(
          card => card.code === redeemCode && (card.status === "ativo" || card.status === "active")
        );
        
        if (firebaseGiftCard) {
          console.log("Gift card encontrado no Firebase:", firebaseGiftCard);
          
          // Atualizar o status do gift card para "usado"/"used"
          await GiftCard.update(firebaseGiftCard.id, {
            status: "used",
            redemption_date: new Date().toISOString()
          });
          
          console.log("Gift card marcado como usado");
          
          setSelectedGiftCard(firebaseGiftCard);
          setShowRedeemDialog(false);
          
          toast.success("Gift Card resgatado com sucesso!");
          
          // Redirecionar para a página de vendas com desconto do gift card
          console.log("Redirecionando para:", `/sales-register?apply_giftcard=${firebaseGiftCard.id}`);
          
          // Usar window.location para garantir o redirecionamento
          window.location.href = `/sales-register?apply_giftcard=${firebaseGiftCard.id}`;
          return;
        } else {
          console.log("Gift card não encontrado no Firebase");
          toast.error("Gift card não encontrado ou já utilizado");
        }
      } catch (fbError) {
        console.error("Erro ao buscar gift cards do Firebase:", fbError);
        toast.error("Erro ao buscar gift cards");
      }
    } catch (error) {
      console.error("Erro ao resgatar gift card:", error);
      toast.error("Erro ao processar o resgate");
    }
  };

  const handleCancelGiftCard = async () => {
    try {
      if (!selectedGiftCard) return;

      await GiftCard.update(selectedGiftCard.id, {
        status: "cancelado"
      });

      setShowConfirmCancelDialog(false);
      setSelectedGiftCard(null);
      await loadData();
    } catch (error) {
      console.error("Erro ao cancelar gift card:", error);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Código copiado para a área de transferência");
    });
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : "Cliente não encontrado";
  };

  const getStatusBadge = (status) => {
    // Normalizar o status para lidar com versões em inglês e português
    const statusLower = status.toLowerCase();
    
    if (statusLower === "ativo" || statusLower === "active") {
      return <Badge className="bg-green-100 text-green-700">Ativo</Badge>;
    } else if (statusLower === "usado" || statusLower === "used") {
      return <Badge className="bg-blue-100 text-blue-700">Utilizado</Badge>;
    } else if (statusLower === "expirado" || statusLower === "expired") {
      return <Badge className="bg-amber-100 text-amber-700">Expirado</Badge>;
    } else if (statusLower === "cancelado" || statusLower === "canceled") {
      return <Badge className="bg-red-100 text-red-700">Cancelado</Badge>;
    } else {
      return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredGiftCards = giftCards.filter(card => {
    // Filtrar por status
    if (activeTab === "ativos" && card.status !== "ativo" && card.status !== "active") return false;
    if (activeTab === "usados" && card.status !== "usado" && card.status !== "used") return false;
    if (activeTab === "cancelados" && card.status !== "cancelado" && card.status !== "canceled") return false;
    
    // Filtrar por termo de busca
    if (searchTerm) {
      const clientName = getClientName(card.client_id).toLowerCase();
      const recipientName = (card.recipient_name || "").toLowerCase();
      const code = card.code.toLowerCase();
      
      return clientName.includes(searchTerm.toLowerCase()) ||
             recipientName.includes(searchTerm.toLowerCase()) ||
             code.includes(searchTerm.toLowerCase());
    }
    
    return true;
  });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);
  };

  // Função para enviar o gift card para WhatsApp
  const sendToWhatsApp = (card) => {
    if (!card) return;
    
    try {
      // Construir a mensagem
      const message = `Olá${card.recipient_name ? ' ' + card.recipient_name : ''}! Você recebeu um Gift Card da ${card.company_name || companyName} no valor de ${formatCurrency(card.value)}. Código: ${card.code}${card.message ? '\n\nMensagem: ' + card.message : ''}`;
      
      // Obter o número de telefone (se disponível) ou pedir para digitar
      let phone = card.recipient_phone;
      
      if (!phone) {
        phone = prompt("Digite o número de WhatsApp para enviar o Gift Card (apenas números):");
        if (!phone) return; // Usuário cancelou
      }
      
      // Remover caracteres não numéricos
      phone = phone.replace(/\D/g, '');
      
      // Abrir WhatsApp Web com a mensagem
      const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      
      toast.success("WhatsApp aberto com o Gift Card");
    } catch (error) {
      console.error("Erro ao enviar para WhatsApp:", error);
      toast.error("Erro ao abrir WhatsApp");
    }
  };

  // Função para gerar e imprimir o recibo do gift card
  const generateReceipt = (card) => {
    if (!card) return;
    
    try {
      setSelectedGiftCard(card);
      setShowReceiptDialog(true);
    } catch (error) {
      console.error("Erro ao gerar recibo:", error);
      toast.error("Erro ao gerar recibo");
    }
  };

  // Função para imprimir o recibo
  const printReceipt = () => {
    try {
      const element = document.getElementById('gift-card-receipt');
      const opt = {
        margin: 10,
        filename: `Gift-Card-${selectedGiftCard?.code}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      html2pdf().from(element).set(opt).save().then(() => {
        toast.success("Recibo gerado com sucesso!");
      });
    } catch (error) {
      console.error("Erro ao imprimir recibo:", error);
      toast.error("Erro ao imprimir recibo");
    }
  };

  // Função para visualizar a imagem do gift card
  const viewGiftCardImage = async (card) => {
    if (!card) return;
    
    try {
      // Se o card já tem a imagem base64, usamos ela diretamente
      if (card.image_base64) {
        setSelectedGiftCard(card);
        setShowImageDialog(true);
      } else {
        // Se não, tentamos buscar do Firebase
        const giftCardData = await GiftCard.get(card.id);
        if (giftCardData && giftCardData.image_base64) {
          setSelectedGiftCard(giftCardData);
          setShowImageDialog(true);
        } else {
          toast.error("Imagem do Gift Card não encontrada");
        }
      }
    } catch (error) {
      console.error("Erro ao visualizar imagem:", error);
      toast.error("Erro ao carregar imagem do Gift Card");
    }
  };

  // Função para fazer download da imagem do gift card
  const downloadGiftCardImage = (card) => {
    if (!card || !card.image_base64) return;
    
    try {
      // Criar um link temporário para download
      const link = document.createElement('a');
      link.href = card.image_base64;
      link.download = `GiftCard-${card.code}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Download iniciado");
    } catch (error) {
      console.error("Erro ao fazer download da imagem:", error);
      toast.error("Erro ao fazer download da imagem");
    }
  };

  return (
    <div className="space-y-6">
      <Toaster />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-3xl font-bold text-gray-800">Gift Cards</h2>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowRedeemDialog(true)}
            variant="outline"
            className="flex-1 sm:flex-none"
          >
            <Check className="w-4 h-4 mr-2" />
            Resgatar
          </Button>
          <Button 
            onClick={() => {
              resetForm();
              setShowCreateDialog(true);
            }}
            className="bg-purple-600 hover:bg-purple-700 flex-1 sm:flex-none"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Gift Card
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar gift cards..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <Tabs defaultValue="ativos" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ativos">Ativos</TabsTrigger>
          <TabsTrigger value="usados">Utilizados</TabsTrigger>
          <TabsTrigger value="cancelados">Cancelados</TabsTrigger>
        </TabsList>

        <TabsContent value="ativos" className="space-y-4 mt-4">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Destinatário</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Data de Expiração</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGiftCards.length > 0 ? (
                  filteredGiftCards.map((card) => (
                    <TableRow key={card.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <span className="font-mono">{card.code}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => copyToClipboard(card.code)}
                            className="h-6 w-6 ml-1"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{getClientName(card.client_id)}</TableCell>
                      <TableCell>{card.recipient_name || "Não especificado"}</TableCell>
                      <TableCell>{formatCurrency(card.value)}</TableCell>
                      <TableCell>
                        {format(new Date(card.expiration_date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>{getStatusBadge(card.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedGiftCard(card);
                            setShowConfirmCancelDialog(true);
                          }}
                          className="text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => sendToWhatsApp(card)}
                          className="text-green-500"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => generateReceipt(card)}
                          className="text-blue-500"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => viewGiftCardImage(card)}
                          className="text-purple-500"
                        >
                          <Image className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                      Nenhum gift card ativo encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="usados" className="space-y-4 mt-4">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Data de Utilização</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGiftCards.length > 0 ? (
                  filteredGiftCards.map((card) => (
                    <TableRow key={card.id}>
                      <TableCell>
                        <span className="font-mono">{card.code}</span>
                      </TableCell>
                      <TableCell>{getClientName(card.client_id)}</TableCell>
                      <TableCell>{formatCurrency(card.value)}</TableCell>
                      <TableCell>
                        {card.redemption_date 
                          ? format(new Date(card.redemption_date), 'dd/MM/yyyy')
                          : "Não definido"}
                      </TableCell>
                      <TableCell>{getStatusBadge(card.status)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                      Nenhum gift card utilizado encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="cancelados" className="space-y-4 mt-4">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Data de Cancelamento</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGiftCards.length > 0 ? (
                  filteredGiftCards.map((card) => (
                    <TableRow key={card.id}>
                      <TableCell>
                        <span className="font-mono">{card.code}</span>
                      </TableCell>
                      <TableCell>{getClientName(card.client_id)}</TableCell>
                      <TableCell>{formatCurrency(card.value)}</TableCell>
                      <TableCell>
                        {card.updated_date 
                          ? format(new Date(card.updated_date), 'dd/MM/yyyy')
                          : "Não definido"}
                      </TableCell>
                      <TableCell>{getStatusBadge(card.status)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                      Nenhum gift card cancelado encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Diálogo de criação de Gift Card */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Criar Novo Gift Card</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <div>
                <Label>Cliente (comprador)</Label>
                <div className="relative">
                  <Input
                    value={searchClient}
                    onChange={(e) => handleSearchClient(e.target.value)}
                    placeholder="Buscar cliente por nome ou CPF"
                  />
                  {clientSearchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                      {clientSearchResults.map(client => (
                        <div
                          key={client.id}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => selectClient(client)}
                        >
                          <div className="font-medium">{client.name}</div>
                          <div className="text-sm text-gray-500">{client.cpf}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label>Valor do Gift Card</Label>
                <Input
                  type="number"
                  value={newGiftCard.value}
                  onChange={(e) => setNewGiftCard({
                    ...newGiftCard,
                    value: parseFloat(e.target.value) || 0
                  })}
                  min="1"
                  step="1"
                />
              </div>

              <div>
                <Label>Data de Expiração</Label>
                <Input
                  type="date"
                  value={newGiftCard.expiration_date}
                  onChange={(e) => setNewGiftCard({
                    ...newGiftCard,
                    expiration_date: e.target.value
                  })}
                />
              </div>

              <div>
                <Label>Nome do Destinatário (opcional)</Label>
                <Input
                  value={newGiftCard.recipient_name}
                  onChange={(e) => setNewGiftCard({
                    ...newGiftCard,
                    recipient_name: e.target.value
                  })}
                  placeholder="Quem receberá o presente"
                />
              </div>

              <div>
                <Label>Email do Destinatário (opcional)</Label>
                <Input
                  type="email"
                  value={newGiftCard.recipient_email}
                  onChange={(e) => setNewGiftCard({
                    ...newGiftCard,
                    recipient_email: e.target.value
                  })}
                  placeholder="Para envio automático"
                />
              </div>

              <div>
                <Label>WhatsApp do Destinatário (opcional)</Label>
                <Input
                  type="tel"
                  value={newGiftCard.recipient_phone}
                  onChange={(e) => setNewGiftCard({
                    ...newGiftCard,
                    recipient_phone: e.target.value
                  })}
                  placeholder="Ex: (11) 99999-9999"
                />
              </div>

              <div>
                <Label>Mensagem Personalizada</Label>
                <Textarea
                  value={newGiftCard.message}
                  onChange={(e) => setNewGiftCard({
                    ...newGiftCard,
                    message: e.target.value
                  })}
                  placeholder="Mensagem que aparecerá no gift card"
                  className="h-20"
                />
              </div>

              <div>
                <Label>Design do Gift Card</Label>
                <Select
                  value={newGiftCard.design_template}
                  onValueChange={(value) => setNewGiftCard({
                    ...newGiftCard,
                    design_template: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um design" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="padrao">Padrão</SelectItem>
                    <SelectItem value="aniversario">Aniversário</SelectItem>
                    <SelectItem value="natal">Natal</SelectItem>
                    <SelectItem value="especial">Especial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center">
              <h3 className="text-lg font-medium mb-4">Pré-visualização</h3>
              <GiftCardTemplate 
                ref={giftCardTemplateRef}
                giftCard={newGiftCard} 
                previewMode={true} 
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateGiftCard} className="bg-purple-600 hover:bg-purple-700">
              Criar e Prosseguir para Venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de resgate de Gift Card */}
      <Dialog open={showRedeemDialog} onOpenChange={setShowRedeemDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resgatar Gift Card</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div>
              <Label>Código do Gift Card</Label>
              <Input
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                placeholder="Ex: ABCD-1234-EFGH"
                className="font-mono"
              />
            </div>

            <p className="text-sm text-gray-500">
              Digite o código do gift card para resgatá-lo e aplicar como desconto em uma venda.
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRedeemDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRedeemGiftCard} className="bg-green-600 hover:bg-green-700">
              Verificar e Resgatar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmação de cancelamento */}
      <Dialog open={showConfirmCancelDialog} onOpenChange={setShowConfirmCancelDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar Gift Card</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p>
              Tem certeza que deseja cancelar o gift card com código{" "}
              <span className="font-mono font-medium">{selectedGiftCard?.code}</span>?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Esta ação não pode ser desfeita. O gift card ficará inutilizável.
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmCancelDialog(false)}>
              Voltar
            </Button>
            <Button 
              onClick={handleCancelGiftCard} 
              variant="destructive"
            >
              Cancelar Gift Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de impressão de recibo */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recibo do Gift Card</DialogTitle>
          </DialogHeader>
          
          <div id="gift-card-receipt" className="py-4">
            <h2 className="text-lg font-medium mb-2">Recibo do Gift Card</h2>
            <p>
              Código: <span className="font-mono">{selectedGiftCard?.code}</span>
            </p>
            <p>
              Valor: {selectedGiftCard?.value ? formatCurrency(selectedGiftCard.value) : "N/A"}
            </p>
            <p>
              Destinatário: {selectedGiftCard?.recipient_name || "Não especificado"}
            </p>
            <p>
              Data de Expiração: {selectedGiftCard?.expiration_date ? 
                format(new Date(selectedGiftCard.expiration_date), 'dd/MM/yyyy') : 
                "Não especificada"}
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceiptDialog(false)}>
              Fechar
            </Button>
            <Button onClick={printReceipt} className="bg-blue-600 hover:bg-blue-700">
              Imprimir Recibo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para visualizar a imagem do Gift Card */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Visualização do Gift Card</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 flex flex-col items-center">
            <div className="mb-4">
              <h3 className="text-lg font-medium">Gift Card: {selectedGiftCard?.code}</h3>
              <p>Valor: {selectedGiftCard?.value ? formatCurrency(selectedGiftCard.value) : "N/A"}</p>
              <p>Destinatário: {selectedGiftCard?.recipient_name || "Não especificado"}</p>
            </div>
            
            {selectedGiftCard?.image_base64 ? (
              <div className="border rounded-lg overflow-hidden shadow-lg max-w-md">
                <img 
                  src={selectedGiftCard.image_base64} 
                  alt="Gift Card" 
                  className="w-full h-auto"
                />
              </div>
            ) : (
              <div className="text-center p-8 bg-gray-100 rounded-lg">
                <Image className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">Imagem não disponível</p>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex flex-wrap gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowImageDialog(false)}>
              Fechar
            </Button>
            
            {selectedGiftCard?.image_base64 && (
              <Button 
                onClick={() => downloadGiftCardImage(selectedGiftCard)} 
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            )}
            
            {selectedGiftCard?.recipient_phone && (
              <Button 
                onClick={() => {
                  setShowImageDialog(false);
                  sendToWhatsApp(selectedGiftCard);
                }} 
                className="bg-green-600 hover:bg-green-700"
              >
                <Send className="mr-2 h-4 w-4" />
                Enviar por WhatsApp
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <RateLimitHandler />
    </div>
  );
}