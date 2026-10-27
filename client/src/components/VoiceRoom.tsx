import '@livekit/components-styles';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setConn(null);
    setError(null);
    api
      .voiceToken(channel.id, username)
      .then((data) => active && setConn(data))
      .catch((err: Error) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, [channel.id, username]);

  if (error) {
    return (
      <div className="center">
        <p>Não foi possível entrar na sala: {error}</p>
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
      onDisconnected={onLeave}
    >
      <VideoConference />
    </LiveKitRoom>
  );
}
