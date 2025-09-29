import { NextRequest, NextResponse } from 'next/server';

// Configurações dos backends das lojas
const STORE_BACKENDS = {
  lojabux: {
    url: process.env.LOJABUX_BACKEND_URL || 'https://buxbrasil.com',
    key: 'RecargBx'
  },
  recarregabux: {
    url: process.env.RECARREGABUX_BACKEND_URL || 'https://recargabuxz.com', 
    key: 'recarregabux'
  }
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ store: string }> }
) {
  const resolvedParams = await params;
  const store = resolvedParams.store;
  
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se a loja é válida
    const storeConfig = STORE_BACKENDS[store as keyof typeof STORE_BACKENDS];
    if (!storeConfig) {
      return NextResponse.json(
        { error: 'Loja não encontrada' },
        { status: 404 }
      );
    }

    console.log(`[${store}] Buscando pagamento para email: ${email}`);

    // Fazer requisição para o backend da loja
    const response = await fetch(`${storeConfig.url}/api/check-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Store-Key': storeConfig.key
      },
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      console.error(`[${store}] Erro na requisição:`, response.status);
      return NextResponse.json(
        { error: 'Erro ao consultar backend' },
        { status: response.status }
      );
    }

    const result = await response.json();
    
    // Adicionar informação da loja ao resultado
    return NextResponse.json({
      ...result,
      store: store,
      store_name: store === 'lojabux' ? 'LojaBux' : 'RecarregaBux'
    });

  } catch (error) {
    console.error(`[${store}] Erro ao buscar pagamento:`, error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Endpoint para buscar em todas as lojas
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ store: string }> }
) {
  const resolvedParams = await params;
  const store = resolvedParams.store;
  
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      );
    }

    if (store === 'all') {
      // Buscar em todas as lojas
      const stores = Object.keys(STORE_BACKENDS);
      const results = [];

      for (const storeName of stores) {
        try {
          const storeConfig = STORE_BACKENDS[storeName as keyof typeof STORE_BACKENDS];
          const response = await fetch(`${storeConfig.url}/api/check-order`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Store-Key': storeConfig.key
            },
            body: JSON.stringify({ email })
          });

          if (response.ok) {
            const result = await response.json();
            results.push({
              ...result,
              store: storeName,
              store_name: storeName === 'lojabux' ? 'LojaBux' : 'RecarregaBux'
            });
          }
        } catch (error) {
          console.error(`[${storeName}] Erro ao buscar:`, error);
        }
      }

      // Retornar o primeiro resultado pago encontrado
      const paidResult = results.find(r => r.status === 'paid');
      if (paidResult) {
        return NextResponse.json(paidResult);
      }

      // Se não encontrou nenhum pago, retornar o primeiro resultado
      return NextResponse.json(
        results.length > 0 ? results[0] : { status: 'not_found', message: 'Nenhum pedido encontrado' }
      );
    }

    // Buscar em loja específica
    const storeConfig = STORE_BACKENDS[store as keyof typeof STORE_BACKENDS];
    if (!storeConfig) {
      return NextResponse.json(
        { error: 'Loja não encontrada' },
        { status: 404 }
      );
    }

    const response = await fetch(`${storeConfig.url}/api/check-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Store-Key': storeConfig.key
      },
      body: JSON.stringify({ email })
    });

    const result = await response.json();
    return NextResponse.json({
      ...result,
      store: resolvedParams.store,
      store_name: resolvedParams.store === 'lojabux' ? 'LojaBux' : 'RecarregaBux'
    });

  } catch (error) {
    console.error(`[${resolvedParams.store}] Erro ao buscar pagamento:`, error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
