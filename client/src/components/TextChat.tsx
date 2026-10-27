import { FormEvent, useEffect, useRef, useState } from 'react';
import { api, Channel, Message } from '../api';
import { socket } from '../socket';

interface Props {
  channel: Channel;
  username: string;
}

export default function TextChat({ channel, username }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    setMessages([]);
    api.messages(channel.id).then((list) => active && setMessages(list)).catch(console.error);

    const join = () => socket.emit('channel:join', channel.id);
    join();
    socket.on('connect', join); // reentra na sala se a conexão cair e voltar

    const onMessage = (message: Message) => {
      if (message.channelId === channel.id) setMessages((prev) => [...prev, message]);
    };
    socket.on('message:new', onMessage);

    return () => {
      active = false;
      socket.off('connect', join);
      socket.off('message:new', onMessage);
      socket.emit('channel:leave', channel.id);
    };
  }, [channel.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function send(e: FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    socket.emit('message:send', { channelId: channel.id, author: username, content });
    setDraft('');
  }

  return (
    <div className="chat">
      <div className="messages">
        {messages.length === 0 && <p className="empty">Nenhuma mensagem ainda. Diga oi! 👋</p>}
        {messages.map((m) => (
          <div key={m.id} className="message">
            <div className="message-head">
              <strong>{m.author}</strong>
              <time>{new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time>
            </div>
            <div className="message-body">{m.content}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form className="composer" onSubmit={send}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Conversar em #${channel.name}`}
          maxLength={2000}
        />
      </form>
    </div>
  );
}
