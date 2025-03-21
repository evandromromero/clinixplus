import React, { useState, useEffect } from 'react';
import { GiftCard, Client, Sale } from '@/firebase/entities';
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
  ChevronRight
} from "lucide-react";
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createPageUrl } from "@/utils";
import { useNavigate } from 'react-router-dom';
import GiftCardTemplate from '../components/giftcard/GiftCardTemplate';
import RateLimitHandler from '@/components/RateLimitHandler';

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
  
  const navigate = useNavigate();

  const [newGiftCard, setNewGiftCard] = useState({
    value: 100,
    client_id: "",
    recipient_name: "",
    recipient_email: "",
    message: "",
    expiration_date: format(addMonths(new Date(), 12), 'yyyy-MM-dd'),
    design_template: "padrao"
  });

  useEffect(() => {
    loadData();
  }, []);

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

  const handleCreateGiftCard = async () => {
    try {
      if (!newGiftCard.client_id) {
        alert("Selecione um cliente");
        return;
      }

      const code = generateRandomCode();
      const giftCardData = {
        ...newGiftCard,
        code,
        purchase_date: format(new Date(), 'yyyy-MM-dd'),
        status: "ativo"
      };

      const createdGiftCard = await GiftCard.create(giftCardData);
      
      // Redirecionar para a página de vendas com o gift card
      navigate(createPageUrl(`SalesRegister?type=giftcard&giftcard_id=${createdGiftCard.id}`));
      
      setShowCreateDialog(false);
      resetNewGiftCard();
      await loadData();
    } catch (error) {
      console.error("Erro ao criar gift card:", error);
      alert("Não foi possível criar o gift card");
    }
  };

  const resetNewGiftCard = () => {
    setNewGiftCard({
      value: 100,
      client_id: "",
      recipient_name: "",
      recipient_email: "",
      message: "",
      expiration_date: format(addMonths(new Date(), 12), 'yyyy-MM-dd'),
      design_template: "padrao"
    });
    setSearchClient("");
  };

  const handleRedeemGiftCard = async () => {
    try {
      if (!redeemCode.trim()) {
        alert("Digite o código do gift card");
        return;
      }

      const foundGiftCard = giftCards.find(
        card => card.code === redeemCode && card.status === "ativo"
      );

      if (!foundGiftCard) {
        alert("Gift card não encontrado ou já utilizado");
        return;
      }

      setSelectedGiftCard(foundGiftCard);
      setShowRedeemDialog(false);
      
      // Redirecionar para a página de vendas com desconto do gift card
      navigate(createPageUrl(`SalesRegister?apply_giftcard=${foundGiftCard.id}`));
    } catch (error) {
      console.error("Erro ao resgatar gift card:", error);
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
      alert("Código copiado para a área de transferência");
    });
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : "Cliente não encontrado";
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "ativo":
        return <Badge className="bg-green-100 text-green-700">Ativo</Badge>;
      case "usado":
        return <Badge className="bg-blue-100 text-blue-700">Utilizado</Badge>;
      case "expirado":
        return <Badge className="bg-amber-100 text-amber-700">Expirado</Badge>;
      case "cancelado":
        return <Badge className="bg-red-100 text-red-700">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredGiftCards = giftCards.filter(card => {
    // Filtrar por status
    if (activeTab === "ativos" && card.status !== "ativo") return false;
    if (activeTab === "usados" && card.status !== "usado") return false;
    if (activeTab === "cancelados" && card.status !== "cancelado") return false;
    
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

  return (
    <div className="space-y-6">
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
              resetNewGiftCard();
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
      <RateLimitHandler />
    </div>
  );
}