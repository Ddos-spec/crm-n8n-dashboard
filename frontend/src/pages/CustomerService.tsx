import { useEffect, useMemo, useState } from 'react';
import { useCustomerContext } from '../context/customer';
import { useChat, useCustomers } from '../hooks/useData';
import { api } from '../lib/api';

type Contact = {
  name: string;
  phone: string;
  status: 'active' | 'pending' | 'escalation';
  lastContact: string;
  id: number;
};

const statusClass = {
  active: 'pill success',
  pending: 'pill warning',
  escalation: 'pill danger',
};

export default function CustomerService() {
  const { data: customers, loading } = useCustomers();
  const contactList = useMemo<Contact[]>(
    () =>
      customers.map((c) => ({
        id: c.id,
        name: c.name ?? 'Tanpa nama',
        phone: c.phone,
        status: c.status === 'active' || c.status === 'pending' || c.status === 'escalation' ? c.status : 'pending',
        lastContact: c.last_message_at ?? 'N/A',
      })),
    [customers],
  );
  const [selected, setSelected] = useState<Contact | null>(null);
  const { focusName, setFocusName } = useCustomerContext();
  const { data: chatMessages, loading: chatLoading } = useChat(selected?.id);
  const [textMessage, setTextMessage] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio' | 'document' | 'sticker'>('image');
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<string | null>(null);

  useEffect(() => {
    if (focusName && contactList.length) {
      const found = contactList.find((c) => c.name === focusName);
      if (found) {
        setSelected(found);
        setFocusName(null);
        return;
      }
    }
    if (!selected && contactList.length) {
      setSelected(contactList[0]);
    }
  }, [focusName, contactList, setFocusName, selected]);

  useEffect(() => {
    if (contactList.length && !selected) {
      setSelected(contactList[0]);
    }
  }, [contactList, selected]);

  const handleSend = async () => {
    if (!selected) return;
    const tasks: Array<() => Promise<Response>> = [];
    if (textMessage.trim()) {
      tasks.push(() =>
        api.sendMessage({
          mtype: 'text',
          receiver: selected.phone,
          text: textMessage.trim(),
        }),
      );
    }
    if (mediaUrl.trim()) {
      tasks.push(() =>
        api.sendMessage({
          mtype: mediaType,
          receiver: selected.phone,
          url: mediaUrl.trim(),
        }),
      );
    }
    if (tasks.length === 0) {
      setSendStatus('Isi teks atau URL media terlebih dahulu');
      return;
    }
    setSending(true);
    setSendStatus(null);
    try {
      for (const send of tasks) {
        const res = await send();
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || 'Gagal mengirim pesan');
        }
      }
      setSendStatus('Terkirim');
      setTextMessage('');
      setMediaUrl('');
    } catch (err) {
      setSendStatus(err instanceof Error ? err.message : 'Gagal mengirim');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="cs-layout">
      <aside className="cs-sidebar">
        <div className="cs-header">
          <div>
            <div className="eyebrow">Kontak</div>
            <div className="cs-title">Customer Service</div>
          </div>
        </div>
        <div className="cs-contacts">
          {loading && <div className="muted">Memuat kontak...</div>}
          {!loading &&
            contactList.map((c) => (
              <button
                key={c.phone}
                className={selected?.phone === c.phone ? 'contact active' : 'contact'}
                type="button"
                onClick={() => setSelected(c)}
              >
                <div className="contact-top">
                  <span className="contact-name">{c.name}</span>
                  <span className={statusClass[c.status]}>{c.status}</span>
                </div>
                <div className="contact-bottom">
                  <span className="mono">{c.phone}</span>
                  <span className="muted">{c.lastContact}</span>
                </div>
              </button>
            ))}
        </div>
      </aside>

      <main className="cs-chat">
        <div className="cs-chat-header">
          <div>
            <div className="cs-title">{selected?.name ?? 'Memuat...'}</div>
            <div className="muted">{selected?.phone ?? ''}</div>
          </div>
          {selected ? <div className={statusClass[selected.status]}>{selected.status}</div> : null}
        </div>

        <div className="chat-window">
          {chatLoading && <div className="muted">Memuat chat...</div>}
          {!chatLoading &&
            chatMessages.map((c) => {
              const align = ['out', 'outbound', 'agent'].includes(c.message_type) ? 'right' : 'left';
              return (
                <div key={c.id} className={align === 'right' ? 'bubble right' : 'bubble left'}>
                <div className="bubble-meta">
                  <span>{selected?.name ?? 'Customer'}</span>
                  <span className="muted">
                    {c.message_type} | {new Date(c.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="bubble-text">{c.content}</div>
              </div>
              );
            })}
        </div>

        <div className="cs-input">
          <textarea
            className="input"
            placeholder="Ketik pesan teks (opsional)"
            value={textMessage}
            onChange={(e) => setTextMessage(e.target.value)}
            rows={2}
          />
          <div className="stack" style={{ marginTop: 8 }}>
            <label className="label" htmlFor="mediaType">
              Jenis media
            </label>
            <select
              id="mediaType"
              className="input"
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value as typeof mediaType)}
            >
              <option value="image">Gambar</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
              <option value="document">Dokumen</option>
              <option value="sticker">Sticker</option>
            </select>
            <input
              className="input"
              placeholder="URL media (opsional)"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
            />
            <button className="button" type="button" disabled={sending} onClick={handleSend}>
              {sending ? 'Mengirim...' : 'Kirim'}
            </button>
            {sendStatus && <div className="muted">{sendStatus}</div>}
          </div>
        </div>
      </main>
    </div>
  );
}
