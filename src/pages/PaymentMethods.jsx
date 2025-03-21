
import React, { useState, useEffect } from 'react';
import { PaymentMethod } from '@/api/entities';
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  PlusCircle, 
  CreditCard, 
  DollarSign, 
  Smartphone, 
  Edit, 
  Trash2, 
  Plus, 
  Percent, 
  Calendar, 
  AlertTriangle,
  X
} from "lucide-react";

export default function PaymentMethods() {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentMethod, setCurrentMethod] = useState(null);
  const [selectedTab, setSelectedTab] = useState("cartao_credito");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [methodToDelete, setMethodToDelete] = useState(null);
  const [alert, setAlert] = useState(null);

  const [methodForm, setMethodForm] = useState({
    name: "",
    type: "cartao_credito",
    isActive: true,
    allowsInstallments: false,
    maxInstallments: 1,
    interestRate: 0,
    fees: [],
    paymentProvider: "",
    accountDetails: {
      bank: "",
      agency: "",
      account: ""
    },
    color: "#7c3aed",
    icon: "credit_card",
    notes: ""
  });

  const [newFee, setNewFee] = useState({
    installmentRange: {
      min: 1,
      max: 1
    },
    feePercentage: 0,
    daysToReceive: 1
  });

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const data = await PaymentMethod.list();
      setPaymentMethods(data);
    } catch (error) {
      console.error("Erro ao carregar formas de pagamento:", error);
      setAlert({
        type: "error",
        message: "Erro ao carregar formas de pagamento"
      });
    }
  };

  const handleAddMethod = async () => {
    try {
      if (isEditing && currentMethod) {
        await PaymentMethod.update(currentMethod.id, methodForm);
        setAlert({
          type: "success",
          message: "Forma de pagamento atualizada com sucesso!"
        });
      } else {
        await PaymentMethod.create(methodForm);
        setAlert({
          type: "success",
          message: "Forma de pagamento criada com sucesso!"
        });
      }
      
      setShowNewDialog(false);
      resetForm();
      loadPaymentMethods();
    } catch (error) {
      console.error("Erro ao salvar forma de pagamento:", error);
      setAlert({
        type: "error",
        message: "Erro ao salvar forma de pagamento"
      });
    }
  };

  const handleEditMethod = (method) => {
    setIsEditing(true);
    setCurrentMethod(method);
    setMethodForm({
      ...method
    });
    setShowNewDialog(true);
  };

  const confirmDeleteMethod = (method) => {
    setMethodToDelete(method);
    setShowDeleteDialog(true);
  };

  const handleDeleteMethod = async () => {
    if (!methodToDelete) return;
    
    try {
      await PaymentMethod.delete(methodToDelete.id);
      setShowDeleteDialog(false);
      setMethodToDelete(null);
      loadPaymentMethods();
      setAlert({
        type: "success",
        message: "Forma de pagamento excluída com sucesso!"
      });
    } catch (error) {
      console.error("Erro ao excluir forma de pagamento:", error);
      setAlert({
        type: "error",
        message: "Erro ao excluir forma de pagamento"
      });
    }
  };

  const addFee = () => {
    if (!methodForm.fees) {
      methodForm.fees = [];
    }
    
    setMethodForm({
      ...methodForm,
      fees: [...methodForm.fees, newFee]
    });
    
    setNewFee({
      installmentRange: {
        min: 1,
        max: 1
      },
      feePercentage: 0,
      daysToReceive: 1
    });
  };

  const removeFee = (index) => {
    const updatedFees = [...methodForm.fees];
    updatedFees.splice(index, 1);
    
    setMethodForm({
      ...methodForm,
      fees: updatedFees
    });
  };

  const resetForm = () => {
    setMethodForm({
      name: "",
      type: "cartao_credito",
      isActive: true,
      allowsInstallments: false,
      maxInstallments: 1,
      interestRate: 0,
      fees: [],
      paymentProvider: "",
      accountDetails: {
        bank: "",
        agency: "",
        account: ""
      },
      color: "#7c3aed",
      icon: "credit_card",
      notes: ""
    });
    setCurrentMethod(null);
    setIsEditing(false);
  };

  const getMethodIcon = (type) => {
    switch (type) {
      case "dinheiro":
        return <DollarSign className="w-5 h-5 text-green-600" />;
      case "pix":
        return <Smartphone className="w-5 h-5 text-purple-600" />;
      case "cartao_credito":
      case "cartao_debito":
        return <CreditCard className="w-5 h-5 text-blue-600" />;
      default:
        return <CreditCard className="w-5 h-5 text-gray-600" />;
    }
  };

  const getMethodTypeName = (type) => {
    const types = {
      "dinheiro": "Dinheiro",
      "cartao_credito": "Cartão de Crédito",
      "cartao_debito": "Cartão de Débito",
      "pix": "PIX",
      "transferencia": "Transferência",
      "cheque": "Cheque",
      "outro": "Outro"
    };
    
    return types[type] || type;
  };

  const getMethodTypeOptions = () => {
    return [
      { value: "dinheiro", label: "Dinheiro" },
      { value: "cartao_credito", label: "Cartão de Crédito" },
      { value: "cartao_debito", label: "Cartão de Débito" },
      { value: "pix", label: "PIX" },
      { value: "transferencia", label: "Transferência" },
      { value: "cheque", label: "Cheque" },
      { value: "outro", label: "Outro" }
    ];
  };

  const filterMethodsByType = (type) => {
    if (type === "todos") {
      return paymentMethods;
    }
    return paymentMethods.filter(method => method.type === type);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-3xl font-bold text-gray-800">Formas de Pagamento</h2>
        <Button 
          onClick={() => {
            resetForm();
            setShowNewDialog(true);
          }}
          className="bg-[#294380] hover:bg-[#1b2d5d] text-white"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Nova Forma de Pagamento
        </Button>
      </div>

      {alert && (
        <div className={`bg-${alert.type === "success" ? "green" : "red"}-100 border border-${alert.type === "success" ? "green" : "red"}-400 text-${alert.type === "success" ? "green" : "red"}-700 px-4 py-3 rounded relative mb-4`}>
          {alert.message}
          <button
            className="absolute right-0 top-0 p-2"
            onClick={() => setAlert(null)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid grid-cols-4 md:w-auto md:inline-flex">
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="cartao_credito">Cartão de Crédito</TabsTrigger>
          <TabsTrigger value="pix">PIX / Dinheiro</TabsTrigger>
          <TabsTrigger value="outros">Outros</TabsTrigger>
        </TabsList>
        
        <TabsContent value="todos">
          <PaymentMethodList 
            methods={filterMethodsByType("todos")} 
            onEdit={handleEditMethod} 
            onDelete={confirmDeleteMethod} 
          />
        </TabsContent>
        
        <TabsContent value="cartao_credito">
          <PaymentMethodList 
            methods={filterMethodsByType("cartao_credito")} 
            onEdit={handleEditMethod} 
            onDelete={confirmDeleteMethod} 
          />
        </TabsContent>
        
        <TabsContent value="pix">
          <PaymentMethodList 
            methods={[
              ...filterMethodsByType("pix"),
              ...filterMethodsByType("dinheiro")
            ]} 
            onEdit={handleEditMethod} 
            onDelete={confirmDeleteMethod} 
          />
        </TabsContent>
        
        <TabsContent value="outros">
          <PaymentMethodList 
            methods={[
              ...filterMethodsByType("transferencia"),
              ...filterMethodsByType("cheque"),
              ...filterMethodsByType("outro"),
              ...filterMethodsByType("cartao_debito")
            ]} 
            onEdit={handleEditMethod} 
            onDelete={confirmDeleteMethod} 
          />
        </TabsContent>
      </Tabs>

      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Forma de Pagamento" : "Nova Forma de Pagamento"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome*</Label>
                <Input
                  id="name"
                  value={methodForm.name}
                  onChange={(e) => setMethodForm({ ...methodForm, name: e.target.value })}
                  placeholder="Ex: Mastercard"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type">Tipo*</Label>
                <Select
                  value={methodForm.type}
                  onValueChange={(value) => setMethodForm({ 
                    ...methodForm, 
                    type: value,
                    allowsInstallments: value === "cartao_credito" 
                  })}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getMethodTypeOptions().map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="isActive" 
                  checked={methodForm.isActive}
                  onCheckedChange={(checked) => setMethodForm({ ...methodForm, isActive: checked })}
                />
                <Label htmlFor="isActive">Forma de pagamento ativa</Label>
              </div>
              
              {methodForm.type === "cartao_credito" && (
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="allowsInstallments" 
                    checked={methodForm.allowsInstallments}
                    onCheckedChange={(checked) => setMethodForm({ ...methodForm, allowsInstallments: checked })}
                  />
                  <Label htmlFor="allowsInstallments">Permite parcelamento</Label>
                </div>
              )}
            </div>
            
            {methodForm.allowsInstallments && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxInstallments">Máximo de parcelas</Label>
                  <Input
                    id="maxInstallments"
                    type="number"
                    min="1"
                    value={methodForm.maxInstallments}
                    onChange={(e) => setMethodForm({ ...methodForm, maxInstallments: parseInt(e.target.value) })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="interestRate">Taxa de juros (%)</Label>
                  <Input
                    id="interestRate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={methodForm.interestRate}
                    onChange={(e) => setMethodForm({ ...methodForm, interestRate: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="paymentProvider">Operadora/Adquirente</Label>
              <Input
                id="paymentProvider"
                value={methodForm.paymentProvider}
                onChange={(e) => setMethodForm({ ...methodForm, paymentProvider: e.target.value })}
                placeholder="Ex: Cielo, PagSeguro, etc."
              />
            </div>
            
            {methodForm.type === "cartao_credito" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Taxas por faixa de parcelamento</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={addFee}
                    className="h-8"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Adicionar Taxa
                  </Button>
                </div>
                
                {methodForm.fees && methodForm.fees.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Parcelas</TableHead>
                        <TableHead>Taxa (%)</TableHead>
                        <TableHead>Recebimento</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {methodForm.fees.map((fee, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {fee.installmentRange.min === fee.installmentRange.max
                              ? `${fee.installmentRange.min}x`
                              : `${fee.installmentRange.min}x a ${fee.installmentRange.max}x`}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {fee.feePercentage.toFixed(2)}%
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {fee.daysToReceive} {fee.daysToReceive === 1 ? 'dia' : 'dias'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8 text-red-500"
                              onClick={() => removeFee(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-4 text-sm text-gray-500 border rounded-md">
                    Nenhuma taxa cadastrada
                  </div>
                )}
                
                <div className="grid grid-cols-4 gap-3 p-3 border rounded-md bg-gray-50">
                  <div className="space-y-1">
                    <Label htmlFor="feeMin" className="text-xs">De (parcelas)</Label>
                    <Input
                      id="feeMin"
                      type="number"
                      min="1"
                      value={newFee.installmentRange.min}
                      onChange={(e) => setNewFee({
                        ...newFee,
                        installmentRange: {
                          ...newFee.installmentRange,
                          min: parseInt(e.target.value)
                        }
                      })}
                      className="h-8"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="feeMax" className="text-xs">Até (parcelas)</Label>
                    <Input
                      id="feeMax"
                      type="number"
                      min={newFee.installmentRange.min}
                      value={newFee.installmentRange.max}
                      onChange={(e) => setNewFee({
                        ...newFee,
                        installmentRange: {
                          ...newFee.installmentRange,
                          max: parseInt(e.target.value)
                        }
                      })}
                      className="h-8"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="feePercentage" className="text-xs">Taxa (%)</Label>
                    <div className="relative">
                      <Input
                        id="feePercentage"
                        type="number"
                        min="0"
                        step="0.01"
                        value={newFee.feePercentage}
                        onChange={(e) => setNewFee({
                          ...newFee,
                          feePercentage: parseFloat(e.target.value)
                        })}
                        className="h-8 pr-6"
                      />
                      <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="daysToReceive" className="text-xs">Recebimento (dias)</Label>
                    <div className="relative">
                      <Input
                        id="daysToReceive"
                        type="number"
                        min="0"
                        value={newFee.daysToReceive}
                        onChange={(e) => setNewFee({
                          ...newFee,
                          daysToReceive: parseInt(e.target.value)
                        })}
                        className="h-8 pr-6"
                      />
                      <Calendar className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Input
                id="notes"
                value={methodForm.notes}
                onChange={(e) => setMethodForm({ ...methodForm, notes: e.target.value })}
                placeholder="Observações adicionais"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowNewDialog(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleAddMethod}
              className="bg-[#294380] hover:bg-[#1b2d5d]"
              disabled={!methodForm.name || !methodForm.type}
            >
              {isEditing ? "Atualizar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Excluir Forma de Pagamento</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-3 text-amber-600 mb-4">
              <AlertTriangle className="h-8 w-8" />
              <p className="font-medium">
                Você tem certeza que deseja excluir esta forma de pagamento?
              </p>
            </div>
            <p className="text-gray-500 text-sm">
              Esta ação não poderá ser desfeita. Certifique-se de que não há vendas ou transações associadas a esta forma de pagamento.
            </p>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteDialog(false);
                setMethodToDelete(null);
              }}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteMethod}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PaymentMethodList({ methods, onEdit, onDelete }) {
  if (methods.length === 0) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="text-center">
            <p className="text-gray-500">Nenhuma forma de pagamento cadastrada.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Operadora</TableHead>
              <TableHead>Taxas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {methods.map((method) => (
              <TableRow key={method.id}>
                <TableCell className="font-medium flex items-center gap-2">
                  {method.type === "dinheiro" ? (
                    <DollarSign className="w-5 h-5 text-green-600" />
                  ) : method.type === "pix" ? (
                    <Smartphone className="w-5 h-5 text-purple-600" />
                  ) : (
                    <CreditCard className="w-5 h-5 text-blue-600" />
                  )}
                  {method.name}
                </TableCell>
                <TableCell>{getMethodTypeName(method.type)}</TableCell>
                <TableCell>{method.paymentProvider || "-"}</TableCell>
                <TableCell>
                  {method.fees && method.fees.length > 0 ? (
                    <div className="flex flex-col">
                      {method.fees.length > 1 ? (
                        <span className="text-xs text-gray-600">
                          {method.fees.length} taxas configuradas
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600">
                          {method.fees[0].feePercentage}% em {method.fees[0].daysToReceive} dias
                        </span>
                      )}
                    </div>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`${
                      method.isActive
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    {method.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(method)}
                      className="h-8 w-8"
                    >
                      <Edit className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(method)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function getMethodTypeName(type) {
  const types = {
    "dinheiro": "Dinheiro",
    "cartao_credito": "Cartão de Crédito",
    "cartao_debito": "Cartão de Débito",
    "pix": "PIX",
    "transferencia": "Transferência",
    "cheque": "Cheque",
    "outro": "Outro"
  };
  
  return types[type] || type;
}
