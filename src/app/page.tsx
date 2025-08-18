'use client';

import { useState, useEffect } from 'react';
import { Search, Store as StoreIcon, Activity, CreditCard, AlertCircle, CheckCircle, XCircle, Bot, Settings, Trash2 } from 'lucide-react';
import { Store } from '@/types';

interface PaymentSearchResult {
  success: boolean;
  data?: {
    status: string;
    message: string;
    order?: {
      id: string;
      status: string;
      created_at: string;
      items: Array<{
        name: string;
        quantity: number;
        price: string;
        code: string | null;
      }>;
    };
    storeName?: string;
  };
  message: string;
}

interface DiscordBotStatus {
  success: boolean;
  status: string;
  tickets: number;
}

interface DiscordCommandsStatus {
  success: boolean;
  configured: boolean;
  scope: string;
  guildId: string | null;
}

export default function Dashboard() {
  const [stores, setStores] = useState<Store[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState<PaymentSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [discordBotStatus, setDiscordBotStatus] = useState<DiscordBotStatus | null>(null);
  const [discordCommandsStatus, setDiscordCommandsStatus] = useState<DiscordCommandsStatus | null>(null);
  const [isManagingCommands, setIsManagingCommands] = useState(false);

  useEffect(() => {
    fetchStores();
    fetchDiscordBotStatus();
    fetchDiscordCommandsStatus();
  }, []);

  const fetchStores = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/stores');
      const data = await response.json();
      if (data.success) {
        setStores(data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar lojas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDiscordBotStatus = async () => {
    try {
      const response = await fetch('/api/discord/bot');
      const data = await response.json();
      setDiscordBotStatus(data);
    } catch (error) {
      console.error('Erro ao carregar status do bot Discord:', error);
    }
  };

  const fetchDiscordCommandsStatus = async () => {
    try {
      const response = await fetch('/api/discord/commands');
      const data = await response.json();
      setDiscordCommandsStatus(data);
    } catch (error) {
      console.error('Erro ao carregar status dos comandos Discord:', error);
    }
  };

  const registerDiscordCommands = async () => {
    try {
      setIsManagingCommands(true);
      const response = await fetch('/api/discord/commands', {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        alert('Comandos Discord registrados com sucesso!');
        fetchDiscordCommandsStatus();
      } else {
        alert('Erro ao registrar comandos: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao registrar comandos:', error);
      alert('Erro ao registrar comandos Discord');
    } finally {
      setIsManagingCommands(false);
    }
  };

  const clearDiscordCommands = async () => {
    try {
      setIsManagingCommands(true);
      const response = await fetch('/api/discord/commands', {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        alert('Comandos Discord limpos com sucesso!');
        fetchDiscordCommandsStatus();
      } else {
        alert('Erro ao limpar comandos: ' + data.error);
      }
    } catch (error) {
      console.error('Erro ao limpar comandos:', error);
      alert('Erro ao limpar comandos Discord');
    } finally {
      setIsManagingCommands(false);
    }
  };

  const searchPayment = async () => {
    if (!searchEmail.trim()) return;
    
    try {
      setIsSearching(true);
      const response = await fetch(`/api/payments/search?email=${encodeURIComponent(searchEmail)}`);
      const data = await response.json();
      setSearchResult(data);
    } catch (error) {
      console.error('Erro ao buscar pagamento:', error);
      setSearchResult({
        success: false,
        message: 'Erro ao buscar pagamento'
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard Multi-Lojas</h1>
          <p className="text-gray-600">Sistema de gerenciamento para múltiplas lojas com bot Discord integrado</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Lojas</p>
                <p className="text-2xl font-bold text-gray-900">{stores.length}</p>
              </div>
              <StoreIcon className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Lojas Ativas</p>
                <p className="text-2xl font-bold text-green-600">{stores.filter(s => s.is_active).length}</p>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Bot Discord</p>
                <p className={`text-2xl font-bold ${
                  discordBotStatus?.status === 'online' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {discordBotStatus?.status === 'online' ? 'Online' : 'Offline'}
                </p>
              </div>
              <Bot className={`h-8 w-8 ${
                discordBotStatus?.status === 'online' ? 'text-green-600' : 'text-red-600'
              }`} />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tickets Ativos</p>
                <p className="text-2xl font-bold text-purple-600">{discordBotStatus?.tickets || 0}</p>
              </div>
              <CreditCard className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Comandos</p>
                <p className={`text-2xl font-bold ${
                  discordCommandsStatus?.configured ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {discordCommandsStatus?.configured ? 'OK' : 'Config'}
                </p>
              </div>
              <Settings className={`h-8 w-8 ${
                discordCommandsStatus?.configured ? 'text-green-600' : 'text-orange-600'
              }`} />
            </div>
          </div>
        </div>

        {/* Discord Bot Management */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Bot className="h-6 w-6" />
            Gerenciamento do Bot Discord
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900">Status do Bot</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-3 h-3 rounded-full ${
                    discordBotStatus?.status === 'online' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-sm text-gray-600">
                    {discordBotStatus?.status === 'online' ? 'Online e funcionando' : 'Offline ou com problemas'}
                  </span>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900">Tickets Ativos</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {discordBotStatus?.tickets || 0} tickets em andamento
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900">Comandos Discord</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-3 h-3 rounded-full ${
                    discordCommandsStatus?.configured ? 'bg-green-500' : 'bg-orange-500'
                  }`}></div>
                  <span className="text-sm text-gray-600">
                    {discordCommandsStatus?.configured ? 'Configurados' : 'Necessária configuração'}
                  </span>
                </div>
                {discordCommandsStatus?.scope && (
                  <p className="text-xs text-gray-500 mt-1">
                    Escopo: {discordCommandsStatus.scope}
                    {discordCommandsStatus.guildId && ` (Guild: ${discordCommandsStatus.guildId})`}
                  </p>
                )}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={registerDiscordCommands}
                  disabled={isManagingCommands}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  {isManagingCommands ? 'Registrando...' : 'Registrar Comandos'}
                </button>
                
                <button
                  onClick={clearDiscordCommands}
                  disabled={isManagingCommands}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  {isManagingCommands ? 'Limpando...' : 'Limpar Comandos'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Search */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Search className="h-6 w-6" />
            Buscar Pagamento
          </h2>
          
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="email"
                placeholder="Digite o e-mail do cliente..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={searchPayment}
              disabled={isSearching || !searchEmail.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              {isSearching ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
          
          {searchResult && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <div className="flex items-start gap-2">
                {searchResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${
                    searchResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {searchResult.message || (searchResult.success ? 'Pagamento encontrado!' : 'Pagamento não encontrado')}
                  </p>
                  {searchResult.success && searchResult.data && searchResult.data.order && (
                    <div className="mt-2 text-sm text-gray-600">
                      <p><span className="font-medium">ID:</span> {searchResult.data.order.id}</p>
                      <p><span className="font-medium">Status:</span> {searchResult.data.order.status}</p>
                      <p><span className="font-medium">Valor:</span> R$ {searchResult.data.order.items[0]?.price || '0.00'}</p>
                      <p><span className="font-medium">Loja:</span> {searchResult.data.storeName || 'N/A'}</p>
                      <p><span className="font-medium">Produto:</span> {searchResult.data.order.items[0]?.name || 'N/A'}</p>
                      <p><span className="font-medium">Data:</span> {new Date(searchResult.data.order.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stores Grid */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <StoreIcon className="h-6 w-6" />
            Lojas Configuradas
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map((store) => (
              <div key={store.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{store.store_name}</h3>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    store.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {store.is_active ? 'Ativa' : 'Inativa'}
                  </div>
                </div>
                
                <div className="space-y-3 text-sm text-gray-600">
                   <div className="flex items-center gap-2">
                     <span className="font-medium text-gray-900">Chave:</span>
                     <code className="bg-gray-100 px-2 py-1 rounded text-xs">{store.store_key}</code>
                   </div>
                   <div>
                     <span className="font-medium text-gray-900">Domínio:</span>
                     <p className="mt-1 break-all">{store.store_domain || 'Não configurado'}</p>
                   </div>
                   <div className="flex items-center gap-2">
                     <span className="font-medium text-gray-900">Bot Token:</span>
                     <div className="flex items-center gap-2">
                       {store.discord_bot_token ? (
                         <>
                           <CheckCircle className="h-4 w-4 text-green-600" />
                           <span className="text-green-600">Configurado</span>
                         </>
                       ) : (
                         <>
                           <AlertCircle className="h-4 w-4 text-orange-600" />
                           <span className="text-orange-600">Não configurado</span>
                         </>
                       )}
                     </div>
                   </div>
                 </div>
              </div>
            ))}
          </div>
          
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Carregando lojas...</p>
            </div>
          ) : stores.length === 0 ? (
            <div className="text-center py-12">
              <StoreIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma loja configurada</p>
              <p className="text-sm text-gray-400 mt-1">Configure as lojas no backend para começar</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}