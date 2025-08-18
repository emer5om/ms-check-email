import { REST, Routes, SlashCommandBuilder } from 'discord.js';

// Definição dos comandos slash
const commands = [
  new SlashCommandBuilder()
    .setName('suporte')
    .setDescription('Abre o sistema de suporte com opções de ticket'),
    
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configura o sistema de suporte no canal atual (apenas administradores)'),
    
  new SlashCommandBuilder()
    .setName('cleanup')
    .setDescription('Remove todos os canais de ticket existentes (apenas administradores)'),
    
  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Mostra o status atual do bot'),
    
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Verifica a latência do bot'),
    
  new SlashCommandBuilder()
    .setName('dashboard')
    .setDescription('Fornece o link para o dashboard administrativo')
].map(command => command.toJSON());

// Função para registrar comandos
export async function registerDiscordCommands() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!token || !clientId) {
    console.error('DISCORD_TOKEN e DISCORD_CLIENT_ID são obrigatórios');
    return false;
  }

  const rest = new REST().setToken(token);

  try {
    console.log('Iniciando registro dos comandos slash...');

    if (guildId) {
      // Registrar comandos para um servidor específico (desenvolvimento)
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
      );
      console.log(`Comandos registrados com sucesso para o servidor ${guildId}`);
    } else {
      // Registrar comandos globalmente (produção)
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands }
      );
      console.log('Comandos registrados globalmente com sucesso');
    }

    return true;
  } catch (error) {
    console.error('Erro ao registrar comandos:', error);
    return false;
  }
}

// Função para limpar comandos
export async function clearDiscordCommands() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!token || !clientId) {
    console.error('DISCORD_TOKEN e DISCORD_CLIENT_ID são obrigatórios');
    return false;
  }

  const rest = new REST().setToken(token);

  try {
    console.log('Limpando comandos slash...');

    if (guildId) {
      // Limpar comandos do servidor específico
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: [] }
      );
      console.log(`Comandos limpos do servidor ${guildId}`);
    } else {
      // Limpar comandos globais
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: [] }
      );
      console.log('Comandos globais limpos');
    }

    return true;
  } catch (error) {
    console.error('Erro ao limpar comandos:', error);
    return false;
  }
}

export { commands };