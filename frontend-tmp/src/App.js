import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT || 'YOUR_API_ENDPOINT';
const AUTH_USERNAME = 'admin';  // 認証用ユーザー名
const AUTH_PASSWORD = 'p@ssw0rd';  // 認証用パスワード

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  // 認証状態をローカルストレージから復元
  useEffect(() => {
    const auth = localStorage.getItem('isAuthenticated');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // メッセージが追加されたら自動スクロール
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 認証処理
  const handleLogin = (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const password = e.target.password.value;

    if (username === AUTH_USERNAME && password === AUTH_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('isAuthenticated', 'true');
      setAuthError(null);
    } else {
      setAuthError('ユーザー名またはパスワードが間違っています');
    }
  };

  // ログアウト処理
  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated');
    setMessages([]);
  };

  // チャットメッセージ送信
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_ENDPOINT}/chat`, {
        message: userMessage,
        conversationHistory: messages
      });

      if (response.data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
      } else {
        setError('応答の取得に失敗しました');
      }
    } catch (err) {
      console.error("API Error:", err);
      setError(`エラーが発生しました: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 会話をクリア
  const clearConversation = () => {
    setMessages([]);
  };

  // 認証画面
  if (!isAuthenticated) {
    return (
      <div className="App login-mode">
        <header className="App-header">
          <h1>Bedrock LLM チャットボット</h1>
        </header>
        
        <main className="login-container">
          <div className="login-box">
            <h2>ログイン</h2>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="username">ユーザー名</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="password">パスワード</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  required
                />
              </div>
              
              {authError && <div className="error-message">{authError}</div>}
              
              <button type="submit" className="login-button">ログイン</button>
            </form>
          </div>
        </main>
        
        <footer>
          <p>Powered by Amazon Bedrock</p>
        </footer>
      </div>
    );
  }

  // チャット画面（認証済み）
  return (
    <div className="App">
      <header className="App-header">
        <h1>Bedrock LLM チャットボット</h1>
        <div className="header-buttons">
          <button className="clear-button" onClick={clearConversation}>
            会話をクリア
          </button>
          <button className="logout-button" onClick={handleLogout}>
            ログアウト
          </button>
        </div>
      </header>
      
      <main className="chat-container">
      <div className="messages-container">
          {messages.length === 0 ? (
            <div className="welcome-message">
              <h2>Bedrock Chatbot へようこそ！</h2>
              <p>何でも質問してください。</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className={`message ${msg.role}`}>
                <div className="message-content">
                  {msg.content.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </div>
            ))
          )}
          
          {loading && (
            <div className="message assistant loading">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        <form onSubmit={handleSubmit} className="input-form">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="メッセージを入力..."
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button type="submit" disabled={loading || !input.trim()}>
            送信
          </button>
        </form>
      </main>
      
      <footer>
        <p>Powered by Amazon Bedrock</p>
      </footer>
    </div>
  );
}

export default App;
