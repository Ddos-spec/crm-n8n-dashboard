import { useEffect, useMemo, useState } from 'react';
import { useCustomerContext } from '../context/customer';
import { useChat, useCustomers } from '../hooks/useData';

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
        status: c.status,
        lastContact: c.last_message_at ?? 'N/A',
      })),
    [customers],
  );
  const [selected, setSelected] = useState<Contact | null>(null);
  const { focusName, setFocusName } = useCustomerContext();
  const { data: chatMessages, loading: chatLoading } = useChat(selected?.id);

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
          <input className="input" placeholder="Ketik pesan..." />
          <button className="button" type="button">
            Kirim
          </button>
        </div>
      </main>
    </div>
  );
}
