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

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listServers: () => request<Guild[]>('/api/servers'),

  createServer: (name: string) =>
    request<Guild>('/api/servers', { method: 'POST', body: JSON.stringify({ name }) }),

  createChannel: (serverId: string, name: string, type: ChannelType) =>
    request<Channel>(`/api/servers/${serverId}/channels`, {
      method: 'POST',
      body: JSON.stringify({ name, type }),
    }),

  messages: (channelId: string) => request<Message[]>(`/api/channels/${channelId}/messages`),

  voiceToken: (channelId: string, username: string) =>
    request<{ token: string; url: string }>('/api/livekit/token', {
      method: 'POST',
      body: JSON.stringify({ channelId, username }),
    }),
};
