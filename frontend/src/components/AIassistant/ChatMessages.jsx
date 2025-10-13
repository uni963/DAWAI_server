import React, { useEffect, useRef } from "react";
import { MessageSquare, Bot } from "lucide-react";
import ChatMessage from "./ChatMessage";

const ChatMessages = ({ 
  messages, 
  processingState, 
  messagesEndRef,
  approvalSessionId,
  pendingChanges,
  onApprove,
  onReject,
  streamingMessage,
  streamingPhase
}) => {
  // メッセージの自動スクロール
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, processingState.isThinking, processingState.isGenerating, messagesEndRef]);

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-2">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-1">
          <MessageSquare className="h-5 w-5" />
          <p className="text-xs">No messages yet</p>
          <p className="text-xs text-gray-500">Start a conversation with AI</p>
        </div>
      ) : (
        <>
          {messages.map(message => (
            <ChatMessage 
              key={message.id} 
              message={message}
              approvalSessionId={approvalSessionId}
              pendingChanges={pendingChanges}
              onApprove={onApprove}
              onReject={onReject}
            />
          ))}
          
          {/* リアルタイムストリーミングメッセージ */}
          {streamingMessage && (
            <ChatMessage 
              key={streamingMessage.id} 
              message={streamingMessage}
              approvalSessionId={approvalSessionId}
              pendingChanges={pendingChanges}
              onApprove={onApprove}
              onReject={onReject}
            />
          )}
          
          {/* 処理中インジケーター（簡潔版） */}
          {(processingState.isThinking || processingState.isGenerating) && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg p-2 bg-gray-700 text-gray-100">
                <div className="flex items-center space-x-2">
                  <Bot className="h-4 w-4 text-blue-400 flex-shrink-0" />
                  <span className="text-xs text-gray-300">処理中</span>
                  <div className="flex space-x-0.5">
                    <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessages; 