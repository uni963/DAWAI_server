import React, { memo } from "react";
import { Button } from "../ui/button";

const ModeToggleButton = memo(({ mode, currentMode, onClick, icon: Icon, children, tooltip }) => (
  <Button
    variant={currentMode === mode ? "default" : "ghost"}
    size="sm"
    className={`flex-1 text-xs transition-all duration-150 ${currentMode === mode ? "bg-blue-600 text-white shadow-md" : "text-gray-400 hover:text-white hover:bg-gray-700/50"}`}
    onClick={onClick}
    title={tooltip}
  >
    <Icon className="h-3 w-3 mr-1" />
    {children}
  </Button>
));

export default ModeToggleButton; 