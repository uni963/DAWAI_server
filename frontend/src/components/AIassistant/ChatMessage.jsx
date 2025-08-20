import React, { memo } from "react";
import { Bot, User, Check, X } from "lucide-react";

const ChatMessage = memo(({ 
  message, 
  approvalSessionId, 
  pendingChanges,
  onApprove,
  onReject 
}) => {
  const messageText = typeof message.text === 'string' ? message.text : String(message.text || '');
  const timestamp = new Date(message.timestamp).toLocaleTimeString();
  
  // 承認・拒否ボタンを表示するかどうかを判定
  const showApprovalButtons = message.sender === 'assistant' && 
    approvalSessionId && 
    pendingChanges && 
    (pendingChanges.tracks?.length > 0 || pendingChanges.notes?.length > 0);

  // ストリーミング中のメッセージかどうかを判定
  const isStreaming = message.isStreaming === true;

  // Sense-Plan-Actフェーズの表示
  const getPhaseLabel = (phase) => {
    switch (phase) {
      case 'sense':
        return { label: '現状把握', color: 'bg-blue-500', textColor: 'text-blue-400' };
      case 'plan':
        return { label: '実行計画', color: 'bg-yellow-500', textColor: 'text-yellow-400' };
      case 'act':
        return { label: '実行完了', color: 'bg-green-500', textColor: 'text-green-400' };
      default:
        return null;
    }
  };

  const phaseInfo = getPhaseLabel(message.phase);

  // デバッグログ
  if (message.sender === 'assistant') {
    console.log('=== DEBUG: ChatMessage render ===');
    console.log('message:', message);
    console.log('approvalSessionId:', approvalSessionId);
    console.log('pendingChanges:', pendingChanges);
    console.log('message.hasPendingChanges:', message.hasPendingChanges);
    console.log('pendingChanges.tracks?.length:', pendingChanges?.tracks?.length);
    console.log('pendingChanges.notes?.length:', pendingChanges?.notes?.length);
    console.log('showApprovalButtons:', showApprovalButtons);
    console.log('isStreaming:', isStreaming);
    console.log('phaseInfo:', phaseInfo);
    console.log('showApprovalButtons breakdown:');
    console.log('  - message.sender === assistant:', message.sender === 'assistant');
    console.log('  - approvalSessionId exists:', !!approvalSessionId);
    console.log('  - pendingChanges exists:', !!pendingChanges);
    console.log('  - has tracks or notes:', !!(pendingChanges?.tracks?.length > 0 || pendingChanges?.notes?.length > 0));
    console.log('  - message.hasPendingChanges:', message.hasPendingChanges);
  }

  return (
    <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-lg p-2 ${message.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-100'}`}>
        <div className="flex items-start space-x-1.5">
          {message.sender === 'assistant' && <Bot className="h-4 w-4 mt-0.5 text-blue-400" />}
          {message.sender === 'user' && <User className="h-4 w-4 mt-0.5" />}
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <p className="text-xs">{messageText}</p>
              {/* ストリーミング中のカーソルアニメーション */}
              {isStreaming && (
                <div className="flex items-center space-x-1">
                  <div className="w-1 h-4 bg-blue-400 animate-pulse"></div>
                  <div className="w-1 h-4 bg-blue-400 animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1 h-4 bg-blue-400 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                </div>
              )}
            </div>
            {/* Sense-Plan-Actフェーズラベル */}
            {phaseInfo && (
              <div className="flex items-center space-x-2 mt-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${phaseInfo.color} ${phaseInfo.textColor}`}>
                  {phaseInfo.label}
                </span>
              </div>
            )}
            <div className="flex items-center space-x-2 mt-0.5">
              <p className="text-xs opacity-70">{timestamp}</p>
              {/* ストリーミング中のインジケーター */}
              {isStreaming && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
                  <span className="text-xs text-blue-400 animate-pulse">生成中...</span>
                </div>
              )}
            </div>
            
            {/* 承認・拒否ボタン */}
            {showApprovalButtons && (
              <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-gray-600">
                <span className="text-xs text-gray-400">変更を承認しますか？</span>
                <div className="flex space-x-1">
                  <button
                    onClick={onApprove}
                    className="flex items-center space-x-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                  >
                    <Check className="h-3 w-3" />
                    <span>承認</span>
                  </button>
                  <button
                    onClick={onReject}
                    className="flex items-center space-x-1 px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                  >
                    <X className="h-3 w-3" />
                    <span>拒否</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default ChatMessage; 