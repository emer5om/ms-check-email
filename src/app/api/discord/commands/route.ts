import { NextResponse } from 'next/server';
import { registerDiscordCommands, clearDiscordCommands } from '@/lib/discord-commands';

// POST - Registrar comandos slash
export async function POST() {
  try {
    const success = await registerDiscordCommands();
    
    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Comandos Discord registrados com sucesso' 
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Falha ao registrar comandos' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Erro ao registrar comandos:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Limpar comandos slash
export async function DELETE() {
  try {
    const success = await clearDiscordCommands();
    
    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Comandos Discord limpos com sucesso' 
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Falha ao limpar comandos' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Erro ao limpar comandos:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// GET - Verificar status dos comandos
export async function GET() {
  try {
    const token = process.env.DISCORD_TOKEN;
    const clientId = process.env.DISCORD_CLIENT_ID;
    const guildId = process.env.DISCORD_GUILD_ID;
    
    return NextResponse.json({ 
      success: true,
      configured: !!(token && clientId),
      scope: guildId ? 'guild' : 'global',
      guildId: guildId || null
    });
  } catch (error) {
    console.error('Erro ao verificar comandos:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}