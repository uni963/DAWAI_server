import React from "react";
import { Settings } from "lucide-react";
import { DEFAULT_MODELS } from "./constants";

const ModelSelector = ({ 
  isModelPanelCollapsed, 
  currentModel, 
  globalSettings, 
  onModelChange, 
  onTogglePanel 
}) => {
  const getAvailableModels = () => {
    if (!globalSettings?.aiAssistant) return DEFAULT_MODELS;
    const enabled = DEFAULT_MODELS.filter(m => globalSettings.aiAssistant.models?.[m.id]);
    return enabled.length > 0 ? enabled : DEFAULT_MODELS;
  };

  const availableModels = getAvailableModels();

  return (
    <>
      {/* モデル選択ボタン */}
      <button
        className="h-9 w-9 p-0 text-gray-300 hover:text-white hover:bg-gray-700 flex items-center justify-center border border-gray-600 hover:border-gray-500 rounded"
        onClick={onTogglePanel}
        title="AI Model"
      >
        <Settings className="h-6 w-6" />
      </button>
      
      {/* モデル選択パネル */}
      {!isModelPanelCollapsed && (
        <div className="mt-1 bg-gray-800/50 rounded-lg">
          <div className="px-2 py-1">
            {availableModels.length > 0 ? (
              <div>
                <select 
                  value={currentModel} 
                  onChange={e => onModelChange(e.target.value)} 
                  className="w-full bg-gray-700 border border-gray-600 rounded px-1.5 py-0.5 text-xs text-white"
                >
                  {availableModels.map(model => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))}
                </select>
                <div className="text-xs text-gray-500 mt-0.5">{availableModels.length} model(s) available</div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-xs text-amber-400 flex items-center">
                  <Settings className="h-3 w-3 mr-1" />
                  No models configured
                </div>
                <div className="text-xs text-gray-500">
                  Go to Settings → AI Assistant to configure models and API keys.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ModelSelector; 