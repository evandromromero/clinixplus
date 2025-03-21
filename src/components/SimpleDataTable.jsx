import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import RateLimitHandler from './RateLimitHandler';

export default function SimpleDataTable({
  title,
  entityName,
  entity,
  columns = [],
  onDeleteItem,
  onEditItem,
  onViewItem,
  refreshTrigger,
  searchPlaceholder = "Buscar...",
  searchFields = ["name"],
  noDataMessage = "Nenhum registro encontrado",
  pageSize = 10,
  showActions = true
}) {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`Carregando dados de ${entityName}...`);
      const fetchedData = await entity.list();
      console.log(`Dados carregados de ${entityName}:`, fetchedData);
      
      // Garantir que os dados são um array
      const dataArray = Array.isArray(fetchedData) ? fetchedData : [];
      
      // Debug: verificar os dados que estão vindo vazios
      const emptyFields = dataArray.map(item => {
        const emptyKeys = Object.keys(item).filter(key => {
          const value = item[key];
          return value === undefined || value === null || value === '' || 
                 (Array.isArray(value) && value.length === 0) ||
                 (typeof value === 'object' && Object.keys(value).length === 0);
        });
        return { id: item.id, emptyFields: emptyKeys };
      });
      
      console.log(`Campos vazios em ${entityName}:`, emptyFields);
      
      setData(dataArray);
      filterData(dataArray, searchTerm);
    } catch (error) {
      console.error(`Erro ao carregar dados de ${entityName}:`, error);
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterData = (dataToFilter, term) => {
    if (!term || term.trim() === "") {
      setFilteredData(dataToFilter);
      setTotalPages(Math.ceil(dataToFilter.length / pageSize));
      return;
    }

    const filtered = dataToFilter.filter(item => {
      return searchFields.some(field => {
        const value = getNestedValue(item, field);
        return value && value.toString().toLowerCase().includes(term.toLowerCase());
      });
    });

    setFilteredData(filtered);
    setTotalPages(Math.ceil(filtered.length / pageSize));
    setCurrentPage(1);
  };

  // Função para acessar valores aninhados (por exemplo: "client.name")
  const getNestedValue = (obj, path) => {
    const keys = path.split('.');
    return keys.reduce((acc, key) => (acc && acc[key] !== undefined) ? acc[key] : null, obj);
  };

  // Função para renderizar o valor de uma célula com tratamento para diferentes tipos
  const renderCellValue = (item, column) => {
    let value = getNestedValue(item, column.field);
    
    // Debug: mostrar o valor real para diagnóstico
    const originalValue = value;
    const valueType = typeof value;
    
    // Tratamento para diferentes tipos de dados
    if (value === undefined || value === null) {
      return <span className="text-gray-400 italic">-</span>;
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-gray-400 italic">Lista vazia</span>;
      }
      
      // Para arrays de objetos, tentar mostrar um resumo
      if (typeof value[0] === 'object') {
        return (
          <span className="text-xs text-gray-600">
            {value.length} {value.length === 1 ? 'item' : 'itens'}
          </span>
        );
      }
      
      // Para arrays simples, mostrar os primeiros itens
      return value.slice(0, 3).join(", ") + (value.length > 3 ? "..." : "");
    }
    
    if (typeof value === 'object') {
      if (Object.keys(value).length === 0) {
        return <span className="text-gray-400 italic">Objeto vazio</span>;
      }
      
      // Tentar exibir uma propriedade identificadora se existir
      if (value.name) return value.name;
      if (value.id) return `#${value.id}`;
      
      return <span className="text-xs text-gray-600">{JSON.stringify(value).substring(0, 30)}...</span>;
    }
    
    if (column.format) {
      return column.format(value, item);
    }
    
    if (column.field === 'date' || column.field.includes('date')) {
      try {
        const date = new Date(value);
        if (!isNaN(date)) {
          return date.toLocaleDateString('pt-BR');
        }
      } catch (e) {
        // Falha silenciosa, retorna o valor original
      }
    }
    
    return String(value);
  };

  useEffect(() => {
    filterData(data, searchTerm);
  }, [searchTerm, data]);

  if (error) {
    return (
      <RateLimitHandler 
        error={error} 
        onRetry={loadData} 
        className="mb-4"
      />
    );
  }

  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">{title || entityName}</h2>
        <div className="flex gap-2">
          <Input
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
          <Button 
            onClick={loadData} 
            variant="outline"
            disabled={isLoading}
          >
            Atualizar
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : filteredData.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">{noDataMessage}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.field}
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {column.header}
                    </th>
                  ))}
                  {showActions && (
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getCurrentPageData().map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    {columns.map((column) => (
                      <td key={`${item.id}-${column.field}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {renderCellValue(item, column)}
                      </td>
                    ))}
                    {showActions && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          {onViewItem && (
                            <Button
                              onClick={() => onViewItem(item)}
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Ver
                            </Button>
                          )}
                          {onEditItem && (
                            <Button
                              onClick={() => onEditItem(item)}
                              variant="ghost"
                              size="sm"
                              className="text-amber-600 hover:text-amber-900"
                            >
                              Editar
                            </Button>
                          )}
                          {onDeleteItem && (
                            <Button
                              onClick={() => onDeleteItem(item)}
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-900"
                            >
                              Excluir
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-500">
                Mostrando {((currentPage - 1) * pageSize) + 1} a{" "}
                {Math.min(currentPage * pageSize, filteredData.length)} de{" "}
                {filteredData.length} resultados
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                >
                  Anterior
                </Button>
                <Button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                >
                  Próximo
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}