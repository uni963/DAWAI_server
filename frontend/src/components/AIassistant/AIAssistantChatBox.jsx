import React, { useState, useEffect, useRef, memo, useCallback } from "react";
import { Wand2 } from "lucide-react";
import { DEFAULT_MODELS, PROCESSING_STATES } from "./constants";
import ChatHeader from "./ChatHeader";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";

const AIAssistantChatBox = ({
  isAIAssistantCollapsed,
  setIsAIAssistantCollapsed,
  aiPanelWidth,
  setAiPanelWidth,
  isResizing,
  setIsResizing,
  globalSettings,
  updateGlobalSettings,
  chatMode,
  setChatMode,
  newMessage,
  setNewMessage,
  currentTrack,
  projectInfo,
  existingTracks,
}) => {

  // 状態管理
  const [isModelPanelCollapsed, setIsModelPanelCollapsed] = useState(true);
  const [processingState, setProcessingState] = useState(PROCESSING_STATES.IDLE);
  const [currentModel, setCurrentModel] = useState(DEFAULT_MODELS[0].id);
  const [approvalSessionId, setApprovalSessionId] = useState(null);
  const [pendingChanges, setPendingChanges] = useState({ tracks: [], notes: [], sessionId: null });
  
  // リアルタイムストリーミング用の状態
  const [streamingMessage, setStreamingMessage] = useState(null);
  const [streamingPhase, setStreamingPhase] = useState(null);

  // チャットセクション管理
  const [chatSections, setChatSections] = useState([]);
  const [currentSectionId, setCurrentSectionId] = useState('default');
  const [showSectionSelector, setShowSectionSelector] = useState(false);
  const [isEditingSectionName, setIsEditingSectionName] = useState(false);
  const [editingSectionName, setEditingSectionName] = useState('');
  
  const messagesEndRef = useRef(null);

  // 初期化
  useEffect(() => {
    const defaultSection = {
      id: 'default',
      name: '現在のセッション',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setChatSections([defaultSection]);

    // aiAgentEngineがグローバルに設定されているかを確認
    const initializeAIAgentEngine = async () => {
      if (!window.aiAgentEngine) {
        try {
          const module = await import("../../utils/aiAgentEngine.js");
          window.aiAgentEngine = module.default;

          // 初期化を確実に実行
          if (window.aiAgentEngine && typeof window.aiAgentEngine.initialize === 'function') {
            await window.aiAgentEngine.initialize();
          }
        } catch (error) {
          console.error('AIエージェントの初期化に失敗しました:', error);
        }
      } else {
        // 既存のエンジンも初期化を確認
        if (window.aiAgentEngine && typeof window.aiAgentEngine.initialize === 'function') {
          try {
            await window.aiAgentEngine.initialize();
          } catch (error) {
            console.error('AIエージェントの初期化に失敗しました:', error);
          }
        }
      }
    };

    initializeAIAgentEngine();
  }, []);

  // 設定の適用
  useEffect(() => {
    if (globalSettings?.aiAssistant) {
      const enabled = DEFAULT_MODELS.find(m => globalSettings.aiAssistant.models?.[m.id]);
      if (enabled) {
        setCurrentModel(enabled.id);
      }
    }
  }, [globalSettings]);

  // 履歴メニューが閉じられた時に編集モードも終了
  useEffect(() => {
    if (!showSectionSelector && isEditingSectionName) {
      setIsEditingSectionName(false);
      setEditingSectionName('');
    }
  }, [showSectionSelector, isEditingSectionName]);

  // 現在のセクションのメッセージを取得
  const getCurrentSectionMessages = () => {
    const currentSection = chatSections.find(section => section.id === currentSectionId);
    return currentSection ? currentSection.messages : [];
  };

  // メッセージを現在のセクションに追加
  const addMessageToCurrentSection = (message) => {
    const safeMessage = {
      ...message,
      text: typeof message.text === 'string' ? message.text : String(message.text || ''),
      id: message.id || Date.now() + Math.random(),
      timestamp: message.timestamp || new Date().toISOString()
    };
    
    setChatSections(prev => prev.map(section => 
      section.id === currentSectionId 
        ? { ...section, messages: [...section.messages, safeMessage], updatedAt: new Date().toISOString() }
        : section
    ));
  };

  // セクション管理
  const createNewSection = () => {
    const newSection = {
      id: `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: '新しいセッション',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setChatSections(prev => [...prev, newSection]);
    setCurrentSectionId(newSection.id);
    setShowSectionSelector(false);
  };

  const deleteSection = (sectionId) => {
    setChatSections(prev => {
      const filtered = prev.filter(s => s.id !== sectionId);
      if (currentSectionId === sectionId && filtered.length > 0) {
        setCurrentSectionId(filtered[0].id);
      }
      return filtered;
    });
  };

  const renameSection = (section) => {
    const newName = prompt('セッション名を入力してください:', section.name);
    if (newName && newName.trim() && newName !== section.name) {
      setChatSections(prev => prev.map(s => 
        s.id === section.id ? { ...s, name: newName.trim() } : s
      ));
    }
  };

  // セッション名編集
  const handleStartEditSectionName = () => {
    const currentSection = chatSections.find(s => s.id === currentSectionId);
    if (currentSection) {
      setEditingSectionName(currentSection.name);
      setIsEditingSectionName(true);
    }
  };

  const handleSaveSectionName = () => {
    if (editingSectionName.trim()) {
      setChatSections(prev => prev.map(section => 
        section.id === currentSectionId 
          ? { ...section, name: editingSectionName.trim() }
          : section
      ));
    }
    setIsEditingSectionName(false);
  };

  const handleCancelEditSectionName = () => {
    const currentSection = chatSections.find(s => s.id === currentSectionId);
    if (currentSection) {
      setEditingSectionName(currentSection.name);
    }
    setIsEditingSectionName(false);
  };

  const handleSectionNameKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSaveSectionName();
    } else if (e.key === 'Escape') {
      handleCancelEditSectionName();
    }
  };

  // チャット送信
  const handleSend = async () => {
    if (!newMessage.trim() || processingState.isGenerating) return;

    const userMessage = {
      id: Date.now() + Math.random(),
      sender: "user",
      text: String(newMessage || ''),
      timestamp: new Date().toISOString()
    };
    addMessageToCurrentSection(userMessage);
    
    // ストリーミング状態をリセット
    setStreamingMessage(null);
    setStreamingPhase(null);
    
    const currentMessage = newMessage;
    setNewMessage("");

          if (chatMode === "agent") {
        // AI Agent モード（ストリーミング対応）
        setProcessingState(PROCESSING_STATES.GENERATING);
        
        // ストリーミング状態をリセット
        setStreamingMessage(null);
        setStreamingPhase(null);

      try {
        // 重い処理を簡素化
        const getTracksWithNotes = () => {
          if (!existingTracks) return [];
          return existingTracks.filter(track => track.midiData?.notes?.length > 0);
        };

        const context = {
          currentTrack,
          projectInfo,
          existingTracks,
          musicContext: {
            projectName: projectInfo?.name,
            tempo: projectInfo?.tempo,
            key: projectInfo?.key,
            timeSignature: projectInfo?.timeSignature,
            currentTime: projectInfo?.currentTime,
            totalDuration: projectInfo?.totalDuration,
            isPlaying: projectInfo?.isPlaying,
            tracksCount: projectInfo?.tracksCount,
            activeTab: projectInfo?.activeTab,
            tracksWithNotes: getTracksWithNotes().slice(0, 5), // 制限
            currentTrackDetails: currentTrack ? {
              id: currentTrack.id,
              name: currentTrack.name,
              type: currentTrack.type,
              notesCount: currentTrack.midiData?.notes?.length || 0,
              volume: currentTrack.volume,
              pan: currentTrack.pan,
              muted: currentTrack.muted,
              solo: currentTrack.solo
            } : null
          },
        };

        // AI Agent Engineの初期化状態を確認
        if (!window.aiAgentEngine) {
          throw new Error('AI Agent Engine not initialized');
        }

        // AI Agent Engineに現在の設定を渡す
        if (globalSettings?.aiAssistant) {
          await window.aiAgentEngine.reinitialize({
            apiKeys: globalSettings.aiAssistant.apiKeys || {},
            models: globalSettings.aiAssistant.models || {}
          });
        }
        
        // 現在のモデルを設定
        if (currentModel) {
          window.aiAgentEngine.setModel(currentModel);
        }

        // ストリーミングレスポンス用のメッセージを作成
        const streamingMessage = {
          id: Date.now() + Math.random(),
          sender: "assistant",
          text: "",
          timestamp: new Date().toISOString(),
          isStreaming: true,
          hasPendingChanges: false
        };
        addMessageToCurrentSection(streamingMessage);

        // ストリーミングAgent modeを実行
        const result = await window.aiAgentEngine.streamAgentAction(
          currentMessage, 
          context,
          (chunk, fullResponse) => {
            // ストリーミング中のテキストを更新
            setChatSections(prev => prev.map(section => 
              section.id === currentSectionId 
                ? {
                    ...section,
                    messages: section.messages.map(msg => 
                      msg.id === streamingMessage.id 
                        ? { ...msg, text: fullResponse }
                        : msg
                    )
                  }
                : section
            ));
          }
        );
        
        // ストリーミング完了後、最終的なメッセージを更新
        let displayText = '🤖 Agent Mode: 操作が完了しました';
        
        if (result && typeof result === 'object') {
          if (result.summary) {
            displayText = `🤖 Agent Mode: ${String(result.summary)}`;
          }
          if (result.nextSteps) {
            displayText += `\n\n${String(result.nextSteps)}`;
          }
          if (result.error) {
            displayText += `\n\nエラー: ${String(result.error)}`;
          }
        } else if (typeof result === 'string') {
          displayText = `🤖 Agent Mode: ${result}`;
        } else {
          displayText = `🤖 Agent Mode: ${String(result)}`;
        }
        
        // 最終的なメッセージに更新
        setChatSections(prev => prev.map(section => 
          section.id === currentSectionId 
            ? {
                ...section,
                messages: section.messages.map(msg => 
                  msg.id === streamingMessage.id 
                    ? { 
                        ...msg, 
                        text: displayText,
                        isStreaming: false,
                        agentActions: Array.isArray(result?.actions) ? result.actions : []
                      }
                    : msg
                )
              }
            : section
        ));
        
      } catch (error) {
        console.error("AI Agent generation error:", error);
        const errorResponse = {
          id: Date.now() + Math.random(),
          sender: "assistant",
          text: "AI Agentでエラーが発生しました。しばらく時間をおいて再度お試しください。",
          timestamp: new Date().toISOString()
        };
        addMessageToCurrentSection(errorResponse);
      } finally {
        setProcessingState(PROCESSING_STATES.IDLE);
      }
    } else {
      // Chat モード（ストリーミング対応）
      setProcessingState(PROCESSING_STATES.THINKING);
      
      try {
        if (!currentModel) {
          const errorMessage = {
            id: Date.now() + Math.random(),
            sender: "assistant",
            text: "モデルが設定されていません。設定画面でモデルを有効化してください。",
            timestamp: new Date().toISOString(),
          };
          addMessageToCurrentSection(errorMessage);
          return;
        }

        const apiKeys = globalSettings?.aiAssistant?.apiKeys || {};
        const currentMessages = getCurrentSectionMessages();
        
        // コンテキストを簡素化
        const detailedContext = {
          chatHistory: currentMessages.slice(-3).map(m => `${m.sender}: ${m.text}`).join('\n'),
          projectInfo: {
            name: projectInfo?.name,
            tempo: projectInfo?.tempo,
            key: projectInfo?.key,
            timeSignature: projectInfo?.timeSignature,
            currentTime: projectInfo?.currentTime,
            totalDuration: projectInfo?.totalDuration,
            isPlaying: projectInfo?.isPlaying,
            tracksCount: projectInfo?.tracksCount,
            activeTab: projectInfo?.activeTab
          },
          tracks: existingTracks?.slice(0, 10).map(track => ({
            id: track.id,
            name: track.name,
            type: track.type,
            notesCount: track.midiData?.notes?.length || 0,
            volume: track.volume,
            pan: track.pan,
            muted: track.muted,
            solo: track.solo
          })),
          currentTrack: currentTrack ? {
            id: currentTrack.id,
            name: currentTrack.name,
            type: currentTrack.type,
            notesCount: currentTrack.midiData?.notes?.length || 0,
            volume: currentTrack.volume,
            pan: currentTrack.pan,
            muted: currentTrack.muted,
            solo: currentTrack.solo
          } : null
        };

        // AI Agent Engineの初期化状態を確認
        if (!window.aiAgentEngine) {
          throw new Error('AI Agent Engine not initialized');
        }

        // AI Agent Engineに現在の設定を渡す
        if (globalSettings?.aiAssistant) {
          await window.aiAgentEngine.reinitialize({
            apiKeys: globalSettings.aiAssistant.apiKeys || {},
            models: globalSettings.aiAssistant.models || {}
          });
        }
        
        // 現在のモデルを設定
        if (currentModel) {
          window.aiAgentEngine.setModel(currentModel);
        }

        // ストリーミングレスポンス用のメッセージを作成
        const streamingMessage = {
          id: Date.now() + Math.random(),
          sender: "assistant",
          text: "",
          timestamp: new Date().toISOString(),
          isStreaming: true,
          hasPendingChanges: false
        };
        addMessageToCurrentSection(streamingMessage);

        // ストリーミングチャットを実行
        const responseText = await window.aiAgentEngine.streamChat(
          currentMessage,
          detailedContext,
          (chunk, fullResponse) => {
            // ストリーミング中のテキストをリアルタイム更新
            setChatSections(prev => prev.map(section => 
              section.id === currentSectionId 
                ? {
                    ...section,
                    messages: section.messages.map(msg => 
                      msg.id === streamingMessage.id 
                        ? { 
                            ...msg, 
                            text: fullResponse,
                            isStreaming: true  // ストリーミング中フラグを維持
                          }
                        : msg
                    )
                  }
                : section
            ));
          }
        );
        
        // ストリーミング完了後、最終的なメッセージに更新
        setChatSections(prev => prev.map(section => 
          section.id === currentSectionId 
            ? {
                ...section,
                messages: section.messages.map(msg => 
                  msg.id === streamingMessage.id 
                    ? { 
                        ...msg, 
                        text: responseText,
                        isStreaming: false
                      }
                    : msg
                )
              }
            : section
        ));
        
      } catch (error) {
        console.error('Chat API Error:', error);
        const errorResponse = {
          id: Date.now() + Math.random(),
          sender: 'assistant',
          text: 'ネットワークエラーが発生しました。接続を確認してください。',
          timestamp: new Date().toISOString()
        };
        addMessageToCurrentSection(errorResponse);
      } finally {
        setProcessingState(PROCESSING_STATES.IDLE);
      }
    }
  };

  // キーボードショートカット
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // テキスト入力ハンドラー（最適化版）
  const handleTextChange = useCallback((e) => {
    const value = e.target.value;
    setNewMessage(value);
  }, []);

  // 送信ボタンクリックハンドラー
  const handleSendClick = () => {
    handleSend();
  };

  // 生成のキャンセル
  const handleCancelGeneration = () => {
    window.aiAgentEngine.cancelGeneration();
    setProcessingState(PROCESSING_STATES.IDLE);
  };

  // 承認・拒否ハンドラー
  const handleApprove = async () => {
    if (window.aiAgentEngine && approvalSessionId) {
      try {
        // 承認処理の前に、承認待ち状態を即座にクリア
        setApprovalSessionId(null);
        setPendingChanges({ tracks: [], notes: [], sessionId: null });

        const result = await window.aiAgentEngine.approveAllChanges();

        // MIDIエディターの強制更新をトリガー
        if (window.midiEditorForceUpdate) {
          window.midiEditorForceUpdate();
        }

        // 承認完了メッセージを追加
        const approvalMessage = {
          id: Date.now() + Math.random(),
          sender: 'assistant',
          text: '✅ 変更を適用しました',
          timestamp: new Date().toISOString()
        };
        addMessageToCurrentSection(approvalMessage);
      } catch (error) {
        console.error('変更の承認中にエラーが発生しました:', error);

        // エラーの場合は承認待ち状態を復元
        const pendingChangesData = window.aiAgentEngine.getPendingChanges();
        setApprovalSessionId(approvalSessionId);
        setPendingChanges(pendingChangesData);

        const errorMessage = {
          id: Date.now() + Math.random(),
          sender: 'assistant',
          text: '❌ エラーが発生しました',
          timestamp: new Date().toISOString()
        };
        addMessageToCurrentSection(errorMessage);
      }
    }
  };

  const handleReject = async () => {
    if (window.aiAgentEngine && approvalSessionId) {
      try {
        // 拒否処理の前に、承認待ち状態を即座にクリア
        setApprovalSessionId(null);
        setPendingChanges({ tracks: [], notes: [], sessionId: null });

        const result = await window.aiAgentEngine.rejectAllChanges();

        // 拒否処理完了後の状態クリアを確実にする
        setTimeout(() => {
          setApprovalSessionId(null);
          setPendingChanges({ tracks: [], notes: [], sessionId: null });
        }, 100);

        // MIDIエディターの強制更新をトリガー
        if (window.midiEditorForceUpdate) {
          window.midiEditorForceUpdate();
        }

        // 拒否完了メッセージを追加
        const rejectionMessage = {
          id: Date.now() + Math.random(),
          sender: 'assistant',
          text: '❌ 変更を破棄しました',
          timestamp: new Date().toISOString()
        };
        addMessageToCurrentSection(rejectionMessage);
      } catch (error) {
        console.error('変更の拒否中にエラーが発生しました:', error);

        // エラーの場合は承認待ち状態を復元
        const pendingChangesData = window.aiAgentEngine.getPendingChanges();
        setApprovalSessionId(approvalSessionId);
        setPendingChanges(pendingChangesData);

        const errorMessage = {
          id: Date.now() + Math.random(),
          sender: 'assistant',
          text: '❌ エラーが発生しました',
          timestamp: new Date().toISOString()
        };
        addMessageToCurrentSection(errorMessage);
      }
    }
  };

  // リサイズ機能
  const handleMouseDown = (e) => {
    if (e.target.closest('.resize-handle')) {
      setIsResizing(true);
      e.preventDefault();
    }
  };

  const handleMouseMove = (e) => {
    if (isResizing) {
      const newWidth = Math.max(200, Math.min(600, window.innerWidth - e.clientX));
      setAiPanelWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  // マウスイベントリスナーの設定
  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // AI Agent Engineのイベントリスナー
  useEffect(() => {
    const handleAgentEvent = (eventType, data) => {
      
      switch (eventType) {
        case 'agentStreamingStarted':
          setProcessingState(PROCESSING_STATES.GENERATING);
          break;
        case 'agentStreamingChunk':
          // ストリーミング中のチャンク処理
          if (data.phase === 'plan' || data.phase === 'act') {
            setStreamingMessage(prev => ({
              id: prev?.id || Date.now() + Math.random(),
              sender: 'assistant',
              text: data.fullResponse || '',
              timestamp: new Date().toISOString(),
              phase: data.phase,
              isStreaming: true
            }));
            setStreamingPhase(data.phase);
          }
          break;
        case 'sensePhaseCompleted':
          // Sense段階完了時の処理 - 既存のチャット履歴を保持し、Senseメッセージを一番上に配置
          const senseResponse = {
            id: Date.now() + Math.random(),
            sender: 'assistant',
            text: data.response || '現状を把握しました。',
            timestamp: new Date().toISOString(),
            phase: 'sense',
            understood: data.understood
          };
          
          // 現在のセクションのメッセージを取得
          const currentMessages = getCurrentSectionMessages();
          
          // 既存のチャット履歴を保持し、Senseメッセージを一番上に配置
          setChatSections(prev => prev.map(section => 
            section.id === currentSectionId 
              ? {
                  ...section,
                  messages: [
                    senseResponse, // Senseメッセージを一番上に
                    ...currentMessages.filter(msg => !msg.isStreaming), // 既存のチャット履歴を保持
                    ...currentMessages.filter(msg => msg.isStreaming) // 生成中メッセージを下に
                  ]
                }
              : section
          ));
          break;
        case 'planPhaseCompleted':
          // Plan段階完了時の処理 - リアルタイムストリーミングで表示し、完了後にチャットメッセージとして保存
          const planResponse = {
            id: Date.now() + Math.random(),
            sender: 'assistant',
            text: data.response || '実行計画を策定しました。',
            timestamp: new Date().toISOString(),
            phase: 'plan',
            actions: data.actions,
            summary: data.summary,
            nextSteps: data.nextSteps,
            isStreaming: false
          };
          
          // Planメッセージをチャットとして追加
          addMessageToCurrentSection(planResponse);
          
          // ストリーミングメッセージをクリア（Plan段階が完了したため）
          setStreamingMessage(null);
          setStreamingPhase(null);
          break;
        case 'actPhaseCompleted':
          // Act段階完了時の処理 - リアルタイムストリーミングで表示し、完了後にチャットメッセージとして保存
          setProcessingState({ isGenerating: false, isThinking: false, progress: 100 });
          const actResponse = {
            id: Date.now() + Math.random(),
            sender: 'assistant',
            text: data.response || data.summary || '操作が完了しました。',
            timestamp: new Date().toISOString(),
            phase: 'act',
            hasPendingChanges: data.hasPendingChanges,
            isStreaming: false
          };
          
          // Actメッセージをチャットとして追加
          addMessageToCurrentSection(actResponse);
          
          // ストリーミングメッセージをクリア（Act段階が完了したため）
          setStreamingMessage(null);
          setStreamingPhase(null);


          // MIDIエディターの強制更新をトリガー
          if (data.hasPendingChanges && window.midiEditorForceUpdate) {
            window.midiEditorForceUpdate();
          }
          break;
        case 'agentStreamingCompleted':
          setProcessingState({ isGenerating: false, isThinking: false, progress: 100 });

          if (data && data.result) {
            // 承認セッションが開始されている場合は、hasPendingChangesを強制的にtrueにする
            const hasPendingChanges = data.result.hasPendingChanges || 
              (approvalSessionId && pendingChanges && (pendingChanges.tracks?.length > 0 || pendingChanges.notes?.length > 0));
            
            const aiResponse = {
              id: Date.now() + Math.random(),
              sender: 'assistant',
              text: data.result.summary || 'AI生成が完了しました。',
              timestamp: new Date().toISOString(),
              hasPendingChanges: hasPendingChanges
            };
            addMessageToCurrentSection(aiResponse);

            // MIDIエディターの強制更新をトリガー
            if (hasPendingChanges && window.midiEditorForceUpdate) {
              window.midiEditorForceUpdate();
            }
          }
          break;
        case 'agentStreamingError':
          setProcessingState(PROCESSING_STATES.IDLE);
          const errorResponse = {
            id: Date.now() + Math.random(),
            sender: 'assistant',
            text: data.error || '生成中にエラーが発生しました。',
            timestamp: new Date().toISOString()
          };
          addMessageToCurrentSection(errorResponse);
          break;
        case 'generationStarted':
          setProcessingState(PROCESSING_STATES.GENERATING);
          break;
        case 'generationProgress':
          setProcessingState(prev => ({ ...prev, progress: data.progress || 0 }));
          break;
        case 'generationCompleted':
          setProcessingState({ isGenerating: false, isThinking: false, progress: 100 });

          if (data && data.result) {
            // 承認セッションが開始されている場合は、hasPendingChangesを強制的にtrueにする
            const hasPendingChanges = data.result.hasPendingChanges || 
              (approvalSessionId && pendingChanges && (pendingChanges.tracks?.length > 0 || pendingChanges.notes?.length > 0));
            
            const aiResponse = {
              id: Date.now() + Math.random(),
              sender: 'assistant',
              text: data.result.summary || 'AI生成が完了しました。',
              timestamp: new Date().toISOString(),
              hasPendingChanges: hasPendingChanges
            };
            addMessageToCurrentSection(aiResponse);

            // MIDIエディターの強制更新をトリガー
            if (hasPendingChanges && window.midiEditorForceUpdate) {
              window.midiEditorForceUpdate();
            }
          }
          break;
        case 'generationError':
          setProcessingState(PROCESSING_STATES.IDLE);
          const errorResponse2 = {
            id: Date.now() + Math.random(),
            sender: 'assistant',
            text: data.error || '生成中にエラーが発生しました。',
            timestamp: new Date().toISOString()
          };
          addMessageToCurrentSection(errorResponse2);
          break;
        default:
          break;
      }
    };

    window.aiAgentEngine.addListener(handleAgentEvent);

    return () => {
      window.aiAgentEngine.removeListener(handleAgentEvent);
    };
  }, []);

  // AI Agent Engineのイベントリスナー（承認セッション管理）
  useEffect(() => {
    const handleApprovalEvents = (eventType, data) => {
      // 拒否処理中は承認待ちイベントを無視
      if (window.aiAgentEngine && window.aiAgentEngine.isRejectingChanges) {
        return;
      }


      switch (eventType) {
        case 'approvalSessionStarted':
          setApprovalSessionId(data.sessionId);
          const pendingChangesData = window.aiAgentEngine.getPendingChanges();
          setPendingChanges(pendingChangesData);
          break;
        case 'pendingTrackChangeAdded':
        case 'pendingNoteChangeAdded':
          // 拒否処理中はgetPendingChangesを呼ばない
          if (!window.aiAgentEngine || !window.aiAgentEngine.isRejectingChanges) {
            const updatedPendingChanges = window.aiAgentEngine.getPendingChanges();
            setPendingChanges(updatedPendingChanges);
          }
          break;
        case 'allChangesApproved':
        case 'allChangesRejected':
          setApprovalSessionId(null);
          setPendingChanges({ tracks: [], notes: [], sessionId: null });

          // 拒否処理後のMIDIエディタ更新をトリガー（簡素化）
          setTimeout(() => {
            if (window.midiEditorForceUpdate) {
              window.midiEditorForceUpdate();
            }
          }, 200);
          break;
        default:
          break;
      }
    };

    window.aiAgentEngine.addListener(handleApprovalEvents);

    return () => {
      window.aiAgentEngine.removeListener(handleApprovalEvents);
    };
  }, []);

  // グローバルアクセス用の関数を設定
  useEffect(() => {
    window.aiAssistantChatBox = {
      exportChatHistory: () => ({
        chatSections,
        currentSectionId,
        exportedAt: new Date().toISOString()
      }),
      importChatHistory: (chatData) => {
        if (chatData.chatSections && Array.isArray(chatData.chatSections)) {
          setChatSections(chatData.chatSections);
          if (chatData.currentSectionId && chatData.chatSections.find(s => s.id === chatData.currentSectionId)) {
            setCurrentSectionId(chatData.currentSectionId);
          } else if (chatData.chatSections.length > 0) {
            setCurrentSectionId(chatData.chatSections[0].id);
          }
        }
      }
    };
    
    return () => {
      delete window.aiAssistantChatBox;
    };
  }, [chatSections, currentSectionId]);

  // UI
  return (
    <aside className={`bg-gray-900/80 backdrop-blur-md border-l border-gray-700/50 flex flex-col h-full transition-all duration-300 ${isAIAssistantCollapsed ? 'w-12' : ''}`} style={{ width: isAIAssistantCollapsed ? '48px' : `${aiPanelWidth}px` }}>
      {/* リサイズハンドル */}
      {!isAIAssistantCollapsed && (
        <div className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500/50 transition-colors z-10 resize-handle" onMouseDown={handleMouseDown} />
      )}
      
      {/* ヘッダー */}
      <ChatHeader
        isAIAssistantCollapsed={isAIAssistantCollapsed}
        setIsAIAssistantCollapsed={setIsAIAssistantCollapsed}
        processingState={processingState}
        chatSections={chatSections}
        currentSectionId={currentSectionId}
        showSectionSelector={showSectionSelector}
        isEditingSectionName={isEditingSectionName}
        editingSectionName={editingSectionName}
        chatMode={chatMode}
        isModelPanelCollapsed={isModelPanelCollapsed}
        currentModel={currentModel}
        globalSettings={globalSettings}
        onModeChange={setChatMode}
        onModelChange={setCurrentModel}
        onToggleModelPanel={() => setIsModelPanelCollapsed(prev => !prev)}
        onToggleSectionSelector={() => setShowSectionSelector(!showSectionSelector)}
        onSectionSelect={(sectionId) => {
          setCurrentSectionId(sectionId);
          setShowSectionSelector(false);
        }}
        onRenameSection={renameSection}
        onDeleteSection={deleteSection}
        onCreateNewSection={createNewSection}
        onSaveSectionName={handleSaveSectionName}
        onCancelEditSectionName={handleCancelEditSectionName}
        onSectionNameChange={(e) => setEditingSectionName(e.target.value)}
        onSectionNameKeyPress={handleSectionNameKeyPress}
      />
      
      {/* チャットエリア */}
      {!isAIAssistantCollapsed && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <ChatMessages
            messages={getCurrentSectionMessages()}
            processingState={processingState}
            messagesEndRef={messagesEndRef}
            approvalSessionId={approvalSessionId}
            pendingChanges={pendingChanges}
            onApprove={handleApprove}
            onReject={handleReject}
            streamingMessage={streamingMessage}
            streamingPhase={streamingPhase}
          />
          
          <ChatInput
            newMessage={newMessage}
            processingState={processingState}
            onTextChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onSendClick={handleSendClick}
            onCancelGeneration={handleCancelGeneration}
          />
        </div>
      )}
      
      {/* 折りたたみ時のアイコン表示 */}
      {isAIAssistantCollapsed && (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <Wand2 className="h-5 w-5 mb-1" />
          <span className="text-xs font-semibold [writing-mode:vertical-lr]">AI</span>
        </div>
      )}
    </aside>
  );
};

export default memo(AIAssistantChatBox); 