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

  // Sense-Plan-Actフェーズの表示（簡略化）
  const getPhaseLabel = (phase) => {
    switch (phase) {
      case 'sense':
        return { label: '分析', icon: '🔍' };
      case 'plan':
        return { label: '計画', icon: '📋' };
      case 'act':
        return { label: '実行', icon: '✓' };
      default:
        return null;
    }
  };

  const phaseInfo = getPhaseLabel(message.phase);

  // メッセージテキストを箇条書きに変換
  const formatMessage = (text) => {
    const lines = text.split('\n');
    return lines.map((line, index) => {
      // 箇条書きまたは番号付きリストの検出
      const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().match(/^\d+\./);
      const isEmoji = /^[🤖✅❌🎵🎹🔧📊]/.test(line.trim());

      if (isBullet || isEmoji) {
        return (
          <div key={index} className="flex items-start space-x-1 my-0.5">
            <span className="text-blue-400 mt-0.5">•</span>
            <span className="flex-1">{line.replace(/^[•\-]\s*/, '').replace(/^\d+\.\s*/, '')}</span>
          </div>
        );
      }
      return <div key={index}>{line}</div>;
    });
  };

  return (
    <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-lg p-2 ${message.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-100'}`}>
        <div className="flex items-start space-x-1.5">
          {message.sender === 'assistant' && <Bot className="h-4 w-4 mt-0.5 text-blue-400 flex-shrink-0" />}
          {message.sender === 'user' && <User className="h-4 w-4 mt-0.5 flex-shrink-0" />}
          <div className="flex-1 min-w-0">
            {/* フェーズ表示（簡潔版） */}
            {phaseInfo && (
              <div className="mb-1 text-xs text-gray-400">
                <span className="mr-1">{phaseInfo.icon}</span>
                <span>{phaseInfo.label}</span>
              </div>
            )}

            {/* メッセージ本文 */}
            <div className="text-xs space-y-1">
              {formatMessage(messageText)}
              {/* ストリーミング中のカーソル */}
              {isStreaming && (
                <span className="inline-block w-1 h-3 bg-blue-400 animate-pulse ml-1"></span>
              )}
            </div>

            {/* タイムスタンプ */}
            <div className="flex items-center space-x-2 mt-1">
              <p className="text-xs opacity-50">{timestamp}</p>
            </div>

            {/* 承認・拒否ボタン（簡潔版） */}
            {showApprovalButtons && (
              <div className="mt-2 pt-2 border-t border-gray-600">
                {/* 変更サマリー（簡潔版） */}
                <div className="mb-2 text-xs text-gray-300">
                  {pendingChanges.tracks?.length > 0 && `トラック${pendingChanges.tracks.length}件 `}
                  {pendingChanges.notes?.length > 0 && `ノート${pendingChanges.notes.length}件`}
                  の変更があります
                </div>

                {/* アクションボタン */}
                <div className="flex space-x-2">
                  <button
                    onClick={onApprove}
                    className="flex-1 flex items-center justify-center space-x-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                  >
                    <Check className="h-3 w-3" />
                    <span>適用</span>
                  </button>
                  <button
                    onClick={onReject}
                    className="flex-1 flex items-center justify-center space-x-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                  >
                    <X className="h-3 w-3" />
                    <span>破棄</span>
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