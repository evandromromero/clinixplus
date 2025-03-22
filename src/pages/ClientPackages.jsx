import React, { useState, useEffect } from 'react';
import { format, addDays, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Client, 
  Package, 
  ClientPackage, 
  Service, 
  Sale, 
  UnfinishedSale,
  Employee
} from "@/firebase/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useToast } from "@/components/ui/use-toast";
import RateLimitHandler from '@/components/RateLimitHandler';
import { 
  Calendar, 
  Plus, 
  ShoppingBag, 
  Trash2, 
  PlusCircle, 
  Search, 
  PackageCheck 
} from "lucide-react";

export default function ClientPackages() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [clientPackages, setClientPackages] = useState([]);
  const [packages, setPackages] = useState([]);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("todos");
  const [selectedPackage, setSelectedPackage] = useState("");

  const [showSellDialog, setShowSellDialog] = useState(false);
  const [sellForm, setSellForm] = useState({
    client_id: "",
    package_id: "",
    purchase_date: format(new Date(), 'yyyy-MM-dd'),
    total_sessions: 0,
    expiration_date: ""
  });

  const [showNewPackageDialog, setShowNewPackageDialog] = useState(false);
  const [packageForm, setPackageForm] = useState({
    name: "",
    description: "",
    validity_days: 90,
    total_price: 0,
    discount: 0,
    services: []
  });

  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [clientSearchResults, setClientSearchResults] = useState([]);
  const [showClientSearch, setShowClientSearch] = useState(false);

  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedServiceQuantity, setSelectedServiceQuantity] = useState(1);

  const [serviceSearchTerm, setServiceSearchTerm] = useState("");
  const [serviceSearchResults, setServiceSearchResults] = useState([]);
  const [showServiceSearch, setShowServiceSearch] = useState(false);

  const [packageSearchTerm, setPackageSearchTerm] = useState("");
  const [packageSearchResults, setPackageSearchResults] = useState([]);
  const [showPackageSearch, setShowPackageSearch] = useState(false);

  const [dateFilter, setDateFilter] = useState("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState(null);

  const [hasUnfinishedSales, setHasUnfinishedSales] = useState(false);
  const [unfinishedSales, setUnfinishedSales] = useState([]);

  const [newPackage, setNewPackage] = useState({
    client_id: '',
    package_id: '',
    purchase_date: format(new Date(), 'yyyy-MM-dd'),
    expiration_date: format(addDays(new Date(), 90), 'yyyy-MM-dd'),
    sell_now: false
  });

  const resetNewPackageForm = () => {
    setNewPackage({
      client_id: '',
      package_id: '',
      purchase_date: format(new Date(), 'yyyy-MM-dd'),
      expiration_date: format(addDays(new Date(), 90), 'yyyy-MM-dd'),
      sell_now: false
    });
  };

  const handleCreateNewPackage = async () => {
    try {
      if (!newPackage.client_id || !newPackage.package_id) {
        toast({
          title: "Erro",
          description: "Por favor, selecione um cliente e um pacote",
          variant: "destructive"
        });
        return;
      }

      const purchaseDate = new Date(newPackage.purchase_date);
      const expirationDate = new Date(newPackage.expiration_date);
      
      const packageToCreate = {
        ...newPackage,
        purchase_date: purchaseDate.toISOString().split('T')[0],
        expiration_date: expirationDate.toISOString().split('T')[0]
      };
      
      const packageDetails = await Package.get(newPackage.package_id);
      
      let totalSessions = 0;
      if (packageDetails && packageDetails.services) {
        totalSessions = packageDetails.services.reduce((sum, service) => sum + (service.quantity || 0), 0);
      }
      
      packageToCreate.total_sessions = totalSessions;
      packageToCreate.sessions_used = 0;

      if (packageDetails) {
        packageToCreate.package_snapshot = {
          original_id: packageDetails.id,
          name: packageDetails.name,
          services: packageDetails.services,
          total_price: packageDetails.total_price,
          discount: packageDetails.discount,
          validity_days: packageDetails.validity_days,
          description: packageDetails.description,
          snapshot_date: new Date().toISOString()
        };
      }
      
      const createdPackage = await ClientPackage.create(packageToCreate);
      
      if (newPackage.sell_now) {
        // Redireciona para a página de vendas com os parâmetros necessários
        const params = new URLSearchParams({
          type: 'pacote',
          client_id: newPackage.client_id,
          client_package_id: createdPackage.id,
          amount: packageDetails.total_price
        });
        
        navigate(createPageUrl('SalesRegister', params.toString()));
        return;
      }
      
      toast({
        title: "Sucesso",
        description: "Pacote adicionado com sucesso!",
        variant: "success"
      });
      setShowNewPackageDialog(false);
      resetNewPackageForm();
      loadData();
    } catch (error) {
      console.error("Erro ao criar pacote:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao adicionar pacote. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleSellPackage = async () => {
    try {
      if (!sellForm.client_id || !sellForm.package_id) {
        toast({
          title: "Erro",
          description: "Selecione o cliente e o pacote",
          variant: "destructive"
        });
        return;
      }

      const selectedPackage = packages.find(p => p.id === sellForm.package_id);

      const newClientPackage = {
        client_id: sellForm.client_id,
        package_id: sellForm.package_id,
        purchase_date: sellForm.purchase_date,
        expiration_date: sellForm.expiration_date,
        total_sessions: sellForm.total_sessions,
        sessions_used: 0,
        status: 'ativo',
        session_history: [],
        package_snapshot: {
          id: selectedPackage.id,
          name: selectedPackage.name,
          description: selectedPackage.description,
          services: selectedPackage.services,
          total_price: selectedPackage.total_price,
          validity_days: selectedPackage.validity_days
        }
      };

      const createdPackage = await ClientPackage.create(newClientPackage);

      await UnfinishedSale.create({
        client_id: sellForm.client_id,
        type: 'pacote',
        items: [
          {
            item_id: sellForm.package_id,
            name: selectedPackage.name,
            quantity: 1,
            price: selectedPackage.total_price,
            discount: 0
          }
        ],
        total_amount: selectedPackage.total_price,
        client_package_id: createdPackage.id,
        date_created: new Date().toISOString(),
        status: 'pendente'
      });

      const saleParams = new URLSearchParams({
        type: 'pacote',
        client_id: sellForm.client_id,
        package_id: sellForm.package_id,
        client_package_id: createdPackage.id,
        amount: selectedPackage.total_price
      }).toString();

      navigate(createPageUrl('SalesRegister', saleParams));

      setShowSellDialog(false);
      setSellForm({
        client_id: "",
        package_id: "",
        purchase_date: format(new Date(), 'yyyy-MM-dd'),
        total_sessions: 0,
        expiration_date: ""
      });

      toast({
        title: "Sucesso",
        description: "Pacote criado com sucesso! Redirecionando para lançar a venda...",
        variant: "success"
      });
    } catch (error) {
      console.error("Erro ao vender pacote:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar pacote. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadData();
    checkUnfinishedSales();
    checkUnfinishedSaleStatus();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [clientPackagesData, packagesData, clientsData, servicesData, employeesData] = await Promise.all([
        ClientPackage.list(),
        Package.list(),
        Client.list(),
        Service.list(),
        Employee.list()
      ]);

      setClientPackages(clientPackagesData);
      setPackages(packagesData);
      setClients(clientsData);
      setServices(servicesData);
      setEmployees(employeesData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao carregar dados. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const checkUnfinishedSales = async () => {
    try {
      const sales = await UnfinishedSale.list();
      const pendingSales = sales.filter(sale => 
        sale.status === 'pendente' && 
        sale.type === 'pacote'
      );

      setUnfinishedSales(pendingSales);
      setHasUnfinishedSales(pendingSales.length > 0);
    } catch (error) {
      console.error("Erro ao verificar vendas não finalizadas:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao verificar vendas não finalizadas. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const checkUnfinishedSaleStatus = async () => {
    try {
      const sales = await Sale.list();
      const completedSales = sales.filter(sale => sale.status === 'finalizada');

      const unfinishedSalesList = await UnfinishedSale.list();

      for (const unfinishedSale of unfinishedSalesList) {
        if (unfinishedSale.status === 'pendente' && unfinishedSale.client_package_id) {
          const matchingCompletedSale = completedSales.find(sale => 
            sale.items && 
            sale.items.some(item => 
              item.type === 'pacote' &&
              item.item_id === unfinishedSale.client_package_id &&
              sale.client_id === unfinishedSale.client_id
            )
          );

          if (matchingCompletedSale) {
            await UnfinishedSale.update(unfinishedSale.id, { status: 'concluida' });
          }
        }
      }

      await checkUnfinishedSales();
    } catch (error) {
      console.error("Erro ao verificar status de vendas não finalizadas:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao verificar status de vendas não finalizadas. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const checkAndUpdatePackageStatus = async () => {
    const today = new Date();
    const updates = [];

    clientPackages.forEach(pkg => {
      if (pkg.status === 'ativo') {
        if (isBefore(new Date(pkg.expiration_date), today)) {
          updates.push(ClientPackage.update(pkg.id, { status: 'expirado' }));
        } else if (pkg.sessions_used >= pkg.total_sessions) {
          updates.push(ClientPackage.update(pkg.id, { status: 'finalizado' }));
        }
      }
    });

    if (updates.length > 0) {
      await Promise.all(updates);
      loadData();
    }
  };

  useEffect(() => {
    if (clientPackages.length > 0) {
      checkAndUpdatePackageStatus();
    }
  }, [clientPackages]);

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : "Cliente não encontrado";
  };

  const getPackageName = (packageId) => {
    const clientPkg = clientPackages.find(cp => cp.id === selectedPackage?.id);
    if (clientPkg && clientPkg.package_snapshot) {
      return clientPkg.package_snapshot.name;
    }

    const pkg = packages.find(p => p.id === packageId);
    return pkg ? pkg.name : "Pacote não encontrado";
  };

  const getServiceName = (serviceId) => {
    const service = services.find(s => s.id === serviceId);
    return service ? service.name : "Serviço não encontrado";
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee ? employee.name : "Profissional não encontrado";
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'ativo':
        return "bg-green-100 text-green-800 border-green-200";
      case 'finalizado':
        return "bg-blue-100 text-blue-800 border-blue-200";
      case 'expirado':
        return "bg-amber-100 text-amber-800 border-amber-200";
      case 'cancelado':
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getProgressBarWidth = (used, total) => {
    return Math.min(100, Math.round((used / total) * 100)) + "%";
  };

  const getFilteredPackages = () => {
    let filtered = clientPackages.filter(pkg => {
      const clientMatch = selectedClient ? pkg.client_id === selectedClient : true;
      const statusMatch = selectedStatus !== "todos" ? pkg.status === selectedStatus : true;
      return clientMatch && statusMatch;
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());

    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    if (dateFilter !== "todos") {
      filtered = filtered.filter(pkg => {
        const purchaseDate = new Date(pkg.purchase_date);
        purchaseDate.setHours(0, 0, 0, 0);

        switch (dateFilter) {
          case "hoje":
            return purchaseDate.getTime() === today.getTime();
          case "semana":
            return purchaseDate >= thisWeekStart;
          case "mes":
            return purchaseDate >= thisMonthStart;
          default:
            return true;
        }
      });
    }

    filtered.sort((a, b) => new Date(b.purchase_date) - new Date(a.purchase_date));

    return filtered;
  };

  const getPaginatedPackages = (packages) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return packages.slice(startIndex, endIndex);
  };

  const filteredPackages = getFilteredPackages();
  const paginatedPackages = getPaginatedPackages(filteredPackages);
  const totalPages = Math.ceil(filteredPackages.length / itemsPerPage);

  const confirmDeletePackage = (packageId) => {
    if (!packageId) {
      toast({
        title: "Erro",
        description: "Pacote não encontrado",
        variant: "destructive"
      });
      return;
    }

    setPackageToDelete(packageId);
    setShowDeleteDialog(true);
  };

  const handleDeletePackage = async (packageId) => {
    try {
      if (!packageId) {
        toast({
          title: "Erro",
          description: "ID do pacote não fornecido",
          variant: "destructive"
        });
        setShowDeleteDialog(false);
        return;
      }

      const clientPkgs = await ClientPackage.list();
      const pkgToDelete = clientPkgs.find(p => p.id === packageId);

      if (!pkgToDelete) {
        toast({
          title: "Erro",
          description: "Pacote não encontrado",
          variant: "destructive"
        });
        setShowDeleteDialog(false);
        return;
      }

      if (pkgToDelete.status === "finalizado" || pkgToDelete.status === "expirado") {
        toast({
          title: "Erro",
          description: "Não é possível excluir um pacote finalizado ou expirado",
          variant: "destructive"
        });
        setShowDeleteDialog(false);
        return;
      }

      if (pkgToDelete.sessions_used > 0) {
        toast({
          title: "Erro",
          description: "Não é possível excluir um pacote que já teve sessões utilizadas",
          variant: "destructive"
        });
        setShowDeleteDialog(false);
        return;
      }

      try {
        const sales = await Sale.list();
        const relatedSale = sales.find(s => 
          s.items && s.items.some(item => item.client_package_id === packageId)
        );

        if (relatedSale && relatedSale.status === "pago") {
          toast({
            title: "Erro",
            description: "Não é possível excluir um pacote que já foi pago",
            variant: "destructive"
          });
          setShowDeleteDialog(false);
          return;
        }

        const unfinishedSales = await UnfinishedSale.list();
        const unfinishedSale = unfinishedSales.find(s => s.client_package_id === packageId);

        if (unfinishedSale) {
          await UnfinishedSale.delete(unfinishedSale.id);
        }

        if (relatedSale && relatedSale.status === "pendente") {
          await Sale.delete(relatedSale.id);
        }
      } catch (error) {
        console.error("Erro ao verificar vendas relacionadas:", error);
      }

      await ClientPackage.delete(packageId);

      toast({
        title: "Sucesso",
        description: "Pacote do cliente removido com sucesso",
        variant: "success"
      });
      setShowDeleteDialog(false);
      loadData();
    } catch (error) {
      console.error("Erro ao excluir pacote:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir o pacote. Tente novamente.",
        variant: "destructive"
      });
      setShowDeleteDialog(false);
    }
  };

  const handleSearchClients = (searchTerm) => {
    if (!searchTerm.trim()) {
      setClientSearchResults([]);
      return;
    }

    const filteredClients = clients.filter(client => 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (client.cpf && client.cpf.includes(searchTerm))
    );

    setClientSearchResults(filteredClients);
  };

  const handleSearchPackages = (searchTerm) => {
    if (!searchTerm.trim()) {
      setPackageSearchResults([]);
      return;
    }

    const filteredPackages = packages.filter(pkg => 
      pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pkg.description && pkg.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    setPackageSearchResults(filteredPackages);
  };

  const handleSearchServices = (searchTerm) => {
    if (!searchTerm.trim()) {
      setServiceSearchResults([]);
      return;
    }

    const filteredServices = services.filter(service => 
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (service.description && service.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    setServiceSearchResults(filteredServices);
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';

    try {
      const date = new Date(dateString);
      return format(date, 'yyyy-MM-dd');
    } catch (error) {
      console.error("Erro ao formatar data:", error);
      return '';
    }
  };

  const handlePackageChange = (packageId) => {
    setSellForm(prev => {
      const selectedPkg = packages.find(p => p.id === packageId);
      if (!selectedPkg) return prev;

      const purchaseDate = new Date();
      const expirationDate = addDays(purchaseDate, selectedPkg.validity_days);

      const totalSessions = selectedPkg.services.reduce((sum, service) => sum + service.quantity, 0);

      return {
        ...prev,
        package_id: packageId,
        total_sessions: totalSessions,
        purchase_date: format(purchaseDate, 'yyyy-MM-dd'),
        expiration_date: format(expirationDate, 'yyyy-MM-dd')
      };
    });
  };

  const handlePurchaseDateChange = (newDate) => {
    setSellForm(prev => {
      const selectedPkg = packages.find(p => p.id === prev.package_id);

      const dateString = `${newDate}T00:00:00`;
      const purchaseDate = new Date(dateString);

      const expirationDate = selectedPkg 
        ? addDays(purchaseDate, selectedPkg.validity_days)
        : purchaseDate;

      return {
        ...prev,
        purchase_date: newDate,
        expiration_date: format(expirationDate, 'yyyy-MM-dd')
      };
    });
  };

  const handleAddService = () => {
    if (!selectedServiceId || selectedServiceQuantity <= 0) return;

    const serviceToAdd = services.find(s => s.id === selectedServiceId);
    if (!serviceToAdd) return;

    const existingServiceIndex = packageForm.services.findIndex(s => s.service_id === selectedServiceId);

    if (existingServiceIndex >= 0) {
      const updatedServices = [...packageForm.services];
      updatedServices[existingServiceIndex].quantity += selectedServiceQuantity;

      setPackageForm(prev => ({
        ...prev,
        services: updatedServices,
        total_price: calculateTotalPrice(updatedServices, prev.discount)
      }));
    } else {
      const newService = {
        service_id: selectedServiceId,
        name: serviceToAdd.name,
        quantity: selectedServiceQuantity,
        price: serviceToAdd.price
      };

      const updatedServices = [...packageForm.services, newService];

      setPackageForm(prev => ({
        ...prev,
        services: updatedServices,
        total_price: calculateTotalPrice(updatedServices, prev.discount)
      }));
    }

    setSelectedServiceId("");
    setSelectedServiceQuantity(1);
    setServiceSearchTerm("");
    setShowServiceSearch(false);
  };

  const handleRemoveService = (serviceId) => {
    const updatedServices = packageForm.services.filter(s => s.service_id !== serviceId);

    setPackageForm(prev => ({
      ...prev,
      services: updatedServices,
      total_price: calculateTotalPrice(updatedServices, prev.discount)
    }));
  };

  const calculateTotalPrice = (services, discountPercent) => {
    const subtotal = services.reduce((sum, service) => sum + (service.price * service.quantity), 0);
    const discount = (subtotal * discountPercent) / 100;
    return subtotal - discount;
  };

  const handleCreatePackage = async () => {
    try {
      if (packageForm.name === "" || packageForm.services.length === 0) {
        toast({
          title: "Erro",
          description: "Preencha todos os campos obrigatórios",
          variant: "destructive"
        });
        return;
      }

      const newPackage = {
        name: packageForm.name,
        description: packageForm.description,
        validity_days: packageForm.validity_days,
        services: packageForm.services.map(s => ({
          service_id: s.service_id,
          quantity: s.quantity
        })),
        total_price: packageForm.total_price,
        discount: packageForm.discount
      };

      await Package.create(newPackage);

      setShowNewPackageDialog(false);
      setPackageForm({
        name: "",
        description: "",
        validity_days: 90,
        total_price: 0,
        discount: 0,
        services: []
      });

      toast({
        title: "Sucesso",
        description: "Pacote criado com sucesso!",
        variant: "success"
      });

      await loadData();
    } catch (error) {
      console.error("Erro ao criar pacote:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar pacote. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleEditPackage = async (packageToEdit) => {
    try {
      // Busca os serviços atualizados
      const servicesData = await Service.list();
      
      console.log('Package to edit:', packageToEdit);
      console.log('Services data:', servicesData);

      // Pega os serviços do pacote
      const packageServices = [];
      const packageServicesList = packageToEdit.services || [];
      
      for (const svc of packageServicesList) {
        // Busca os detalhes do serviço
        const serviceDetails = servicesData.find(s => s.id === svc.service_id);
        console.log('Service details for', svc.service_id, ':', serviceDetails);
        
        // Adiciona o serviço com todos os dados necessários
        packageServices.push({
          service_id: svc.service_id,
          name: serviceDetails?.name || "Serviço não encontrado",
          quantity: parseInt(svc.quantity) || 0,
          price: parseFloat(serviceDetails?.price) || 0
        });
      }

      console.log('Mapped package services:', packageServices);

      // Calcula os valores finais
      const subtotal = packageServices.reduce((sum, service) => 
        sum + (service.price * service.quantity), 0);
      const discount = parseFloat(packageToEdit.discount) || 0;
      const total = subtotal - (subtotal * discount / 100);

      // Atualiza o formulário com os dados do pacote
      setPackageForm({
        name: packageToEdit.name || "",
        description: packageToEdit.description || "",
        validity_days: parseInt(packageToEdit.validity_days) || 90,
        services: packageServices,
        discount: discount,
        total_price: total
      });

      console.log('Form data to set:', packageForm);
      setCurrentPackage(packageToEdit);
      setShowNewPackageDialog(true);
    } catch (error) {
      console.error("Erro ao carregar dados para edição:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao carregar dados do pacote para edição",
        variant: "destructive"
      });
    }
  };

  const handleContinueSale = async (sale) => {
    try {
      const params = new URLSearchParams({
        type: 'pacote',
        client_id: sale.client_id,
        client_package_id: sale.client_package_id,
        amount: sale.total_amount,
        unfinished_sale_id: sale.id
      });
      
      navigate(createPageUrl('SalesRegister', params.toString()));
    } catch (error) {
      console.error("Erro ao continuar venda:", error);
      toast({
        title: "Erro",
        description: "Erro ao continuar a venda. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleCancelUnfinishedSale = async (saleId) => {
    try {
      await UnfinishedSale.update(saleId, { status: 'cancelada' });
      toast({
        title: "Sucesso",
        description: "Venda não finalizada cancelada com sucesso",
        variant: "success"
      });
      checkUnfinishedSales();
    } catch (error) {
      console.error("Erro ao cancelar venda:", error);
      toast({
        title: "Erro",
        description: "Erro ao cancelar venda. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-3xl font-bold text-gray-800">Pacotes de Clientes</h2>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowNewPackageDialog(true)} 
            className="bg-[#294380] hover:bg-[#1b2d5d] text-white"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Novo Pacote
          </Button>
          <Button 
            onClick={() => setShowSellDialog(true)} 
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            Vender Pacote
          </Button>
        </div>
      </div>

      {hasUnfinishedSales && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded relative mb-4">
          <h3 className="font-medium mb-2">Vendas de pacotes não finalizadas</h3>
          <div className="space-y-2">
            {unfinishedSales.map(sale => {
              const clientPackage = clientPackages.find(pkg => pkg.id === sale.client_package_id);
              const client = clients.find(c => c.id === sale.client_id);
              return (
                <div key={sale.id} className="flex justify-between items-center">
                  <div>
                    <p>Cliente: {client?.name || 'Cliente não encontrado'}</p>
                    <p className="text-sm text-yellow-700">
                      Pacote: {clientPackage?.package_snapshot?.name || "Pacote"} - 
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.total_amount)}
                    </p>
                    <p className="text-xs text-yellow-600">
                      Iniciado em: {format(new Date(sale.date_created), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleContinueSale(sale)}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white"
                    >
                      Continuar venda
                    </Button>
                    <Button
                      variant="outline"
                      className="border-red-500 text-red-500 hover:bg-red-50"
                      onClick={() => {
                        if (confirm("Deseja cancelar esta venda não finalizada?")) {
                          handleCancelUnfinishedSale(sale.id);
                        }
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Cliente</label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Todos os clientes</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="finalizado">Finalizados</SelectItem>
                  <SelectItem value="expirado">Expirados</SelectItem>
                  <SelectItem value="cancelado">Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Período</label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os períodos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os períodos</SelectItem>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="semana">Esta semana</SelectItem>
                  <SelectItem value="mes">Este mês</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  setSelectedClient("");
                  setSelectedStatus("todos");
                  setDateFilter("todos");
                  setCurrentPage(1);
                }}
              >
                Limpar Filtros
              </Button>
            </div>
          </div>

          {loading ? (
            <p className="text-center py-10 text-gray-500">Carregando pacotes...</p>
          ) : paginatedPackages.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Nenhum pacote encontrado com os filtros selecionados.</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-500">
                  Mostrando {Math.min(itemsPerPage, paginatedPackages.length)} de {filteredPackages.length} resultados
                </p>
              </div>

              <div className="space-y-4">
                {paginatedPackages.map(clientPkg => (
                  <div 
                    key={clientPkg.id} 
                    className={`p-4 border rounded-lg transition-all cursor-pointer ${
                      selectedPackage?.id === clientPkg.id 
                        ? 'border-blue-500 shadow-sm' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedPackage(clientPkg)}
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <h3 className="font-medium text-gray-900">
                          {getPackageName(clientPkg.package_id)}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Cliente: {getClientName(clientPkg.client_id)}
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                        <Badge 
                          variant="outline" 
                          className={getStatusBadgeStyle(clientPkg.status)}
                        >
                          {clientPkg.status.charAt(0).toUpperCase() + clientPkg.status.slice(1)}
                        </Badge>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Válido até {format(new Date(clientPkg.expiration_date), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-red-500 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDeletePackage(clientPkg.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Progresso:</span>
                        <span>{clientPkg.sessions_used} de {clientPkg.total_sessions} sessões</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: getProgressBarWidth(clientPkg.sessions_used, clientPkg.total_sessions) }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-6">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>

                  <div className="text-sm">
                    Página {currentPage} de {totalPages}
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {selectedPackage && (
        <Tabs defaultValue="details">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Detalhes do Pacote</TabsTrigger>
            <TabsTrigger value="history">Histórico de Sessões</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Detalhes do Pacote</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Pacote</h3>
                      <p className="text-lg font-medium">
                        {selectedPackage.package_snapshot 
                          ? selectedPackage.package_snapshot.name 
                          : getPackageName(selectedPackage.package_id)}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Cliente</h3>
                      <p className="text-lg font-medium">{getClientName(selectedPackage.client_id)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Data de Compra</h3>
                      <p className="text-base">
                        {format(new Date(selectedPackage.purchase_date), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Data de Validade</h3>
                      <p className="text-base">
                        {format(new Date(selectedPackage.expiration_date), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Status</h3>
                      <Badge 
                        variant="outline" 
                        className={getStatusBadgeStyle(selectedPackage.status)}
                      >
                        {selectedPackage.status.charAt(0).toUpperCase() + selectedPackage.status.slice(1)}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Progresso do Pacote</h3>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">Sessões Utilizadas:</span>
                        <span>{selectedPackage.sessions_used} de {selectedPackage.total_sessions}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-blue-500 h-3 rounded-full" 
                          style={{ width: getProgressBarWidth(selectedPackage.sessions_used, selectedPackage.total_sessions) }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Serviços Incluídos</h3>
                    <div className="space-y-2">
                      {selectedPackage.package_snapshot?.services?.map((service, index) => (
                        <div key={index} className="p-4 bg-gray-50 rounded-lg flex justify-between items-center">
                          <div>
                            <span className="font-medium">{service.name || getServiceName(service.service_id)}</span>
                            <span className="text-gray-500 ml-2">({service.quantity}x)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="history" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  Histórico de Sessões
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedPackage.session_history && selectedPackage.session_history.length > 0 ? (
                  <div className="space-y-4">
                    {selectedPackage.session_history.map((session, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{session.service_name || getServiceName(session.service_id)}</p>
                            <p className="text-sm text-gray-500">
                              {format(new Date(session.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                            <p className="text-sm text-gray-500">
                              Profissional: {getEmployeeName(session.employee_id)}
                            </p>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={
                              session.status === 'concluido' ? 'bg-green-50 text-green-700' :
                              session.status === 'agendado' ? 'bg-blue-50 text-blue-700' :
                              session.status === 'cancelado' ? 'bg-red-50 text-red-700' :
                              'bg-gray-50 text-gray-700'
                            }
                          >
                            {session.status === 'concluido' ? 'Concluído' :
                             session.status === 'agendado' ? 'Agendado' :
                             session.status === 'cancelado' ? 'Cancelado' :
                             session.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-6 text-gray-500">
                    Nenhuma sessão utilizada ainda.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={showSellDialog} onOpenChange={setShowSellDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Vender Pacote</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-2">
                <Label htmlFor="client">Cliente</Label>
                <div className="relative">
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <Input
                        placeholder="Buscar cliente por nome, email ou CPF..."
                        value={clientSearchTerm}
                        onChange={(e) => {
                          setClientSearchTerm(e.target.value);
                          handleSearchClients(e.target.value);
                          setShowClientSearch(true);
                        }}
                        onFocus={() => setShowClientSearch(true)}
                        className="pr-8"
                      />
                      <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                    {sellForm.client_id && (
                      <Badge className="whitespace-nowrap">
                        {getClientName(sellForm.client_id)}
                      </Badge>
                    )}
                  </div>

                  {showClientSearch && clientSearchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border max-h-60 overflow-auto">
                      {clientSearchResults.map((client) => (
                        <button
                          key={client.id}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100"
                          onClick={() => {
                            setSellForm({...sellForm, client_id: client.id});
                            setClientSearchTerm(client.name);
                            setShowClientSearch(false);
                          }}
                        >
                          <div className="font-medium">{client.name}</div>
                          <div className="text-sm text-gray-500 flex gap-2">
                            <span>{client.cpf}</span>
                            {client.email && <span>• {client.email}</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="package">Pacote</Label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Buscar pacote por nome ou descrição..."
                      value={packageSearchTerm}
                      onChange={(e) => {
                        setPackageSearchTerm(e.target.value);
                        handleSearchPackages(e.target.value);
                        setShowPackageSearch(true);
                      }}
                      onFocus={() => setShowPackageSearch(true)}
                      className="pr-8"
                    />
                    <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />

                    {showPackageSearch && packageSearchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border max-h-60 overflow-auto">
                        {packageSearchResults.map((pkg) => (
                          <button
                            key={pkg.id}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100"
                            onClick={() => {
                              handlePackageChange(pkg.id);
                              setPackageSearchTerm(pkg.name);
                              setShowPackageSearch(false);
                            }}
                          >
                            <div className="font-medium">{pkg.name}</div>
                            <div className="text-sm text-gray-500">
                              R$ {pkg.total_price.toFixed(2)} • {pkg.validity_days} dias
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowSellDialog(false);
                      setShowNewPackageDialog(true);
                    }}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Criar Novo
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="purchase_date">Data da Compra</Label>
                  <Input
                    id="purchase_date"
                    type="date"
                    value={sellForm.purchase_date}
                    onChange={(e) => handlePurchaseDateChange(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiration_date">Data de Validade</Label>
                  <Input
                    id="expiration_date"
                    type="date"
                    value={sellForm.expiration_date}
                    disabled
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sessions">Total de Sessões</Label>
                <Input
                  id="sessions"
                  type="number"
                  value={sellForm.total_sessions}
                  onChange={(e) => setSellForm({...sellForm, total_sessions: parseInt(e.target.value)})}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSellDialog(false)}>
              Cancelar
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleSellPackage}>
              <ShoppingBag className="w-4 h-4 mr-2" />
              Finalizar Venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewPackageDialog} onOpenChange={setShowNewPackageDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Novo Pacote</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="package_name">Nome do Pacote</Label>
                <Input
                  id="package_name"
                  placeholder="Ex: Pacote Facial Completo"
                  value={packageForm.name}
                  onChange={(e) => setPackageForm({...packageForm, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="validity_days">Validade (dias)</Label>
                <Input
                  id="validity_days"
                  type="number"
                  value={packageForm.validity_days}
                  onChange={(e) => setPackageForm({...packageForm, validity_days: parseInt(e.target.value)})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descreva o pacote..."
                value={packageForm.description}
                onChange={(e) => setPackageForm({...packageForm, description: e.target.value})}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Adicionar Serviços ao Pacote</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative">
                  <Input
                    placeholder="Cadastrar serviço..."
                    value={serviceSearchTerm}
                    onChange={(e) => {
                      setServiceSearchTerm(e.target.value);
                      handleSearchServices(e.target.value);
                      setShowServiceSearch(true);
                    }}
                    onFocus={() => setShowServiceSearch(true)}
                    className="pr-8"
                  />
                  <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />

                  {showServiceSearch && serviceSearchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border max-h-60 overflow-auto">
                      {serviceSearchResults.map((service) => (
                        <button
                          key={service.id}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100"
                          onClick={() => {
                            setSelectedServiceId(service.id);
                            setServiceSearchTerm(service.name);
                            setShowServiceSearch(false);
                          }}
                        >
                          <div className="font-medium">{service.name}</div>
                          <div className="text-sm text-gray-500">
                            R$ {service.price.toFixed(2)} • {service.duration} min
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex space-x-2">
                  <div className="w-full">
                    <Input
                      type="number"
                      min="1"
                      placeholder="Quantidade"
                      value={selectedServiceQuantity}
                      onChange={(e) => setSelectedServiceQuantity(parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <Button 
                  type="button"
                  onClick={handleAddService}
                  disabled={!selectedServiceId}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Serviço
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Serviços Incluídos</Label>
              {packageForm.services.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Nenhum serviço adicionado ao pacote.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Serviço</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead className="text-right">Preço Unit.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {packageForm.services.map((service, index) => (
                      <TableRow key={index}>
                        <TableCell>{service.name}</TableCell>
                        <TableCell className="text-right">{service.quantity}</TableCell>
                        <TableCell className="text-right">R$ {service.price.toFixed(2)}</TableCell>
                        <TableCell className="text-right">R$ {(service.price * service.quantity).toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleRemoveService(service.service_id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discount">Desconto (%)</Label>
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  max="100"
                  value={packageForm.discount}
                  onChange={(e) => setPackageForm({...packageForm, discount: parseFloat(e.target.value)})}
                />
              </div>

              <div className="space-y-2">
                <Label>Preço Final</Label>
                <div className="p-3 bg-gray-50 rounded-md flex items-center justify-between">
                  <span className="font-medium">Total:</span>
                  <span className="text-lg font-bold">R$ {packageForm.total_price.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewPackageDialog(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-[#294380] hover:bg-[#1b2d5d]" 
              onClick={handleCreatePackage}
              disabled={packageForm.name === "" || packageForm.services.length === 0}
            >
              <PackageCheck className="w-4 h-4 mr-2" />
              Criar Pacote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Excluir Pacote</DialogTitle>
          </DialogHeader>
          <p className="mb-4">Tem certeza que deseja excluir este pacote? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => handleDeletePackage(packageToDelete)}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <RateLimitHandler />
    </div>
  );
}
