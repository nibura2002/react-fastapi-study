// frontend/src/App.js
import React, { useState } from 'react';

function App() {
  const [message, setMessage] = useState('');
  const [chatLog, setChatLog] = useState([]);

  // ローカルテスト用。デプロイ後は API Gateway の URL に変更
  const API_STREAM_URL = "http://localhost:8000/api/chat/stream";

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    // ユーザーのメッセージをチャットログに追加
    setChatLog(prev => [...prev, { sender: 'You', text: message }]);

    try {
      const response = await fetch(API_STREAM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let botMessage = '';

      // 新規のBotメッセージエントリを追加
      setChatLog(prev => [...prev, { sender: 'Bot', text: '' }]);

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunk = decoder.decode(value);
        botMessage += chunk;
        // チャットログの最新の Bot メッセージを更新
        setChatLog(prev => {
          const newLog = [...prev];
          newLog[newLog.length - 1].text = botMessage;
          return newLog;
        });
      }
    } catch (error) {
      console.error('Error:', error);
      setChatLog(prev => [...prev, { sender: 'Bot', text: 'エラーが発生しました。' }]);
    }
    setMessage('');
  };

  return (
    <div style={{ margin: '20px' }}>
      <h1>チャットツール</h1>
      <div style={{ border: '1px solid #ccc', padding: '10px', height: '300px', overflowY: 'scroll' }}>
        {chatLog.map((entry, index) => (
          <div key={index} style={{ marginBottom: '10px' }}>
            <strong>{entry.sender}:</strong> {entry.text}
          </div>
        ))}
      </div>
      <form onSubmit={handleSend} style={{ marginTop: '10px' }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="メッセージを入力"
          style={{ width: '80%', padding: '8px' }}
        />
        <button type="submit" style={{ padding: '8px 16px', marginLeft: '5px' }}>
          送信
        </button>
      </form>
    </div>
  );
}

export default App;