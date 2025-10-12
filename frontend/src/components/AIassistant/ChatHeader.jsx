import React from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { 
  ChevronLeft, ChevronRight, Sparkles, History, Plus, Wand2, MessageSquare 
} from "lucide-react";
import ModeToggleButton from "./ModeToggleButton";
import ModelSelector from "./ModelSelector";
import SectionSelector from "./SectionSelector";

const ChatHeader = ({
  isAIAssistantCollapsed,
  setIsAIAssistantCollapsed,
  processingState,
  chatSections,
  currentSectionId,
  showSectionSelector,
  isEditingSectionName,
  editingSectionName,
  chatMode,
  isModelPanelCollapsed,
  currentModel,
  globalSettings,
  onModeChange,
  onModelChange,
  onToggleModelPanel,
  onToggleSectionSelector,
  onSectionSelect,
  onRenameSection,
  onDeleteSection,
  onCreateNewSection,
  onSaveSectionName,
  onCancelEditSectionName,
  onSectionNameChange,
  onSectionNameKeyPress
}) => {
  return (
    <div className="p-2 border-b border-gray-700/50">
      <div className="flex items-center justify-between mb-2">
        {!isAIAssistantCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <h2 className="text-sm font-semibold">AI Assistant</h2>
              {processingState.isGenerating && (
                <Badge variant="outline" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Generating
                </Badge>
              )}
            </div>
            
            {/* 現在のセッション名 */}
            <div className="flex items-center space-x-1 text-xs text-gray-300">
              <span>•</span>
              <span className="truncate max-w-24">
                {chatSections.find(s => s.id === currentSectionId)?.name || '現在のセッション'}
              </span>
            </div>
          </div>
        )}
        <div className="flex items-center space-x-1">
          {!isAIAssistantCollapsed && (
            <>
              {/* セクション管理アイコン */}
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 text-gray-300 hover:text-white hover:bg-gray-700 flex items-center justify-center border border-gray-600 hover:border-gray-500"
                onClick={onCreateNewSection}
                title="New Section"
              >
                <Plus className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 text-gray-300 hover:text-white hover:bg-gray-700 flex items-center justify-center border border-gray-600 hover:border-gray-500"
                onClick={onToggleSectionSelector}
                title="Chat History"
              >
                <History className="h-6 w-6" />
              </Button>
            </>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-9 w-9 p-0 text-gray-400 hover:text-white hover:bg-gray-700" 
            onClick={() => setIsAIAssistantCollapsed(!isAIAssistantCollapsed)}
          >
            {isAIAssistantCollapsed ? <ChevronLeft className="h-6 w-6" /> : <ChevronRight className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* 現在のセッション名表示（編集モード） */}
      {!isAIAssistantCollapsed && isEditingSectionName && showSectionSelector && (
        <div className="mb-2 p-1.5 bg-gray-800/50 rounded-lg border border-gray-700/50">
          <div className="flex items-center space-x-1">
            <input
              type="text"
              value={editingSectionName}
              onChange={onSectionNameChange}
              onKeyPress={onSectionNameKeyPress}
              className="flex-1 h-6 text-xs bg-gray-700 border border-gray-600 rounded px-1.5 text-white"
              autoFocus
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-green-400 hover:text-green-300 hover:bg-gray-700 flex items-center justify-center"
              onClick={onSaveSectionName}
            >
              ✓
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-gray-700 flex items-center justify-center"
              onClick={onCancelEditSectionName}
            >
              ✕
            </Button>
          </div>
        </div>
      )}

      {/* セクション選択ドロップダウン */}
      <SectionSelector
        chatSections={chatSections}
        currentSectionId={currentSectionId}
        showSectionSelector={showSectionSelector}
        onSectionSelect={onSectionSelect}
        onRenameSection={onRenameSection}
        onDeleteSection={onDeleteSection}
      />
      
      {/* モード切替とモデル選択 */}
      {!isAIAssistantCollapsed && (
        <div className="flex items-center space-x-1">
          {/* モード切替 */}
          <div className="flex bg-gray-800/50 rounded-lg p-0.5 flex-1">
            <ModeToggleButton
              mode="agent"
              currentMode={chatMode}
              onClick={() => onModeChange("agent")}
              icon={Wand2}
              tooltip="自動操作モード: AIが分析→計画→実行"
            >
              Agent
            </ModeToggleButton>
            <ModeToggleButton
              mode="chat"
              currentMode={chatMode}
              onClick={() => onModeChange("chat")}
              icon={MessageSquare}
              tooltip="会話モード: 質問と回答のみ"
            >
              Chat
            </ModeToggleButton>
          </div>
          
          {/* モデル選択 */}
          <ModelSelector
            isModelPanelCollapsed={isModelPanelCollapsed}
            currentModel={currentModel}
            globalSettings={globalSettings}
            onModelChange={onModelChange}
            onTogglePanel={onToggleModelPanel}
          />
        </div>
      )}
    </div>
  );
};

export default ChatHeader; 