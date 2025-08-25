import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types';

// Configurações das lojas
const STORES = {
  recarregabux: {
    name: 'RecarregaBux',
    apiUrl: process.env.RECARREGABUX_API_URL || 'https://recarregabux.com',
    token: 'kasumispace-token-2024'
  },
  lojabux: {
    name: 'RecargaBX', 
    apiUrl: process.env.LOJABUX_API_URL || 'https://rebuxbr.com',
    token: 'kasumispace-token-2024'
  }
};

type StoreKey = keyof typeof STORES;

// Função para buscar pagamento em uma loja específica
async function searchPaymentInStore(storeKey: StoreKey, email: string) {
  const store = STORES[storeKey];
  
  try {
    console.log(`[DEBUG] Fazendo requisição para ${store.name}: ${store.apiUrl}/api/check-order`);
    console.log(`[DEBUG] Token: ${store.token}`);
    console.log(`[DEBUG] Email: ${email}`);
    
    const response = await fetch(`${store.apiUrl}/api/check-order`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${store.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    console.log(`[DEBUG] Response status ${store.name}:`, response.status);
    console.log(`[DEBUG] Response headers ${store.name}:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro ao buscar pagamento em ${store.name}:`, response.status, response.statusText, errorText);
      return null;
    }

    const data = await response.json();
    console.log(`[DEBUG] Response data ${store.name}:`, data);
    
    // Verificar se encontrou pedidos
    if (data.status === 'not_found') {
      return null;
    }
    
    return {
      store: storeKey,
      storeName: store.name,
      data
    };
  } catch (error) {
    console.error(`Erro ao conectar com ${store.name}:`, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      const response: ApiResponse = {
        success: false,
        error: 'Email é obrigatório',
        message: 'Parâmetro email não fornecido'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const response: ApiResponse = {
        success: false,
        error: 'Email inválido',
        message: 'Formato de email inválido'
      };
      return NextResponse.json(response, { status: 400 });
    }

    console.log(`[API] Buscando pagamento para email: ${email}`);
    
    // Buscar em todas as lojas
    const promises = Object.keys(STORES).map(async (key) => {
      const storeKey = key as StoreKey;
      return await searchPaymentInStore(storeKey, email);
    });
    
    const results = await Promise.all(promises);
    
    // Encontrar o primeiro resultado válido
    const foundResult = results.find(result => 
      result && result.data && result.data.status === 'paid'
    );
    
    if (!foundResult) {
      const response: ApiResponse = {
        success: false,
        message: 'Nenhum pagamento encontrado para este email em nenhuma loja'
      };
      return NextResponse.json(response, { status: 404 });
    }

    console.log(`[API] Pagamento encontrado na loja: ${foundResult.storeName}`);

    const response: ApiResponse = {
      success: true,
      data: {
        ...foundResult.data,
        storeName: foundResult.storeName
      },
      message: 'Pagamento encontrado com sucesso'
    };
    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    console.error('[API] Erro ao buscar pagamento:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Erro interno do servidor',
      message: 'Falha ao processar solicitação'
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
