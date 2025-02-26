import React, { useState, useRef, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import './ChatBot.css';

// アイコンコンポーネント（必要に応じて内容を調整）
const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4Z"/>
    <path d="M22 2 11 13"/>
  </svg>
);
const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);
const BotIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 8V4H8"/>
    <rect width="16" height="12" x="4" y="8" rx="2"/>
    <path d="M2 14h2"/>
    <path d="M20 14h2"/>
    <path d="M15 13v2"/>
    <path d="M9 13v2"/>
  </svg>
);
const MicIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" x2="12" y1="19" y2="22"/>
  </svg>
);
const PaperclipIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
  </svg>
);

const App = () => {
  // Auth0 のフックはコンポーネント最上部で呼び出す
  const { isAuthenticated, loginWithRedirect, logout, user, isLoading } = useAuth0();

  // チャット関連の状態
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! How can I help you today?", sender: "bot", timestamp: new Date() }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [connectionError, setConnectionError] = useState(false);
  const messagesEndRef = useRef(null);

  // API URL（環境変数またはデフォルト）
  const API_URL = process.env.REACT_APP_API_URL || 'https://oialaa0tni.execute-api.us-east-1.amazonaws.com/prod/api/chat';

  // チャット履歴を localStorage に保存
  useEffect(() => {
    if (messages.length > 1) {
      localStorage.setItem('chatHistory', JSON.stringify(messages));
    }
  }, [messages]);

  // 初回ロード時にチャット履歴を復元
  useEffect(() => {
    const savedMessages = localStorage.getItem('chatHistory');
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        const messagesWithDates = parsedMessages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(messagesWithDates);
      } catch (e) {
        console.error('Error parsing saved chat history:', e);
      }
    }
  }, []);

  // メッセージ送信後にスクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  // メッセージ送信処理
  const handleSendMessage = async () => {
    if (inputText.trim() === '') return;

    setConnectionError(false);

    const userMessage = {
      id: messages.length + 1,
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    setIsTyping(true);
    setStreamingText('');

    try {
      const backendMessages = updatedMessages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: backendMessages }),
      });
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      if (!response.body) throw new Error('No response stream available');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.replace('data: ', '');
            if (data === '[DONE]') break;
            else {
              accumulatedText += data;
              setStreamingText(accumulatedText);
            }
          }
        }
      }
      const botMessage = {
        id: updatedMessages.length + 1,
        text: accumulatedText || "I'm sorry, I couldn't generate a response.",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error calling backend API:', error);
      setConnectionError(true);
      const errorMessage = {
        id: updatedMessages.length + 1,
        text: "Sorry, there was an error connecting to the AI service.",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
      setStreamingText('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isTyping) handleSendMessage();
  };

  const clearChat = () => {
    setMessages([{ id: 1, text: "Hello! How can I help you today?", sender: "bot", timestamp: new Date() }]);
    localStorage.removeItem('chatHistory');
  };

  const formatTime = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      {isLoading ? (
        <div>Loading...</div>
      ) : !isAuthenticated ? (
        <div className="auth-container">
          <h2>Welcome to Chat Assistant</h2>
          <p>Please log in to use the chat service.</p>
          <button onClick={() => loginWithRedirect()}>Log In</button>
          <br />
          <button onClick={() => logout()}>Log Out</button>
        </div>
      ) : (
        <div className="chat-container">
          {/* ヘッダー */}
          <div className="chat-header">
            <div className="bot-avatar">
              <BotIcon />
            </div>
            <div className="header-info">
              <h2>Chat Assistant</h2>
              <p>{isTyping ? 'Thinking...' : 'Online'}</p>
              {user && (
                <div className="user-info">
                  <span>Welcome, {user.name}</span>
                  <br />
                  <span>Email: {user.email}</span>
                  <br />
                  <button onClick={() => logout({ returnTo: window.location.origin })} className="auth-button">
                    Log Out
                  </button>
                </div>
              )}
            </div>
            <button onClick={clearChat} className="clear-chat-btn">Clear Chat</button>
          </div>

          {/* 接続エラーバナー */}
          {connectionError && (
            <div className="connection-error">
              <p>Connection error. Please check your internet connection.</p>
            </div>
          )}

          {/* チャットエリア */}
          <div className="chat-messages">
            {messages.map(message => (
              <div key={message.id} className={`message ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}>
                {message.sender === 'bot' && (
                  <div className="message-avatar bot-avatar-small">
                    <BotIcon />
                  </div>
                )}
                <div className={`message-bubble ${message.sender === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
                  <p>{message.text}</p>
                  <span className="message-time">{formatTime(message.timestamp)}</span>
                </div>
                {message.sender === 'user' && (
                  <div className="message-avatar user-avatar">
                    <UserIcon />
                  </div>
                )}
              </div>
            ))}

            {/* ストリーミング中のレスポンス */}
            {streamingText && (
              <div className="message bot-message">
                <div className="message-avatar bot-avatar-small">
                  <BotIcon />
                </div>
                <div className="message-bubble bot-bubble">
                  <p>{streamingText}</p>
                  <span className="message-time">{formatTime(new Date())}</span>
                </div>
              </div>
            )}

            {/* タイピングインジケーター */}
            {isTyping && !streamingText && (
              <div className="message bot-message">
                <div className="message-avatar bot-avatar-small">
                  <BotIcon />
                </div>
                <div className="message-bubble bot-bubble typing-indicator">
                  <div className="typing-dots">
                    <div className="dot"></div>
                    <div className="dot"></div>
                    <div className="dot"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 入力エリア */}
          <div className="chat-input-container">
            <div className="input-wrapper">
              <button className="input-button">
                <PaperclipIcon />
              </button>
              <button className="input-button">
                <MicIcon />
              </button>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="chat-input"
                disabled={isTyping}
              />
              <button
                onClick={handleSendMessage}
                disabled={inputText.trim() === '' || isTyping}
                className={`send-button ${inputText.trim() === '' || isTyping ? 'disabled' : ''}`}
              >
                <SendIcon />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default App;