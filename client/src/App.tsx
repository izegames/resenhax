import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, Channel, ChannelType, Guild } from './api';
import TextChat from './components/TextChat';
import VoiceRoom from './components/VoiceRoom';

const USERNAME_KEY = 'resenha:username';

function readStoredName(): string {
  try {
    return localStorage.getItem(USERNAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export default function App() {
  const [username, setUsername] = useState(readStoredName);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [guildId, setGuildId] = useState<string | null>(null);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await api.listServers();
      setGuilds(list);
      setGuildId((current) => current ?? list[0]?.id ?? null);
      setError(null);
    } catch {
      setError('Não consegui falar com o servidor. O backend está rodando?');
    }
  }, []);

  useEffect(() => {
    if (username) refresh();
  }, [username, refresh]);

  if (!username) {
    return <Login onSubmit={(name) => {
      try { localStorage.setItem(USERNAME_KEY, name); } catch { /* ignora */ }
      setUsername(name);
    }} />;
  }

  const guild = guilds.find((g) => g.id === guildId) ?? null;
  const channel: Channel | null = guild?.channels.find((c) => c.id === channelId) ?? null;

  async function newServer() {
    const name = window.prompt('Nome do novo servidor:');
    if (!name?.trim()) return;
    const created = await api.createServer(name);
    await refresh();
    setGuildId(created.id);
    setChannelId(null);
  }

  async function newChannel(type: ChannelType) {
    if (!guild) return;
    const name = window.prompt(type === 'text' ? 'Nome do canal de texto:' : 'Nome do canal de voz:');
    if (!name?.trim()) return;
    const created = await api.createChannel(guild.id, name, type);
    await refresh();
    setChannelId(created.id);
  }

  const textChannels = guild?.channels.filter((c) => c.type === 'text') ?? [];
  const voiceChannels = guild?.channels.filter((c) => c.type === 'voice') ?? [];

  return (
    <div className="app">
      <nav className="servers">
        {guilds.map((g) => (
          <button
            key={g.id}
            className={`server-icon ${g.id === guildId ? 'active' : ''}`}
            title={g.name}
            onClick={() => {
              setGuildId(g.id);
              setChannelId(null);
            }}
          >
            {g.name.slice(0, 2).toUpperCase()}
          </button>
        ))}
        <button className="server-icon add" title="Criar servidor" onClick={newServer}>+</button>
      </nav>

      <aside className="channels">
        <header>{guild?.name ?? 'Resenha'}</header>

        <section>
          <div className="section-title">
            <span>Canais de texto</span>
            <button title="Novo canal de texto" onClick={() => newChannel('text')}>+</button>
          </div>
          {textChannels.map((c) => (
            <button key={c.id} className={`channel ${c.id === channelId ? 'active' : ''}`} onClick={() => setChannelId(c.id)}>
              # {c.name}
            </button>
          ))}
        </section>

        <section>
          <div className="section-title">
            <span>Canais de voz</span>
            <button title="Novo canal de voz" onClick={() => newChannel('voice')}>+</button>
          </div>
          {voiceChannels.map((c) => (
            <button key={c.id} className={`channel ${c.id === channelId ? 'active' : ''}`} onClick={() => setChannelId(c.id)}>
              🔊 {c.name}
            </button>
          ))}
        </section>

        <footer>👤 {username}</footer>
      </aside>

      <main className="main">
        {error && <div className="center">{error}</div>}
        {!error && !channel && <div className="center">Escolha um canal para começar.</div>}
        {!error && channel?.type === 'text' && <TextChat key={channel.id} channel={channel} username={username} />}
        {!error && channel?.type === 'voice' && (
          <VoiceRoom key={channel.id} channel={channel} username={username} onLeave={() => setChannelId(null)} />
        )}
      </main>
    </div>
  );
}

function Login({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [name, setName] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim()) onSubmit(name.trim().slice(0, 40));
  }

  return (
    <div className="center login">
      <form onSubmit={submit}>
        <h1>Resenha</h1>
        <p>Escolha um apelido para entrar.</p>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu apelido" maxLength={40} />
        <button type="submit">Entrar</button>
      </form>
    </div>
  );
}
