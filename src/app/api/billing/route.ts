import { NextRequest, NextResponse } from 'next/server';
import { ProductSales, RecentSale, ChartDataItem, StoreData } from '@/types';

// Configurações das lojas
const STORES = {
  recarregabux: {
    name: 'RecarregaBux',
    apiUrl: 'https://recarregabux.com', // Backend da loja RecarregaBux
    token: 'kasumispace-token-2024'
  },
  lojabux: {
    name: 'LojaBux', 
    apiUrl: 'https://lojabux.com', // Backend da loja LojaBux
    token: 'kasumispace-token-2024'
  }
};

type StoreKey = keyof typeof STORES;

// Função para fazer requisições autenticadas ao backend
async function fetchFromBackend(storeKey: StoreKey, endpoint: string) {
  const store = STORES[storeKey];
  
  try {
    const response = await fetch(`${store.apiUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${store.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`Erro ao buscar dados de ${store.name}:`, response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    
    // Transformar os dados da API para o formato esperado
    return {
      stats: {
        today: { revenue: data.today?.total || 0, count: data.today?.count || 0 },
        week: { revenue: data.week?.total || 0, count: data.week?.count || 0 },
        month: { revenue: data.month?.total || 0, count: data.month?.count || 0 },
        total: { revenue: data.allTime?.total || 0, count: data.allTime?.count || 0 }
      },
      topProducts: data.topProducts?.map((product: ProductSales) => ({
        name: product.name,
        sales: product.sales_count || product.sales
      })) || [],
      recentSales: data.recentSales?.map((sale: RecentSale) => ({
        id: sale.id,
        value: sale.amount || sale.value,
        email: sale.customer_email || sale.email,
        status: 'completed',
        products: sale.product_names || sale.products
      })) || [],
      chartData: data.chartData || []
    };
  } catch (error) {
    console.error(`Erro ao conectar com ${store.name}:`, error);
    return null;
  }
}

// GET /api/billing - Retorna dados de faturamento consolidados
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const storeKey = searchParams.get('store') as StoreKey;
  const endpoint = searchParams.get('endpoint') || '/api/payments/dashboard/stats';
  
  try {
    // Se uma loja específica foi solicitada
    if (storeKey && STORES[storeKey]) {
      const data = await fetchFromBackend(storeKey, endpoint);
      return NextResponse.json({
        success: true,
        store: STORES[storeKey].name,
        data
      });
    }
    
    // Buscar dados de todas as lojas
    const promises = Object.keys(STORES).map(async (key) => {
      const storeKey = key as StoreKey;
      const data = await fetchFromBackend(storeKey, endpoint);
      return {
        key: storeKey,
        name: STORES[storeKey].name,
        data
      };
    });
    
    const results = await Promise.all(promises);
    
    // Consolidar dados de faturamento
    const consolidated = {
      totalRevenue: 0,
      totalSales: 0,
      stats: {
        today: { revenue: 0, count: 0 },
        week: { revenue: 0, count: 0 },
        month: { revenue: 0, count: 0 },
        total: { revenue: 0, count: 0 }
      },
      topProducts: [] as ProductSales[],
      recentSales: [] as RecentSale[],
      chartData: [] as ChartDataItem[],
      stores: results.filter(result => result.data !== null)
    };
    
    // Consolidar estatísticas e dados de todas as lojas
    const productSalesMap = new Map<string, number>();
    const allRecentSales: RecentSale[] = [];
    const chartDataMap = new Map<string, {sales_count: number, total_amount: number}>();
    
    consolidated.stores.forEach(store => {
      if (store.data && store.data.stats) {
        const stats = store.data.stats;
        // Somar estatísticas por período
        consolidated.stats.today.revenue += stats.today?.revenue || 0;
        consolidated.stats.today.count += stats.today?.count || 0;
        consolidated.stats.week.revenue += stats.week?.revenue || 0;
        consolidated.stats.week.count += stats.week?.count || 0;
        consolidated.stats.month.revenue += stats.month?.revenue || 0;
        consolidated.stats.month.count += stats.month?.count || 0;
        consolidated.stats.total.revenue += stats.total?.revenue || 0;
        consolidated.stats.total.count += stats.total?.count || 0;
        
        // Consolidar produtos mais vendidos
        if (store.data.topProducts) {
          store.data.topProducts.forEach((product: ProductSales) => {
            const currentSales = productSalesMap.get(product.name) || 0;
            productSalesMap.set(product.name, currentSales + product.sales);
          });
        }
        
        // Consolidar vendas recentes
        if (store.data.recentSales) {
          allRecentSales.push(...store.data.recentSales);
        }
        
        // Consolidar dados do gráfico
        if (store.data.chartData) {
          store.data.chartData.forEach((item: ChartDataItem) => {
            const existing = chartDataMap.get(item.date);
            if (existing) {
              existing.sales_count += item.sales_count;
              existing.total_amount += item.total_amount;
            } else {
              chartDataMap.set(item.date, {
                sales_count: item.sales_count,
                total_amount: item.total_amount
              });
            }
          });
        }
      }
    });
    
    // Converter produtos consolidados para array e ordenar por vendas
    consolidated.topProducts = Array.from(productSalesMap.entries())
      .map(([name, sales]) => ({ name, sales }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10); // Top 10 produtos
    
    // Ordenar vendas recentes por ID (mais recentes primeiro) e pegar as 10 mais recentes
    consolidated.recentSales = allRecentSales
      .sort((a, b) => parseInt(b.id) - parseInt(a.id))
      .slice(0, 10);
    
    // Converter dados do gráfico para array e ordenar por data
    consolidated.chartData = Array.from(chartDataMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Manter compatibilidade com campos antigos
    consolidated.totalRevenue = consolidated.stats.total.revenue;
    consolidated.totalSales = consolidated.stats.total.count;
    
    return NextResponse.json({
      success: true,
      consolidated,
      endpoint
    });
    
  } catch (error) {
    console.error('Erro ao buscar dados de faturamento:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST /api/billing - Para comandos específicos do Discord
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command, storeKey, params } = body;
    
    switch (command) {
      case 'dashboard_stats':
        const statsData = storeKey 
          ? await fetchFromBackend(storeKey, '/dashboard/stats')
          : await Promise.all(
              Object.keys(STORES).map(async (key) => {
                const data = await fetchFromBackend(key as StoreKey, '/dashboard/stats');
                return { store: key, data };
              })
            );
        
        return NextResponse.json({
          success: true,
          command,
          data: statsData
        });
        
      case 'sales':
        const salesData = storeKey
          ? await fetchFromBackend(storeKey, '/sales')
          : await Promise.all(
              Object.keys(STORES).map(async (key) => {
                const data = await fetchFromBackend(key as StoreKey, '/sales');
                return { store: key, data };
              })
            );
        
        return NextResponse.json({
          success: true,
          command,
          data: salesData
        });
        
      case 'dashboard_data':
        const period = params?.period || 'today';
        const dashboardData = storeKey
          ? await fetchFromBackend(storeKey, `/dashboard/data?period=${period}`)
          : await Promise.all(
              Object.keys(STORES).map(async (key) => {
                const data = await fetchFromBackend(key as StoreKey, `/dashboard/data?period=${period}`);
                return { store: key, data };
              })
            );
        
        return NextResponse.json({
          success: true,
          command,
          data: dashboardData
        });
        
      default:
        return NextResponse.json(
          { success: false, error: 'Comando não reconhecido' },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('Erro ao processar comando:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}