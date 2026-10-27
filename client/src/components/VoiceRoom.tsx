import '@livekit/components-styles';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import { DisconnectReason } from 'livekit-client';
import { useEffect, useState } from 'react';
import { api, Channel } from '../api';

interface Props {
  channel: Channel;
  username: string;
  onLeave: () => void;
}

// A UI pronta <VideoConference /> já traz: microfone, webcam,
// compartilhamento de tela, chat da sala e grade de participantes.
export default function VoiceRoom({ channel, username, onLeave }: Props) {
  const [conn, setConn] = useState<{ token: string; url: string } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setConn(null);
    setProblem(null);
    api
      .voiceToken(channel.id, username)
      .then((data) => active && setConn(data))
      .catch((err: Error) => active && setProblem(err.message));
    return () => {
      active = false;
    };
  }, [channel.id, username]);

  // Em vez de sair sozinho, mostramos o motivo para facilitar o diagnóstico.
  if (problem) {
    return (
      <div className="center">
        <p>Não foi possível manter a conexão de voz.</p>
        <p style={{ maxWidth: 480, textAlign: 'center' }}>{problem}</p>
        <button onClick={onLeave}>Voltar</button>
      </div>
    );
  }

  if (!conn) return <div className="center">Conectando…</div>;

  return (
    <LiveKitRoom
      className="voice-room"
      data-lk-theme="default"
      serverUrl={conn.url}
      token={conn.token}
      connect
      audio
      video={false}
      onError={(err) => {
        console.error('LiveKit:', err);
        setProblem(`${err.message} (servidor de voz: ${conn.url})`);
      }}
      onDisconnected={(reason) => {
        // Clicou em "Sair": volta normalmente. Qualquer outra coisa é uma falha.
        if (reason === DisconnectReason.CLIENT_INITIATED) {
          onLeave();
        } else {
          setProblem((prev) => prev ?? `Desconectado da sala (motivo: ${reason ?? 'falha ao conectar'}) no servidor ${conn.url}`);
        }
      }}
    >
      <VideoConference />
    </LiveKitRoom>
  );
}