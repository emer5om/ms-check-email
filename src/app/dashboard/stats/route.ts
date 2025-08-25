import { NextResponse } from 'next/server';

// Configurações das lojas
const STORES = {
  recarregabux: {
    name: 'RecarregaBux',
    apiUrl: process.env.RECARREGABUX_BACKEND_URL || 'https://recarregabux.com',
    token: 'kasumispace-token-2024'
  },
  lojabux: {
    name: 'RecargaBx', 
    apiUrl: process.env.LOJABUX_BACKEND_URL || 'https://rebuxbr.com',
    token: 'kasumispace-token-2024'
  }
};

type StoreKey = keyof typeof STORES;

// Função para fazer requisições autenticadas ao backend
async function fetchFromBackend(storeKey: StoreKey, endpoint: string) {
  const store = STORES[storeKey];
  const url = `${store.apiUrl}/payments${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${store.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Erro ao buscar dados de ${store.name}:`, error);
    return null;
  }
}

// GET /dashboard/stats - Retorna estatísticas consolidadas das lojas
export async function GET() {
  try {
    // Buscar dados de todas as lojas
    const promises = Object.keys(STORES).map(async (key) => {
      const storeKey = key as StoreKey;
      const data = await fetchFromBackend(storeKey, '/dashboard/stats');
      return {
        key: storeKey,
        name: STORES[storeKey].name,
        data
      };
    });
    
    const results = await Promise.all(promises);
    
    // Consolidar estatísticas
    const consolidated = {
      totalRevenue: 0,
      totalSales: 0,
      todayRevenue: 0,
      todaySales: 0,
      weekRevenue: 0,
      weekSales: 0,
      monthRevenue: 0,
      monthSales: 0,
      stores: results.filter(result => result.data !== null)
    };
    
    // Somar estatísticas de todas as lojas
    consolidated.stores.forEach(store => {
      if (store.data && store.data.stats) {
        const stats = store.data.stats;
        consolidated.totalRevenue += stats.total?.revenue || 0;
        consolidated.totalSales += stats.total?.count || 0;
        consolidated.todayRevenue += stats.today?.revenue || 0;
        consolidated.todaySales += stats.today?.count || 0;
        consolidated.weekRevenue += stats.week?.revenue || 0;
        consolidated.weekSales += stats.week?.count || 0;
        consolidated.monthRevenue += stats.month?.revenue || 0;
        consolidated.monthSales += stats.month?.count || 0;
      }
    });
    
    return NextResponse.json({
      success: true,
      consolidated,
      stores: consolidated.stores,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
