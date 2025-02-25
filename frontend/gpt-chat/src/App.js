import React, { useState, useRef, useEffect } from 'react';
import './ChatBot.css';

// Simple icon components
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

const ModernChatBot = () => {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! How can I help you today?", sender: "bot", timestamp: new Date() }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [connectionError, setConnectionError] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Get the API URL from environment variables or use a default
  // For local development, create a .env file with REACT_APP_API_URL
  // For Amplify, configure environment variables in the Amplify Console
  const API_URL = process.env.REACT_APP_API_URL || 'https://your-api-gateway-url.execute-api.region.amazonaws.com/prod/chat';
  
  const handleSendMessage = async () => {
    if (inputText.trim() === '') return;
    
    // Reset connection error state
    setConnectionError(false);
    
    // Add user message
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
      // Format messages for the backend API
      const backendMessages = updatedMessages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));
      
      // Call the backend API with fetch and handle streaming
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: backendMessages }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      // Check if the response is actually streaming
      if (!response.body) {
        throw new Error('ReadableStream not supported in this browser or response doesn\'t have a body stream');
      }
      
      // Process the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      let accumulatedText = '';
      
      // Reading the stream chunk by chunk
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        // Process SSE format
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.replace('data: ', '');
            
            if (data === '[DONE]') {
              // Stream completed
              break;
            } else {
              accumulatedText += data;
              setStreamingText(accumulatedText);
            }
          }
        }
      }
      
      // After streaming completes, add the full message
      const botMessage = {
        id: updatedMessages.length + 1,
        text: accumulatedText || "I'm sorry, I couldn't generate a response.",
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
      
    } catch (error) {
      console.error('Error calling backend API:', error);
      
      // Set connection error state
      setConnectionError(true);
      
      // Add error message
      const errorMessage = {
        id: updatedMessages.length + 1,
        text: "Sorry, there was an error connecting to the AI service. Please check your connection and try again.",
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
      setStreamingText('');
    }
  };

  // Persist chat history to localStorage
  useEffect(() => {
    if (messages.length > 1) { // Only save if we have more than the initial message
      localStorage.setItem('chatHistory', JSON.stringify(messages));
    }
  }, [messages]);

  // Load chat history from localStorage on initial load
  useEffect(() => {
    const savedMessages = localStorage.getItem('chatHistory');
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        // Convert string timestamps back to Date objects
        const messagesWithDates = parsedMessages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(messagesWithDates);
      } catch (e) {
        console.error('Error parsing saved chat history:', e);
        // If there's an error, we'll just use the default initial message
      }
    }
  }, []);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isTyping) {
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      { id: 1, text: "Hello! How can I help you today?", sender: "bot", timestamp: new Date() }
    ]);
    localStorage.removeItem('chatHistory');
  };

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  // Format time for display
  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <div className="bot-avatar">
          <BotIcon />
        </div>
        <div className="header-info">
          <h2>Chat Assistant</h2>
          <p>{isTyping ? 'Thinking...' : 'Online'}</p>
        </div>
        <button onClick={clearChat} className="clear-chat-btn">
          Clear Chat
        </button>
      </div>
      
      {/* Connection Error Banner */}
      {connectionError && (
        <div className="connection-error">
          <p>Connection error. Please check your internet connection.</p>
        </div>
      )}
      
      {/* Chat area */}
      <div className="chat-messages">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`message ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}
          >
            {message.sender === 'bot' && (
              <div className="message-avatar bot-avatar-small">
                <BotIcon />
              </div>
            )}
            
            <div className={`message-bubble ${message.sender === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
              <p>{message.text}</p>
              <span className="message-time">
                {formatTime(message.timestamp)}
              </span>
            </div>
            
            {message.sender === 'user' && (
              <div className="message-avatar user-avatar">
                <UserIcon />
              </div>
            )}
          </div>
        ))}
        
        {/* Streaming response */}
        {streamingText && (
          <div className="message bot-message">
            <div className="message-avatar bot-avatar-small">
              <BotIcon />
            </div>
            <div className="message-bubble bot-bubble">
              <p>{streamingText}</p>
              <span className="message-time">
                {formatTime(new Date())}
              </span>
            </div>
          </div>
        )}
        
        {/* Typing indicator */}
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
      
      {/* Input area */}
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
  );
};

export default ModernChatBot;