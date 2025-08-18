import { NextResponse } from 'next/server';
import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } from 'discord.js';
import axios from 'axios';

type DiscordInteraction = Record<string, unknown>;
// import QRCode from 'qrcode'; // Removido - não utilizado

// Configuração do cliente Discord
let client: Client | null = null;
let isClientReady = false;

// Armazenamento de tickets em memória
const tickets = new Map();
const ticketStorage = {
  updateTicket: (channelId: string, data: Record<string, unknown>) => {
    tickets.set(channelId, { ...tickets.get(channelId), ...data });
  },
  getTicket: (channelId: string) => {
    return tickets.get(channelId);
  },
  deleteTicket: (channelId: string) => {
    tickets.delete(channelId);
  }
};

// Configuração do PayShark (removida - não utilizada)

// Função para inicializar o cliente Discord
async function initializeDiscordClient() {
  if (client && isClientReady) {
    return client;
  }

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers
    ]
  });

  // Adicionar propriedades customizadas
  (client as unknown as Record<string, unknown>).tickets = tickets;
  (client as unknown as Record<string, unknown>).ticketStorage = ticketStorage;

  // Event handlers
  client.once('ready', () => {
    console.log(`Bot Discord conectado como ${client?.user?.tag}`);
    isClientReady = true;
  });

  // Handler para mensagens (captura de email)
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    const ticketInfo = ticketStorage.getTicket(message.channel.id);
    if (!ticketInfo) return;
    
    if (ticketInfo.ticketType === 'compra_realizada' && !ticketInfo.emailProcessed) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const messageContent = message.content.trim();
      
      if (emailRegex.test(messageContent)) {
        await handleEmailSubmission(message as unknown as Record<string, unknown>, messageContent);
      } else {
        const embed = new EmbedBuilder()
          .setTitle('❌ **E-mail Inválido**')
          .setDescription('Por favor, informe um e-mail válido no formato: **exemplo@gmail.com**')
          .setColor('#ff0000')
          .setTimestamp();
        
        await (message as { reply: (options: unknown) => Promise<unknown> }).reply({ embeds: [embed] });
      }
    }
  });

  // Handler para interações (comandos slash e botões)
  client.on('interactionCreate', async (interaction) => {
    try {
      // Handler para comandos slash
      if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        switch (commandName) {
          case 'suporte':
            await handleSuporteCommand(interaction as unknown as DiscordInteraction);
            break;
          case 'setup':
            await handleSetupCommand(interaction as unknown as DiscordInteraction);
            break;
          case 'cleanup':
            await handleCleanupCommand(interaction as unknown as DiscordInteraction);
            break;
          case 'status':
            await handleStatusCommand(interaction as unknown as DiscordInteraction);
            break;
          case 'ping':
            await handlePingCommand(interaction as unknown as DiscordInteraction);
            break;
          case 'dashboard':
            await handleDashboardCommand(interaction as unknown as DiscordInteraction);
            break;
          default:
            await (interaction as { reply: (options: unknown) => Promise<unknown> }).reply({ 
              content: '❌ Comando não reconhecido.', 
              ephemeral: true 
            });
        }
        return;
      }

      // Handler para botões
      if (interaction.isButton()) {
        const { customId } = interaction;

        switch (customId) {
          case 'ticket_compra_realizada':
            await createTicketChannel(interaction as unknown as DiscordInteraction, 'compra_realizada');
            break;
          case 'ticket_sem_compra':
            await createTicketChannel(interaction as unknown as DiscordInteraction, 'sem_compra');
            break;
          case 'pagar_taxa':
            await handlePagarTaxa(interaction as unknown as DiscordInteraction);
            break;
          case 'solicitar_reembolso':
            await handleSolicitarReembolso(interaction as unknown as DiscordInteraction);
            break;
          case 'copiar_pix':
            await handleCopiarPix(interaction as unknown as DiscordInteraction);
            break;
          case 'copiar_pix_codigo':
            await handleCopiarPixCodigo(interaction as unknown as DiscordInteraction);
            break;
          case 'verificar_pagamento':
            await handleVerificarPagamento(interaction as unknown as DiscordInteraction);
            break;
          case 'pagar_taxa_final':
            await handlePagarTaxaFinal(interaction as unknown as DiscordInteraction);
            break;
          case 'solicitar_reembolso_final':
            await handleSolicitarReembolsoFinal(interaction as unknown as DiscordInteraction);
            break;
          case 'verificar_pagamento_final':
            await handleVerificarPagamentoFinal(interaction as unknown as DiscordInteraction);
            break;
          case 'problema_compra':
            await handleProblemaCompra(interaction as unknown as DiscordInteraction);
            break;
          case 'duvida_geral':
            await handleDuvidaGeral(interaction as unknown as DiscordInteraction);
            break;
        }
      }
    } catch (error) {
      console.error('Erro ao processar interação:', error);
      if (!(interaction as { replied: boolean }).replied) {
        await (interaction as { reply: (options: unknown) => Promise<unknown> }).reply({ 
          content: '❌ Ocorreu um erro ao processar sua solicitação.', 
          ephemeral: true 
        });
      }
    }
  });

  // Fazer login do bot
  if (process.env.DISCORD_TOKEN) {
    await client.login(process.env.DISCORD_TOKEN);
  } else {
    console.error('DISCORD_TOKEN não encontrado nas variáveis de ambiente');
  }

  return client;
}

