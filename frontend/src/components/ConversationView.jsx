import { useEffect, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { useSocket } from '../context/SocketContext.jsx';

const ConversationView = () => {
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!socket) return;

    const handler = (payload) => {
      setMessages((prev) => [
        { id: crypto.randomUUID(), sender: payload.messageType || 'customer', text: payload.content, timestamp: new Date() },
        ...prev
      ]);
    };

    socket.on('new_message', handler);
    return () => socket.off('new_message', handler);
  }, [socket]);

  const sendMessage = (event) => {
    event.preventDefault();
    if (!draft.trim()) return;
    setMessages((prev) => [
      { id: crypto.randomUUID(), sender: 'operator', text: draft.trim(), timestamp: new Date() },
      ...prev
    ]);
    setDraft('');
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center gap-2 text-white">
        <MessageCircle size={20} />
        <h2 className="text-lg font-semibold">Percakapan Terbaru</h2>
      </div>
      <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-2">
        {messages.map((message) => (
          <div key={message.id} className={`rounded-xl p-3 text-sm shadow-inner ${message.sender === 'operator' ? 'bg-primary-600/20 text-primary-100 ml-auto max-w-[75%]' : 'bg-slate-950/60 text-slate-100 mr-auto max-w-[80%]'}`}>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="capitalize">{message.sender}</span>
              <span>{message.timestamp.toLocaleTimeString('id-ID')}</span>
            </div>
            <p className="mt-2 text-sm text-white">{message.text}</p>
          </div>
        ))}
        {!messages.length && <p className="text-sm text-slate-400">Belum ada percakapan yang masuk.</p>}
      </div>
      <form onSubmit={sendMessage} className="mt-4 flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ketik pesan manual..."
          className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
        />
        <button
          type="submit"
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500"
        >
          <Send size={16} /> Kirim
        </button>
      </form>
    </div>
  );
};

export default ConversationView;
