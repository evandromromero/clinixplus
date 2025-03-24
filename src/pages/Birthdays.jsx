import React, { useState, useEffect } from 'react';
import { format, isToday, isThisMonth, addMonths, isSameMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Gift, Mail, Send, Phone } from "lucide-react";
import { Client } from "@/firebase/entities";
import { SendEmail } from "@/api/integrations";
import { CompanySettings } from "@/firebase/entities"; // Importando a entidade CompanySettings

export default function Birthdays() {
  const [birthdays, setBirthdays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('thisMonth'); // 'today', 'thisMonth', 'nextMonth', 'all'
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'MM'));
  const [company, setCompany] = useState({ name: '' }); // Estado para armazenar as configurações da empresa

  useEffect(() => {
    loadBirthdays();
    loadCompanySettings(); // Carregando as configurações da empresa
  }, []);

  const loadBirthdays = async () => {
    try {
      setLoading(true);
      const clients = await Client.list();
      const birthdayClients = clients
        .filter(client => client.birthdate) // Filtra apenas clientes com data de nascimento
        .map(client => ({
          ...client,
          birthdateObj: parseISO(client.birthdate)
        }))
        .sort((a, b) => {
          const monthA = format(a.birthdateObj, 'MM');
          const monthB = format(b.birthdateObj, 'MM');
          const dayA = format(a.birthdateObj, 'dd');
          const dayB = format(b.birthdateObj, 'dd');
          
          if (monthA === monthB) {
            return dayA.localeCompare(dayB);
          }
          return monthA.localeCompare(monthB);
        });

      setBirthdays(birthdayClients);
    } catch (error) {
      console.error('Erro ao carregar aniversariantes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanySettings = async () => {
    try {
      const settings = await CompanySettings.list();
      if (settings && settings.length > 0) {
        setCompany(settings[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações da empresa:', error);
    }
  };

  const filterBirthdays = (birthdayList) => {
    if (!birthdayList.length) return [];

    switch (filter) {
      case 'today':
        return birthdayList.filter(client => 
          isToday(new Date(new Date().getFullYear(), 
            client.birthdateObj.getMonth(), 
            client.birthdateObj.getDate()))
        );
      case 'thisMonth':
        return birthdayList.filter(client => 
          isThisMonth(new Date(new Date().getFullYear(), 
            client.birthdateObj.getMonth(), 
            client.birthdateObj.getDate()))
        );
      case 'nextMonth':
        const nextMonth = addMonths(new Date(), 1);
        return birthdayList.filter(client => 
          isSameMonth(new Date(nextMonth.getFullYear(), 
            client.birthdateObj.getMonth(), 
            client.birthdateObj.getDate()), nextMonth)
        );
      case 'custom':
        return birthdayList.filter(client => 
          format(client.birthdateObj, 'MM') === selectedMonth
        );
      default:
        return birthdayList;
    }
  };

  const getAge = (birthdate) => {
    if (!birthdate) return null;
    
    try {
      const birthdateObj = parseISO(birthdate);
      const today = new Date();
      
      let age = today.getFullYear() - birthdateObj.getFullYear();
      
      const todayMonth = today.getMonth();
      const birthMonth = birthdateObj.getMonth();
      const todayDay = today.getDate();
      const birthDay = birthdateObj.getDate();
      
      if (todayMonth < birthMonth || (todayMonth === birthMonth && todayDay < birthDay)) {
        age--;
      }
      
      return age;
    } catch (error) {
      console.error('Erro ao calcular idade:', error);
      console.log('Data de nascimento:', birthdate);
      return null;
    }
  };

  const sendWhatsAppMessage = (client) => {
    try {
      const phoneNumber = client.phone.replace(/\D/g, '');
      const message = encodeURIComponent(`Olá ${client.name}! Em nome de toda a equipe ${company.name}, desejamos um Feliz Aniversário! 🎉 Que seu dia seja repleto de alegria e momentos especiais. Como presente, preparamos uma surpresa especial para sua próxima visita. Entre em contato para saber mais!`);
      const whatsappLink = `https://wa.me/${phoneNumber}?text=${message}`;
      window.open(whatsappLink, '_blank');
    } catch (error) {
      console.error('Erro ao enviar mensagem WhatsApp:', error);
      alert("Erro ao abrir WhatsApp. Verifique se o número de telefone está correto.");
    }
  };

  const sendBirthdayEmail = async (client) => {
    try {
      await SendEmail({
        to: client.email,
        subject: "🎉 Feliz Aniversário!",
        body: `
          Olá ${client.name}!

          Em nome de toda a equipe ${company.name}, queremos desejar um Feliz Aniversário!
          Que seu dia seja repleto de alegria e momentos especiais.

          Como presente especial, preparamos uma surpresa para sua próxima visita.
          Entre em contato conosco para saber mais!

          Abraços,
          Equipe ${company.name}
        `
      });

      alert("Email de aniversário enviado com sucesso!");
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      alert("Erro ao enviar email de aniversário. Tente novamente.");
    }
  };

  const filteredBirthdays = filterBirthdays(birthdays);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-3xl font-bold text-gray-800">Aniversariantes</h2>
        
        <div className="flex items-center gap-3">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filtrar por..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="thisMonth">Este Mês</SelectItem>
              <SelectItem value="nextMonth">Próximo Mês</SelectItem>
              <SelectItem value="custom">Mês Específico</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>

          {filter === 'custom' && (
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => {
                  const month = (i + 1).toString().padStart(2, '0');
                  return (
                    <SelectItem key={month} value={month}>
                      {format(new Date(2024, i, 1), 'MMMM', { locale: ptBR })}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      ) : filteredBirthdays.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <Gift className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg text-gray-500">Nenhum aniversariante encontrado para o período selecionado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBirthdays.map((client) => (
            <Card key={client.id} className="overflow-hidden">
              <CardHeader className="bg-purple-50 pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-purple-900">
                    {format(client.birthdateObj, "dd 'de' MMMM", { locale: ptBR })}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900">{client.name}</h3>
                    {client.email && (
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <Mail className="w-4 h-4" />
                        {client.email}
                      </p>
                    )}
                    {client.phone && (
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {client.phone}
                      </p>
                    )}
                  </div>
                  
                  {client.email && (
                    <Button
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => sendBirthdayEmail(client)}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Enviar E-mail
                    </Button>
                  )}
                  
                  {client.phone && (
                    <Button
                      variant="outline"
                      className="w-full mt-2 border-green-600 text-green-600 hover:bg-green-50"
                      onClick={() => sendWhatsAppMessage(client)}
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="w-4 h-4 mr-2" 
                        viewBox="0 0 24 24" 
                        fill="currentColor"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      Enviar WhatsApp
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
