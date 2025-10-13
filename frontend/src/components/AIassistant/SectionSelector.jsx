import React from "react";
import { Edit, Trash2 } from "lucide-react";

const SectionSelector = ({ 
  chatSections, 
  currentSectionId, 
  showSectionSelector, 
  onSectionSelect, 
  onRenameSection, 
  onDeleteSection 
}) => {
  if (!showSectionSelector) return null;

  return (
    <div className="mb-2 bg-gray-800/95 backdrop-blur-md border border-gray-700/50 rounded-lg p-2 max-h-40 overflow-y-auto shadow-xl">
      <div className="text-xs text-gray-400 mb-1 font-medium">Chat Sections</div>
      <div className="space-y-0.5">
        {chatSections.map((section) => (
          <div
            key={section.id}
            className={`group flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors ${
              currentSectionId === section.id
                ? 'bg-blue-600/20 border border-blue-500/50'
                : 'bg-gray-700/50 hover:bg-gray-700'
            }`}
            onClick={() => onSectionSelect(section.id)}
          >
            <div className="flex-1 min-w-0">
              <div className="text-xs text-white truncate">{section.name}</div>
              <div className="text-xs text-gray-400">
                {section.messages.length} messages
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <button
                className="h-6 w-6 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 flex items-center justify-center border border-blue-500/50 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  onRenameSection(section);
                }}
                title="Rename Section"
              >
                <Edit className="h-4 w-4" />
              </button>
              {chatSections.length > 1 && (
                <button
                  className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20 flex items-center justify-center border border-red-500/50 rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSection(section.id);
                  }}
                  title="Delete Section"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SectionSelector; 