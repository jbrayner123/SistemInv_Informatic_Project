import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/api';
import ConfirmModal from '../ConfirmModal/ConfirmModal';
import './SmartAssistant.css';

const SmartAssistant = () => {
  const { session } = useAuth();
  const username = session?.username || 'user';
  const chatKey = `sistemBotMessages_${username}`;

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Guardar en localStorage de forma independiente por usuario
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem(chatKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved messages', e);
      }
    }
    return [{ id: 1, sender: 'bot', text: `¡Hola ${username}! Soy SistemBot, tu asistente corporativo de IA. ¿En qué te puedo ayudar hoy?` }];
  });
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const messagesEndRef = useRef(null);

  // Sincronizar al localStorage
  useEffect(() => {
    localStorage.setItem(chatKey, JSON.stringify(messages));
  }, [messages, chatKey]);

  // Si cambia el usuario, recargar su historial
  useEffect(() => {
    const saved = localStorage.getItem(chatKey);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {}
    } else {
        setMessages([{ id: 1, sender: 'bot', text: `¡Hola ${username}! Soy SistemBot, tu asistente de IA. ¿En qué te puedo ayudar hoy?` }]);
    }
  }, [chatKey, username]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { id: Date.now(), sender: 'user', text: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const parsedRes = await api.chatWithBot(userMessage.text);
      let textResponse = parsedRes.text;

      // Interceptar y ejecutar comandos de frontend
      if (textResponse.includes('[CMD:REFRESH]')) {
        textResponse = textResponse.replace(/\[CMD:REFRESH\]/g, '').trim();
        // Llamar a App.jsx para recargar inventario
        window.dispatchEvent(new Event('inventory-changed'));
      }
      
      if (textResponse.includes('[CMD:CLEAR_CART]')) {
        textResponse = textResponse.replace(/\[CMD:CLEAR_CART\]/g, '').trim();
        window.dispatchEvent(new Event('clear-pos-cart'));
      }

      const cartMatch = textResponse.match(/\[CMD:CART:(.*?)\]/);
      if (cartMatch) {
        const itemsRaw = cartMatch[1]; // ej: SKU-xxx=2, SKU-yyy=1
        textResponse = textResponse.replace(cartMatch[0], '').trim();
        // Avisar a app raiz que abra la caja
        window.dispatchEvent(new Event('open-pos-view'));
        // Esperar a que se monte POS.jsx e inyectarle los items
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('botAddToCart', { detail: { itemsStr: itemsRaw } }));
        }, 150);
      }

      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: 'bot', text: textResponse }
      ]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: 'bot', text: 'Ups, ocurrió un error de conexión con mi cerebro artificial. Intenta de nuevo.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="smart-assistant-container">
      {/* Botón flotante */}
      <button 
        className={`sa-toggle-btn ${isOpen ? 'open' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
        title="Asistente de IA"
      >
        {isOpen ? (
          <span className="sa-icon close-icon">×</span>
        ) : (
          <svg className="sa-icon ai-bot-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 8V4H8"></path>
            <rect x="4" y="8" width="16" height="12" rx="2"></rect>
            <path d="M2 14h2"></path>
            <path d="M20 14h2"></path>
            <path d="M15 13v2"></path>
            <path d="M9 13v2"></path>
          </svg>
        )}
      </button>

      {/* Ventana de chat */}
      <div className={`sa-chat-window ${isOpen ? 'active' : ''} ${isExpanded ? 'expanded' : ''}`}>
        <div className="sa-chat-header">
          <div className="sa-header-info">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="bot-header-icon">
                <path d="M12 2a2 2 0 0 1 2 2c0 1.1-.9 2-2 2a2 2 0 0 1-2-2c0-1.1.9-2 2-2Z"></path>
                <path d="M10.29 15.71a2 2 0 0 1 2.83 0"></path>
                <path d="M14 9V8a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h6l4 4V11a2 2 0 0 0-2-2Z"></path>
            </svg>
            <div>
              <h3>SistemBot AI</h3>
              <span className="sa-status-dot"></span><small>En línea</small>
            </div>
          </div>
          
          <div className="sa-header-actions" style={{ display: 'flex', gap: '4px' }}>
            <button className="sa-expand-btn" onClick={() => setShowClearConfirm(true)} title="Limpiar historial">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/></svg>
            </button>
            
            <button className="sa-expand-btn sa-expand-desktop" onClick={() => setIsExpanded(!isExpanded)} title={isExpanded ? "Reducir tamaño" : "Ampliar chat"}>
              {isExpanded ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
              )}
            </button>

            {/* Botón cerrar — visible en móvil */}
            <button className="sa-expand-btn sa-close-btn" onClick={() => { setIsOpen(false); setIsExpanded(false); }} title="Cerrar chat">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <div className="sa-chat-body">
          {messages.map((msg) => (
            <div key={msg.id} className={`sa-message-wrapper ${msg.sender}`}>
              <div 
                className={`sa-message ${msg.sender}`} 
                dangerouslySetInnerHTML={{ 
                  __html: msg.text
                    .replace(/### (.*?)(?=\n|$)/g, '<strong>$1</strong>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/(?<!\*)\*(?!\*)(.*?)\*/g, '<em>$1</em>')
                    .replace(/\n[\*-] (.*)/g, '<br/>• $1')
                    .replace(/\n/g, '<br/>')
                }}
              />
            </div>
          ))}
          {loading && (
            <div className="sa-message-wrapper bot">
              <div className="sa-message bot typing">
                <div className="sa-dot"></div>
                <div className="sa-dot"></div>
                <div className="sa-dot"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="sa-chat-footer" onSubmit={handleSend}>
          <input 
            type="text" 
            placeholder="Pídele algo al bot..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button type="submit" disabled={!input.trim() || loading} aria-label="Enviar Mensaje">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
      </div>

      {showClearConfirm && createPortal(
        <div style={{ position: 'relative', zIndex: 10001 }}>
          <ConfirmModal
            isOpen={showClearConfirm}
            title="Borrar historial del chat"
            message="¿Estás seguro de que deseas borrar todo el historial de conversación? Esta acción no se puede deshacer."
            confirmText="Sí, borrar"
            cancelText="Cancelar"
            onCancel={() => setShowClearConfirm(false)}
            onConfirm={async () => {
              setShowClearConfirm(false);
              const defaultMsg = [{ id: 1, sender: 'bot', text: '¡Historial borrado! ¿En qué más te ayudo?' }];
              setMessages(defaultMsg);
              localStorage.removeItem(chatKey);
              try {
                await api.clearBotChat();
              } catch (e) {
                console.error(e);
              }
            }}
          />
        </div>,
        document.body
      )}
    </div>
  );
};

export default SmartAssistant;
