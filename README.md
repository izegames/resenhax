# Resenha

Clone de Discord para estudo: servidores, canais de texto e de voz, webcam e compartilhamento de tela.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Frontend | React + TypeScript + Vite |
| Backend | Node.js + Express + Socket.IO (TypeScript) |
| Voz / vídeo / tela | [LiveKit](https://livekit.io) (WebRTC com SFU) |

## Como rodar

Pré-requisitos: Node.js 20+ e Docker.

```bash
# 1. Servidor LiveKit local
docker compose up -d

# 2. Dependências
npm install

# 3. Variáveis do backend
cp server/.env.example server/.env

# 4. Backend (porta 3001) e frontend (porta 5173) juntos
npm run dev
```

Abra http://localhost:5173 em duas abas (ou dois navegadores) com apelidos diferentes, entre em
`🔊 Sala de voz` e teste microfone, webcam e compartilhamento de tela.

Sem Docker? Baixe o binário do `livekit-server` e rode `livekit-server --dev`.

## Estrutura

```
server/src/index.ts   API REST, chat em tempo real (Socket.IO) e emissão de token do LiveKit
server/src/store.ts   servidores, canais e mensagens (por enquanto em memória)
client/src/App.tsx    layout estilo Discord: servidores, canais e área principal
client/src/components/TextChat.tsx   chat de texto
client/src/components/VoiceRoom.tsx  sala de voz/vídeo/tela com LiveKit
```

## Como funciona a voz

1. O usuário clica num canal de voz.
2. O frontend pede um token a `POST /api/livekit/token`.
3. O backend assina o token com a chave do LiveKit (cada canal de voz é uma *room*).
4. O navegador conecta no LiveKit com esse token e publica microfone, webcam ou tela.

## Colocar online de graça (Render + LiveKit Cloud)

O Render hospeda o site e o chat (ele dá HTTPS, então microfone, webcam e tela funcionam).
O áudio/vídeo/tela roda no LiveKit Cloud, porque o Render não serve o tráfego UDP que o WebRTC precisa.

1. **LiveKit Cloud:** crie uma conta em https://cloud.livekit.io, crie um projeto e anote:
   - a URL do projeto (começa com `wss://` e termina em `.livekit.cloud`)
   - a API Key e o API Secret (em Settings > Keys)
2. **GitHub:** suba esta pasta num repositório (pode ser privado). O `.gitignore` já ignora `node_modules`, `dist` e `.env`.
3. **Render:** em https://render.com, clique em New > Blueprint, escolha o repositório e preencha as 3 variáveis
   `LIVEKIT_URL`, `LIVEKIT_API_KEY` e `LIVEKIT_API_SECRET`.
   (Sem Blueprint: New > Web Service, Build Command `npm install --include=dev && npm run build`,
   Start Command `npm start`, plano Free, e as mesmas 3 variáveis.)
4. Quando o deploy terminar, o Render mostra um link `https://resenha-xxxx.onrender.com`. Mande pro seu amigo.

Detalhes do plano gratuito do Render: o serviço dorme após 15 minutos sem tráfego e leva cerca de 1 minuto pra
acordar, e pode reiniciar a qualquer momento. Como os dados ficam em memória, servidores e mensagens somem nessas horas.

## Limitações atuais

- Dados em memória: ao reiniciar o backend, mensagens e servidores somem.
- Login é só um apelido, sem senha nem autenticação real.
- Sem convites, cargos ou permissões.
- Para uso fora da rede local, o LiveKit precisa de IP público e portas liberadas (ou LiveKit Cloud).

## Próximos passos

1. Banco de dados (PostgreSQL com Prisma ou Drizzle).
2. Autenticação real (e-mail/senha ou OAuth) e sessões.
3. Convites por link, membros por servidor, cargos e permissões.
4. Lista de quem está em cada canal de voz.
5. App desktop com Tauri ou Electron reaproveitando o frontend.
"# resenhax" 