// Função para buscar pagamento via API Next.js
async function findPaymentByEmail(email: string) {
  try {
    const response = await axios.get(`${process.env.NEXTJS_API_URL || 'http://localhost:3000'}/api/stores/all/payments/search?email=${encodeURIComponent(email)}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar pagamento:', error);
    return null;
  }
}

// Handler para submissão de email
async function handleEmailSubmission(message: Record<string, unknown>, email: string) {
  const channelId = (message.channel as { id: string }).id;
  const ticketInfo = ticketStorage.getTicket(channelId);
  if (!ticketInfo) return;

  // Marcar email como processado
  ticketStorage.updateTicket(channelId, { 
    emailProcessed: true, 
    email: email,
    processedAt: new Date()
  });

  // Buscar pagamento via API
  const paymentResult = await findPaymentByEmail(email);
  
  if (paymentResult && paymentResult.status === 'paid' && paymentResult.order) {
    const payment = paymentResult.order;
    
    // Embed com informações do pedido
    const embed = new EmbedBuilder()
      .setTitle('✅ **Pedido Encontrado**')
      .setDescription(`Encontrei seu pedido em nosso sistema!`)
      .addFields(
        { name: '🆔 **ID do Pedido**', value: payment.id.toString(), inline: true },
        { name: '💰 **Valor**', value: `R$ ${payment.amount.toFixed(2)}`, inline: true },
        { name: '📅 **Data**', value: new Date(payment.created_at).toLocaleString('pt-BR'), inline: true },
        { name: '🏪 **Loja**', value: paymentResult.store_name || 'N/A', inline: true },
        { name: '📧 **E-mail**', value: payment.customer_email, inline: true },
        { name: '📱 **Status**', value: payment.status, inline: true }
      )
      .setColor('#00ff00')
      .setTimestamp();

    await (message as { reply: (options: unknown) => Promise<unknown> }).reply({ embeds: [embed] });

    // Simular taxa de liberação (mantendo lógica original)
    setTimeout(async () => {
      const taxaEmbed = new EmbedBuilder()
        .setTitle('💳 **Taxa de Liberação Necessária**')
        .setDescription('Para liberar seus Robux, é necessário pagar uma taxa de liberação de **R$ 5,00**.')
        .addFields(
          { name: '🎁 **Brinde Especial**', value: 'Ao pagar a taxa, você ganhará **+500 Robux extras** como brinde!' },
          { name: '⏰ **Prazo**', value: 'Esta taxa deve ser paga em até 24 horas.' }
        )
        .setColor('#ffaa00')
        .setTimestamp();

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('pagar_taxa')
            .setLabel('💳 PAGAR TAXA')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('solicitar_reembolso')
            .setLabel('💸 SOLICITAR REEMBOLSO')
            .setStyle(ButtonStyle.Danger)
        );

      await (message.channel as { send: (options: unknown) => Promise<unknown> }).send({ embeds: [taxaEmbed], components: [row] });
    }, 3000);
  } else {
    const embed = new EmbedBuilder()
      .setTitle('❌ **Pedido Não Encontrado**')
      .setDescription('Não encontrei nenhum pedido com este e-mail em nosso sistema.')
      .addFields(
        { name: '🔍 **Verifique**', value: 'Certifique-se de que o e-mail está correto e que a compra foi realizada.' },
        { name: '📞 **Suporte**', value: 'Se o problema persistir, entre em contato com nosso suporte.' }
      )
      .setColor('#ff0000')
      .setTimestamp();

    await (message as { reply: (options: unknown) => Promise<unknown> }).reply({ embeds: [embed] });
  }
}

// Função para criar canal de ticket
async function createTicketChannel(interaction: DiscordInteraction, ticketType: string) {
  const { user, guild } = interaction;
  
  if (!guild) {
    await (interaction as { reply: (options: unknown) => Promise<unknown> }).reply({
      content: '❌ Este comando só pode ser usado em um servidor.',
      flags: 64
    });
    return;
  }
  
  const ticketTypeName = ticketType === 'compra_realizada' ? 'compra' : 'duvidas';
  const existingTicket = (guild as { channels: { cache: { find: (fn: (channel: Record<string, unknown>) => boolean) => unknown } } }).channels.cache.find(
    (channel: Record<string, unknown>) => (channel as { name: string }).name === `ticket-${ticketTypeName}-${(user as { username: string; discriminator: string }).username.toLowerCase()}-${(user as { username: string; discriminator: string }).discriminator}`
  );

  if (existingTicket) {
    await (interaction as { reply: (options: unknown) => Promise<unknown> }).reply({
      content: `Você já possui um ticket aberto: ${existingTicket}`,
      flags: 64
    });
    return;
  }

  if (!(guild as { members: { me: { permissions: { has: (permission: unknown) => boolean } } } }).members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await (interaction as { reply: (options: unknown) => Promise<unknown> }).reply({
      content: '❌ Não tenho permissão para criar canais neste servidor.',
      flags: 64
    });
    return;
  }

  try {
    const ticketChannel = await (guild as { channels: { create: (options: unknown) => Promise<unknown> } }).channels.create({
      name: `ticket-${ticketType === 'compra_realizada' ? 'compra' : 'duvidas'}-${(user as { username: string; discriminator: string }).username.toLowerCase()}-${(user as { username: string; discriminator: string }).discriminator}`,
      type: ChannelType.GuildText,
      parent: (guild as { channels: { cache: { find: (fn: (channel: Record<string, unknown>) => boolean) => unknown } } }).channels.cache.find((channel: Record<string, unknown>) => (channel as { name: string }).name === 'Tickets') || null,
      permissionOverwrites: [
        {
          id: (guild as { id: string }).id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: (user as { id: string }).id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        },
        {
          id: client?.user?.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        }
      ]
    });

    const adminRole = (guild as { roles: { cache: { find: (fn: (role: Record<string, unknown>) => boolean) => unknown } } }).roles.cache.find((role: Record<string, unknown>) => (role as { permissions: { has: (permission: unknown) => boolean } }).permissions.has(PermissionFlagsBits.Administrator));
    if (adminRole) {
      await (ticketChannel as { permissionOverwrites: { create: (role: unknown, permissions: unknown) => Promise<unknown> } }).permissionOverwrites.create(adminRole, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
      });
    }

    if (ticketType === 'compra_realizada') {
      await sendCompraRealizadaMessage(ticketChannel as Record<string, unknown>);
    } else if (ticketType === 'sem_compra') {
      await sendSemCompraMessage(ticketChannel as Record<string, unknown>);
    }

    const ticketInfo = {
      userId: (user as { id: string }).id,
      ticketType: ticketType,
      createdAt: new Date()
    };
    ticketStorage.updateTicket((ticketChannel as { id: string }).id, ticketInfo);

    await (interaction as { reply: (options: unknown) => Promise<unknown> }).reply({
      content: `Ticket criado com sucesso! ${ticketChannel}`,
      flags: 64
    });

  } catch (error) {
    console.error('Erro ao criar ticket:', error);
    await (interaction as { reply: (options: unknown) => Promise<unknown> }).reply({
      content: '❌ Erro ao criar o ticket. Por favor, tente novamente ou entre em contato com um administrador.',
      flags: 64
    });
  }
}

// Função para enviar mensagem de compra realizada
async function sendCompraRealizadaMessage(channel: Record<string, unknown>) {
  const hora = new Date().getHours();
  let saudacao = 'Olá!';
  
  if (hora >= 5 && hora < 12) {
    saudacao = 'Olá bom dia!';
  } else if (hora >= 12 && hora < 18) {
    saudacao = 'Olá boa tarde!';
  } else {
    saudacao = 'Olá boa noite!';
  }

  const embed = new EmbedBuilder()
    .setTitle('🎫 **Ticket de Suporte - Compra Realizada**')
    .setDescription(`${saudacao} Sou a **assistente virtual da Recarga Bux** e irei lhe auxiliar com seu **pedido** hoje.`)
    .setColor('#00ff00')
    .setTimestamp()
    .setFooter({ text: 'Recarga Bux Brasil' });

  const embed2 = new EmbedBuilder()
    .setTitle('📧 **Informações Necessárias**')
    .setDescription('Para que eu identifique seu pedido em nosso sistema, **informe por gentileza o e-mail utilizado na compra**')
    .addFields({
      name: '⚠️ **Importante**',
      value: '**Informe apenas o email**, por exemplo: **exemplo@gmail.com** **sem nenhuma outra mensagem junto ao e-mail!!**'
    })
    .setColor('#ffaa00')
    .setTimestamp();

  await (channel as { send: (options: unknown) => Promise<unknown> }).send({ embeds: [embed, embed2] });
}

// Função para enviar mensagem sem compra
async function sendSemCompraMessage(channel: Record<string, unknown>) {
  const hora = new Date().getHours();
  let saudacao = 'Olá!';
  
  if (hora >= 5 && hora < 12) {
    saudacao = 'Olá bom dia!';
  } else if (hora >= 12 && hora < 18) {
    saudacao = 'Olá boa tarde!';
  } else {
    saudacao = 'Olá boa noite!';
  }

  const embed = new EmbedBuilder()
    .setTitle('🎫 **Ticket de Suporte - Sem Compra**')
    .setDescription(`${saudacao} Está com algum problema no momento de realizar a compra ou ficou com alguma dúvida?`)
    .setColor('#00ff00')
    .setTimestamp()
    .setFooter({ text: 'Recarga Bux Brasil' });

  await (channel as { send: (options: unknown) => Promise<unknown> }).send({ embeds: [embed] });

  setTimeout(async () => {
    const embed2 = new EmbedBuilder()
      .setTitle('🤔 **Como posso ajudar?**')
      .setDescription('Selecione uma das opções abaixo:')
      .setColor('#0099ff')
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('problema_compra')
          .setLabel('🛒 Problema na Compra')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('duvida_geral')
          .setLabel('❓ Dúvida Geral')
          .setStyle(ButtonStyle.Secondary)
      );

    await (channel as { send: (options: unknown) => Promise<unknown> }).send({ embeds: [embed2], components: [row] });
  }, 3000);
}

// Handlers para botões (implementações básicas)
async function handlePagarTaxa(interaction: DiscordInteraction) {
  // Implementar lógica de pagamento de taxa
  await (interaction as { reply: (options: unknown) => Promise<unknown> }).reply({ content: 'Processando pagamento da taxa...', ephemeral: true });
}

async function handleSolicitarReembolso(interaction: DiscordInteraction) {
  // Implementar lógica de reembolso
  await (interaction as { reply: (options: unknown) => Promise<unknown> }).reply({ content: 'Solicitação de reembolso processada...', ephemeral: true });
}

async function handleCopiarPix(interaction: DiscordInteraction) {
  // Implementar lógica de cópia do PIX
  await (interaction as { reply: (options: unknown) => Promise<unknown> }).reply({ content: 'Chave PIX copiada!', ephemeral: true });
}

async function handleCopiarPixCodigo(interaction: DiscordInteraction) {
  // Implementar lógica de cópia do código PIX
  await (interaction as { reply: (options: unknown) => Promise<unknown> }).reply({ content: 'Código PIX copiado!', ephemeral: true });
}

async function handleVerificarPagamento(interaction: DiscordInteraction) {
  // Implementar lógica de verificação de pagamento
  await (interaction as { reply: (options: unknown) => Promise<unknown> }).reply({ content: 'Verificando pagamento...', ephemeral: true });
}

async function handlePagarTaxaFinal(interaction: DiscordInteraction) {
  // Implementar lógica final de pagamento
  await (interaction as { reply: (options: unknown) => Promise<unknown> }).reply({ content: 'Processando pagamento final...', ephemeral: true });
}

async function handleSolicitarReembolsoFinal(interaction: DiscordInteraction) {
  // Implementar lógica final de reembolso
  await (interaction as { reply: (options: unknown) => Promise<unknown> }).reply({ content: 'Reembolso final processado...', ephemeral: true });
}

async function handleVerificarPagamentoFinal(interaction: DiscordInteraction) {
  // Implementar lógica final de verificação
  await (interaction as { reply: (options: unknown) => Promise<unknown> }).reply({ content: 'Verificação final concluída...', ephemeral: true });
}

async function handleProblemaCompra(interaction: DiscordInteraction) {
  // Implementar lógica para problema na compra
  await (interaction as { reply: (options: unknown) => Promise<unknown> }).reply({ content: 'Analisando problema na compra...', ephemeral: true });
}

async function handleDuvidaGeral(interaction: DiscordInteraction) {
  // Implementar lógica para dúvida geral
  await (interaction as { reply: (options: unknown) => Promise<unknown> }).reply({ content: 'Processando dúvida geral...', ephemeral: true });
}

// Handlers para comandos slash
async function handleSuporteCommand(interaction: DiscordInteraction) {
  const embed = new EmbedBuilder()
    .setTitle('🎫 **Sistema de Suporte**')
    .setDescription('Clique em uma das opções abaixo para abrir um ticket:')
    .setColor('#0099ff')
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_compra_realizada')
        .setLabel('✅ Compra Realizada')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('ticket_sem_compra')
        .setLabel('❓ Sem Compra')
        .setStyle(ButtonStyle.Primary)
    );

  await (interaction as { reply: (options: unknown) => Promise<unknown> }).reply({ embeds: [embed], components: [row] });
}

async function handleSetupCommand(interaction: DiscordInteraction) {
  if (!(interaction as { member: { permissions: { has: (permission: unknown) => boolean } } }).member.permissions.has(PermissionFlagsBits.Administrator)) {
    await (interaction as { reply: (options: unknown) => Promise<unknown> }).reply({ content: '❌ Você não tem permissão para usar este comando.', ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('🎫 **Sistema de Suporte - Recarga Bux**')
    .setDescription('Bem-vindo ao nosso sistema de suporte! Clique em uma das opções abaixo:')
    .addFields(
      { name: '✅ **Compra Realizada**', value: 'Se você já realizou uma compra e precisa de ajuda' },
      { name: '❓ **Sem Compra**', value: 'Se você tem dúvidas ou problemas antes de comprar' }
    )
    .setColor('#0099ff')
    .setTimestamp()
    .setFooter({ text: 'Recarga Bux Brasil' });

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_compra_realizada')
        .setLabel('✅ Compra Realizada')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('ticket_sem_compra')
        .setLabel('❓ Sem Compra')
        .setStyle(ButtonStyle.Primary)
    );

  await (interaction.channel as { send: (options: unknown) => Promise<unknown> }).send({ embeds: [embed], components: [row] });
  await (interaction as { reply: (options: unknown) => Promise<unknown> }).reply({ content: '✅ Mensagem de suporte enviada!', ephemeral: true });
}

async function handleCleanupCommand(interaction: DiscordInteraction) {
  if (!(interaction as { member: { permissions: { has: (permission: unknown) => boolean } } }).member.permissions.has(PermissionFlagsBits.Administrator)) {
    await (interaction as { reply: (options: unknown) => Promise<unknown> }).reply({ content: '❌ Você não tem permissão para usar este comando.', ephemeral: true });
    return;
  }

  const guild = (interaction as { guild: { channels: { cache: { filter: (fn: (channel: unknown) => boolean) => Map<string, unknown> } } } }).guild;
  const ticketChannels = guild.channels.cache.filter((channel: unknown) => 
    (channel as { name: string; type: unknown }).name.startsWith('ticket-') && (channel as { name: string; type: unknown }).type === ChannelType.GuildText
  );

  let deletedCount = 0;
  for (const [id, channel] of ticketChannels) {
    try {
      await (channel as { delete: () => Promise<unknown> }).delete();
      ticketStorage.deleteTicket(id);
      deletedCount++;
    } catch (error) {
      console.error(`Erro ao deletar canal ${(channel as { name: string }).name}:`, error);
    }
  }

  await (interaction as { reply: (options: unknown) => Promise<unknown> }).reply({ 
    content: `✅ Limpeza concluída! ${deletedCount} canais de ticket foram removidos.`, 
    ephemeral: true 
  });
}

async function handleStatusCommand(interaction: DiscordInteraction) {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);

  const embed = new EmbedBuilder()
    .setTitle('📊 **Status do Bot**')
    .addFields(
      { name: '🟢 **Status**', value: 'Online', inline: true },
      { name: '⏱️ **Uptime**', value: `${hours}h ${minutes}m ${seconds}s`, inline: true },
      { name: '🎫 **Tickets Ativos**', value: tickets.size.toString(), inline: true }
    )
    .setColor('#00ff00')
    .setTimestamp();

  await (interaction as { reply: (options: unknown) => Promise<unknown> }).reply({ embeds: [embed] });
}

async function handlePingCommand(interaction: DiscordInteraction) {
  const ping = client?.ws.ping || 0;
  await (interaction as { reply: (options: unknown) => Promise<unknown> }).reply(`🏓 Pong! Latência: ${ping}ms`);
}

async function handleDashboardCommand(interaction: DiscordInteraction) {
  const dashboardUrl = process.env.NEXTJS_API_URL || 'http://localhost:3000';
  
  const embed = new EmbedBuilder()
    .setTitle('📊 **Dashboard Administrativo**')
    .setDescription(`Acesse o dashboard em: ${dashboardUrl}`)
    .setColor('#0099ff')
    .setTimestamp();

  await (interaction as { reply: (options: unknown) => Promise<unknown> }).reply({ embeds: [embed], ephemeral: true });
}

// Rota principal da API
export async function POST() {
  try {
    // Inicializar cliente Discord se necessário
    if (!client || !isClientReady) {
      await initializeDiscordClient();
    }

    // await _request.json(); // Não necessário para esta implementação
    
    return NextResponse.json({ 
      success: true, 
      message: 'Bot Discord está rodando',
      status: isClientReady ? 'online' : 'connecting'
    });
  } catch (error) {
    console.error('Erro na API do Discord Bot:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Inicializar cliente Discord se necessário
    if (!client || !isClientReady) {
      await initializeDiscordClient();
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Bot Discord está rodando',
      status: isClientReady ? 'online' : 'connecting',
      tickets: tickets.size
    });
  } catch (error) {
    console.error('Erro na API do Discord Bot:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}