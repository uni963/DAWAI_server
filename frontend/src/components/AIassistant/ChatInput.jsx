import React from "react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { StopCircle, Send } from "lucide-react";

const ChatInput = ({
  newMessage,
  processingState,
  onTextChange,
  onKeyDown,
  onSendClick,
  onCancelGeneration
}) => {
  return (
    <div className="p-2 border-t border-gray-700/50">
      {processingState.isGenerating && (
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-400">Generating...</span>
          </div>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={onCancelGeneration} 
            className="flex-shrink-0 h-5 px-1.5 text-xs"
          >
            <StopCircle className="h-3 w-3 mr-1" />
            Stop
          </Button>
        </div>
      )}
      <div className="flex items-end space-x-1.5">
        <Textarea
          placeholder={processingState.isGenerating ? "Generating..." : "Type your message or command..."}
          value={newMessage}
          onChange={onTextChange}
          onKeyDown={onKeyDown}
          className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400 resize-y min-h-[50px] max-h-[150px] text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          disabled={processingState.isGenerating}
          spellCheck="false"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          data-testid="chat-input"
          data-tutorial="ai-chat-input"
          style={{
            fontFamily: 'inherit',
            lineHeight: '1.4',
            wordBreak: 'break-word'
          }}
        />
        <Button 
          onClick={onSendClick} 
          size="sm" 
          className="bg-blue-600 hover:bg-blue-700 h-10 w-10 p-0 disabled:opacity-50 disabled:cursor-not-allowed" 
          disabled={!newMessage.trim() || processingState.isGenerating}
        >
          <Send className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};

export default ChatInput; 