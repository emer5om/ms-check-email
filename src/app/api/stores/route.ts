import { NextRequest, NextResponse } from 'next/server';

// Configuração estática das lojas (sem necessidade de banco de dados)
const STORES = [
  {
    id: 1,
    store_key: 'RecargaBX',
    store_name: 'RecargaBX',
    store_domain: 'recargabx.com',
    backend_url: process.env.LOJABUX_BACKEND_URL || 'https://rebuxbr.com',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    store_key: 'recarregabux',
    store_name: 'RecarregaBux',
    store_domain: 'recarregabux.com',
    backend_url: process.env.RECARREGABUX_BACKEND_URL || 'https://recarregabux.com',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') !== 'false';

    console.log(`[API] Buscando lojas (apenas ativas: ${activeOnly})`);
    
    const stores = activeOnly 
      ? STORES.filter(store => store.is_active)
      : STORES;
    
    console.log(`[API] ${stores.length} lojas encontradas`);

    const sanitizedStores = stores.map(store => ({
      id: store.id,
      store_key: store.store_key,
      store_name: store.store_name,
      store_domain: store.store_domain,
      backend_url: store.backend_url,
      is_active: store.is_active,
      created_at: store.created_at,
      updated_at: store.updated_at
    }));

    const response = {
      success: true,
      data: sanitizedStores,
      message: `${stores.length} lojas encontradas`
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    console.error('[API] Erro ao buscar lojas:', error);
    
    const response = {
      success: false,
      error: 'Erro interno do servidor',
      message: 'Falha ao buscar lojas'
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}

// Permitir CORS para requisições do bot Discord
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
