import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import { AccessToken } from 'livekit-server-sdk';
import { Server as SocketServer } from 'socket.io';
import * as store from './store';

const PORT = Number(process.env.PORT ?? 3001);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
const LIVEKIT_URL = process.env.LIVEKIT_URL ?? 'ws://localhost:7880';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY ?? 'devkey';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET ?? 'secret';

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

const httpServer = http.createServer(app);
const io = new SocketServer(httpServer, { cors: { origin: CLIENT_ORIGIN } });

// Servidor de exemplo para já ter algo na tela
store.createGuild('Resenha');

// ---------- REST ----------

app.get('/api/servers', (_req, res) => {
  res.json(store.listGuilds());
});

app.post('/api/servers', (req, res) => {
  res.status(201).json(store.createGuild(req.body?.name));
});

app.post('/api/servers/:id/channels', (req, res) => {
  const channel = store.createChannel(req.params.id, req.body?.name, req.body?.type);
  if (!channel) return res.status(400).json({ error: 'Servidor ou tipo de canal inválido' });
  res.status(201).json(channel);
});

app.get('/api/channels/:id/messages', (req, res) => {
  res.json(store.getMessages(req.params.id));
});

// Gera o token que o navegador usa para entrar na sala de voz/vídeo do LiveKit.
// Cada canal de voz = uma "room" do LiveKit com o mesmo id.
app.post('/api/livekit/token', async (req, res) => {
  const { channelId, username } = req.body ?? {};
  const channel = typeof channelId === 'string' ? store.getChannel(channelId) : null;
  const name = typeof username === 'string' ? username.trim().slice(0, 40) : '';

  if (!channel || channel.type !== 'voice' || !name) {
    return res.status(400).json({
      error: 'Canal de voz não encontrado. Se o servidor reiniciou, os canais antigos sumiram: recarregue a página.',
    });
  }

  // Acessando por um endereço de internet mas com o LiveKit apontando pra localhost:
  // o navegador do usuário nunca vai conseguir conectar. Avisamos o motivo claramente.
  const livekitIsLocal = /^wss?:\/\/(localhost|127\.0\.0\.1)/.test(LIVEKIT_URL);
  if (livekitIsLocal && !['localhost', '127.0.0.1'].includes(req.hostname)) {
    return res.status(500).json({
      error:
        'O servidor está com LIVEKIT_URL apontando para localhost. Configure LIVEKIT_URL (wss://...livekit.cloud), ' +
        'LIVEKIT_API_KEY e LIVEKIT_API_SECRET nas variáveis de ambiente do Render.',
    });
  }

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: `${name}-${randomUUID().slice(0, 6)}`,
    name,
    ttl: '2h',
  });
  at.addGrant({
    roomJoin: true,
    room: channel.id,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  res.json({ token: await at.toJwt(), url: LIVEKIT_URL });
});

// ---------- Frontend em produção ----------
// Depois do `npm run build`, o próprio backend serve o site compilado (client/dist).
// Assim o app inteiro roda num endereço só (ex.: no Render).
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api|socket\.io).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ---------- Chat em tempo real ----------

io.on('connection', (socket) => {
  socket.on('channel:join', (channelId: string) => {
    if (store.getChannel(channelId)) socket.join(channelId);
  });

  socket.on('channel:leave', (channelId: string) => {
    socket.leave(channelId);
  });

  socket.on('message:send', (payload: { channelId: string; author: string; content: string }) => {
    const message = store.addMessage(payload?.channelId, payload?.author, payload?.content);
    if (message) io.to(message.channelId).emit('message:new', message);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Resenha server rodando em http://localhost:${PORT}`);
});