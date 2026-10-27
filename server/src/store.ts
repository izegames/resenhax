import { randomUUID } from 'node:crypto';

export type ChannelType = 'text' | 'voice';

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
}

export interface Guild {
  id: string;
  name: string;
  channels: Channel[];
}

export interface Message {
  id: string;
  channelId: string;
  author: string;
  content: string;
  createdAt: number;
}

// Armazenamento em memória (dados somem ao reiniciar).
// Próximo passo: trocar por PostgreSQL (Prisma ou Drizzle).
const guilds = new Map<string, Guild>();
const messages = new Map<string, Message[]>();

const MAX_MESSAGES_PER_CHANNEL = 500;

function cleanName(name: unknown, fallback: string): string {
  const value = typeof name === 'string' ? name.trim().slice(0, 40) : '';
  return value || fallback;
}

export function listGuilds(): Guild[] {
  return [...guilds.values()];
}

export function createGuild(name: unknown): Guild {
  const guild: Guild = {
    id: randomUUID(),
    name: cleanName(name, 'Novo servidor'),
    channels: [
      { id: randomUUID(), name: 'geral', type: 'text' },
      { id: randomUUID(), name: 'Sala de voz', type: 'voice' },
    ],
  };
  guilds.set(guild.id, guild);
  return guild;
}

export function createChannel(guildId: string, name: unknown, type: unknown): Channel | null {
  const guild = guilds.get(guildId);
  if (!guild || (type !== 'text' && type !== 'voice')) return null;
  const channel: Channel = {
    id: randomUUID(),
    name: cleanName(name, type === 'text' ? 'novo-canal' : 'Nova sala'),
    type,
  };
  guild.channels.push(channel);
  return channel;
}

export function getChannel(channelId: string): Channel | null {
  for (const guild of guilds.values()) {
    const found = guild.channels.find((c) => c.id === channelId);
    if (found) return found;
  }
  return null;
}

export function getMessages(channelId: string): Message[] {
  return messages.get(channelId) ?? [];
}

export function addMessage(channelId: string, author: unknown, content: unknown): Message | null {
  const channel = getChannel(channelId);
  if (!channel || channel.type !== 'text') return null;

  const text = typeof content === 'string' ? content.trim() : '';
  if (!text || text.length > 2000) return null;

  const message: Message = {
    id: randomUUID(),
    channelId,
    author: cleanName(author, 'anônimo'),
    content: text,
    createdAt: Date.now(),
  };
  const list = messages.get(channelId) ?? [];
  list.push(message);
  if (list.length > MAX_MESSAGES_PER_CHANNEL) list.shift();
  messages.set(channelId, list);
  return message;
}
