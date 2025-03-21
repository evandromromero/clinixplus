import React, { useState, useEffect } from 'react';
import { Product } from '@/firebase/entities';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Package, Search, Plus, Trash2, Edit, AlertTriangle, RefreshCw } from 'lucide-react';
import RateLimitHandler from '../components/RateLimitHandler';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddEditDialog, setShowAddEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'cosmético',
    price: '',
    cost: '',
    stock: '',
    min_stock: '',
    description: '',
    image_url: ''
  });
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    loadProducts();
  }, [refreshTrigger]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Carregando produtos...");
      const data = await Product.list();
      console.log("Produtos carregados:", data);
      
      if (!data || !Array.isArray(data)) {
        throw new Error("Dados inválidos recebidos do servidor");
      }
      
      // Verificar campos vazios para diagnóstico
      const emptyFields = {};
      data.forEach(product => {
        Object.keys(product).forEach(key => {
          if (product[key] === undefined || product[key] === null || product[key] === '') {
            if (!emptyFields[key]) emptyFields[key] = 0;
            emptyFields[key]++;
          }
        });
      });
      
      console.log("Campos vazios nos produtos:", emptyFields);
      
      setProducts(data);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredProducts = products.filter(product => {
    return product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
           (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSelectChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      // Validar dados numéricos
      const numericFields = ['price', 'cost', 'stock', 'min_stock'];
      const processedData = { ...formData };
      
      numericFields.forEach(field => {
        // Converter para número e garantir que não é NaN
        const value = parseFloat(processedData[field]);
        processedData[field] = isNaN(value) ? 0 : value;
      });
      
      console.log("Enviando dados do produto:", processedData);
      
      if (currentProduct) {
        await Product.update(currentProduct.id, processedData);
      } else {
        await Product.create(processedData);
      }
      
      setShowAddEditDialog(false);
      setCurrentProduct(null);
      setFormData({
        name: '',
        category: 'cosmético',
        price: '',
        cost: '',
        stock: '',
        min_stock: '',
        description: '',
        image_url: ''
      });
      
      setRefreshTrigger(prev => prev + 1);
      alert(currentProduct ? "Produto atualizado com sucesso!" : "Produto adicionado com sucesso!");
      
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      alert(`Erro ao ${currentProduct ? 'atualizar' : 'adicionar'} produto: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product) => {
    setCurrentProduct(product);
    setFormData({
      name: product.name || '',
      category: product.category || 'cosmético',
      price: product.price?.toString() || '',
      cost: product.cost?.toString() || '',
      stock: product.stock?.toString() || '',
      min_stock: product.min_stock?.toString() || '',
      description: product.description || '',
      image_url: product.image_url || ''
    });
    setShowAddEditDialog(true);
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await Product.delete(currentProduct.id);
      setRefreshTrigger(prev => prev + 1);
      setShowDeleteDialog(false);
      setCurrentProduct(null);
      alert("Produto excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir produto:", error);
      alert(`Erro ao excluir produto: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (product) => {
    setCurrentProduct(product);
    setShowDeleteDialog(true);
  };

  if (error) {
    return (
      <RateLimitHandler 
        error={error} 
        onRetry={loadProducts} 
        className="max-w-6xl mx-auto mt-8"
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <Package className="mr-2 h-6 w-6" />
          Produtos
        </h1>
        <div className="flex space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10 w-64"
            />
          </div>
          <Button 
            onClick={() => {
              setCurrentProduct(null);
              setFormData({
                name: '',
                category: 'cosmético',
                price: '',
                cost: '',
                stock: '',
                min_stock: '',
                description: '',
                image_url: ''
              });
              setShowAddEditDialog(true);
            }}
            className="bg-[#294380] hover:bg-[#0D0F36]"
          >
            <Plus className="mr-2 h-4 w-4" /> Novo Produto
          </Button>
          <Button
            variant="outline"
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#294380]"></div>
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preço</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Custo</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estoque</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estoque Mín.</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {product.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.category || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {typeof product.price === 'number' ? `R$ ${product.price.toFixed(2)}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {typeof product.cost === 'number' ? `R$ ${product.cost.toFixed(2)}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      product.stock <= product.min_stock 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {typeof product.stock === 'number' ? product.stock : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {typeof product.min_stock === 'number' ? product.min_stock : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button
                      onClick={() => handleEdit(product)}
                      variant="ghost"
                      size="sm"
                      className="text-amber-600 hover:text-amber-900"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => confirmDelete(product)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-900 ml-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum produto encontrado</h3>
            <p className="text-gray-500 text-center mb-4">
              {searchTerm ? 'Não encontramos produtos correspondentes à sua busca.' : 'Você ainda não cadastrou nenhum produto.'}
            </p>
            <Button
              onClick={() => {
                setCurrentProduct(null);
                setFormData({
                  name: '',
                  category: 'cosmético',
                  price: '',
                  cost: '',
                  stock: '',
                  min_stock: '',
                  description: '',
                  image_url: ''
                });
                setShowAddEditDialog(true);
              }}
              className="bg-[#294380] hover:bg-[#0D0F36]"
            >
              <Plus className="mr-2 h-4 w-4" /> Adicionar Produto
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Diálogo de Adicionar/Editar Produto */}
      <Dialog open={showAddEditDialog} onOpenChange={setShowAddEditDialog}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{currentProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
            <DialogDescription>
              Preencha as informações do produto abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="name">Nome do Produto *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Ex: Creme Hidratante Facial"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Categoria *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleSelectChange('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cosmético">Cosmético</SelectItem>
                    <SelectItem value="equipamento">Equipamento</SelectItem>
                    <SelectItem value="suplemento">Suplemento</SelectItem>
                    <SelectItem value="acessório">Acessório</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="price">Preço de Venda (R$) *</Label>
                <Input
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="cost">Custo (R$) *</Label>
                <Input
                  id="cost"
                  name="cost"
                  value={formData.cost}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <Label htmlFor="stock">Estoque *</Label>
                <Input
                  id="stock"
                  name="stock"
                  value={formData.stock}
                  onChange={handleInputChange}
                  placeholder="0"
                  type="number"
                  min="0"
                  required
                />
              </div>
              <div>
                <Label htmlFor="min_stock">Estoque Mínimo *</Label>
                <Input
                  id="min_stock"
                  name="min_stock"
                  value={formData.min_stock}
                  onChange={handleInputChange}
                  placeholder="0"
                  type="number"
                  min="0"
                  required
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Descreva detalhes do produto..."
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="image_url">URL da Imagem</Label>
              <Input
                id="image_url"
                name="image_url"
                value={formData.image_url}
                onChange={handleInputChange}
                placeholder="https://exemplo.com/imagem.jpg"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddEditDialog(false)}>Cancelar</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !formData.name || !formData.price || !formData.cost || !formData.stock || !formData.min_stock}
              className="bg-[#294380] hover:bg-[#0D0F36]"
            >
              {loading ? (
                <span className="flex items-center">
                  <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                  Processando...
                </span>
              ) : (
                currentProduct ? 'Atualizar Produto' : 'Adicionar Produto'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmação de Exclusão */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o produto "{currentProduct?.name}"? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancelar</Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                  Excluindo...
                </span>
              ) : (
                'Excluir Produto'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}