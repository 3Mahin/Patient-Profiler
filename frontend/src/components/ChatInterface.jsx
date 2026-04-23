import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { MessageSquare, Send, Loader2, Trash2, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function ChatInterface({ patientId, apiBase, systemStatus = { status: 'yellow', message: 'Checking...' } }) {
  const [chats, setChats] = useState({}); // store chats per patient
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState('English');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const defaultMessage = { role: 'bot', text: 'Hello Doctor! I am connected to the patient\'s records. How can I help you today?' };
  const currentMessages = chats[patientId] || [defaultMessage];

  const updateCurrentMessages = (newMessages) => {
    setChats(prev => ({
      ...prev,
      [patientId]: newMessages
    }));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages]);

  const handleSend = async (queryToRetry = null) => {
    const userQuery = queryToRetry || input.trim();
    if (!userQuery || isLoading) return;

    if (!queryToRetry) setInput('');
    
    // Remove the previous error message if we are retrying
    let msgsToKeep = currentMessages;
    if (queryToRetry) {
      msgsToKeep = currentMessages.filter(msg => !(msg.isError && msg.retryQuery === queryToRetry));
    }
    
    const newMessages = [...msgsToKeep];
    if (!queryToRetry) {
      newMessages.push({ role: 'user', text: userQuery });
    }
    
    updateCurrentMessages(newMessages);
    setIsLoading(true);

    try {
      const res = await axios.post(`${apiBase}/chat/${patientId}`, { 
        query: userQuery,
        language: language 
      });
      
      // The backend returns a soft error string instead of an HTTP error code if the LLM is down
      if (res.data.response && res.data.response.includes("Sorry, I am unable to connect")) {
        throw new Error("Backend LLM connection failed");
      }
      
      updateCurrentMessages([...newMessages, { role: 'bot', text: res.data.response }]);
    } catch (err) {
      console.error(err);
      updateCurrentMessages([...newMessages, { role: 'bot', text: 'Sorry, I encountered an error communicating with the local LLM.', isError: true, retryQuery: userQuery }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    updateCurrentMessages([defaultMessage]);
  };

  return (
    <div className="glass-panel" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 className="panel-title" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={20} /> Gemma 4 RAG Assistant
          <div 
            style={{
              width: '10px', height: '10px', borderRadius: '50%', 
              backgroundColor: systemStatus.status === 'green' ? '#10b981' : systemStatus.status === 'yellow' ? '#f59e0b' : '#ef4444',
              boxShadow: `0 0 8px ${systemStatus.status === 'green' ? '#10b981' : systemStatus.status === 'yellow' ? '#f59e0b' : '#ef4444'}`
            }}
            title={systemStatus.message}
          />
        </h2>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--panel-bg)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            title="Bot Reply Language"
          >
            <option value="English">English</option>
            <option value="Bengali">Bengali</option>
          </select>
          <button 
            onClick={handleClearChat} 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            title="Clear Chat"
          >
            <Trash2 size={16} /> Clear
          </button>
        </div>
      </div>
      
      <div className="chat-container">
        <div className="chat-messages">
          {currentMessages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role} ${msg.isError ? 'error-state' : ''}`}>
              {msg.role === 'bot' ? (
                <>
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                  {msg.isError && (
                    <button 
                      onClick={() => handleSend(msg.retryQuery)}
                      style={{ marginTop: '12px', padding: '6px 12px', borderRadius: '6px', background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 500 }}
                    >
                      <RefreshCw size={14} /> Retry Request
                    </button>
                  )}
                </>
              ) : (
                msg.text
              )}
            </div>
          ))}
          {isLoading && (
            <div className="message bot">
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-container">
          <input
            type="text"
            id="chat-input"
            name="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(null)}
            placeholder={systemStatus.status === 'red' ? "AI is offline..." : "Ask a question about this patient..."}
            className="chat-input"
            disabled={isLoading || systemStatus.status === 'red'}
          />
          <button className="send-btn" onClick={() => handleSend(null)} disabled={isLoading || systemStatus.status === 'red'}>
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
