import '@livekit/components-styles';
import { LiveKitRoom, VideoConference, useRoomContext } from '@livekit/components-react';
import { DisconnectReason, ScreenShareCaptureOptions, TrackPublishOptions } from 'livekit-client';
import { useEffect, useState } from 'react';
import { api, Channel } from '../api';

interface Props {
  channel: Channel;
  username: string;
  onLeave: () => void;
}

// ---------- Qualidade do compartilhamento de tela: 1080p a 60 fps ----------
// Captura: resolução e taxa de quadros pedidas ao navegador.
// "motion" prioriza fluidez (bom pra jogos/vídeos); troque por "detail" pra texto/código mais nítido.
const SCREEN_SHARE_CAPTURE: ScreenShareCaptureOptions = {
  resolution: { width: 1920, height: 1080, frameRate: 60 },
  contentHint: 'motion',
};

// Envio: o padrão do LiveKit é 2,5 Mbps a 15 fps. Aqui liberamos até 8 Mbps a 60 fps.
// Se a internet de quem transmite for fraca, reduza maxBitrate (ex.: 5_000_000).
const SCREEN_SHARE_PUBLISH: TrackPublishOptions = {
  screenShareEncoding: { maxBitrate: 8_000_000, maxFramerate: 60 },
  degradationPreference: 'maintain-framerate', // se faltar banda, perde resolução em vez de travar
};

// O botão de tela pronto do LiveKit não aceita essas opções, então aplicamos como padrão
// na chamada que ele faz internamente.
function ScreenShareQuality() {
  const room = useRoomContext();

  useEffect(() => {
    const participant = room.localParticipant;
    const original = participant.setScreenShareEnabled.bind(participant);
    participant.setScreenShareEnabled = (enabled, capture, publish) =>
      original(
        enabled,
        enabled ? { ...SCREEN_SHARE_CAPTURE, ...capture } : capture,
        enabled ? { ...SCREEN_SHARE_PUBLISH, ...publish } : publish,
      );
    return () => {
      participant.setScreenShareEnabled = original;
    };
  }, [room]);

  return null;
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
      <ScreenShareQuality />
      <VideoConference />
    </LiveKitRoom>
  );
}