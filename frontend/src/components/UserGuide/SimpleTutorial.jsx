import { useState, useEffect, useCallback } from 'react'
import { X, ArrowRight, ChevronRight } from 'lucide-react'

/**
 * SimpleTutorial - シンプルで邪魔にならないポップアップ型チュートリアル
 *
 * 特徴:
 * - 非ブロッキング: 背景のDAW画面も操作可能
 * - シンプルなメッセージ: 一目で読める短い説明
 * - ハイライト誘導: 次に操作すべきUI要素を強調
 * - ユーザー主導: 実際の操作で自動進行
 * - 柔軟なスキップ: 1ステップスキップと全体スキップ
 */

const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: 'DAWAIへようこそ！',
    description: '簡単な操作ガイドを始めます（約2分）',
    targetSelector: null,
    position: 'center',
    action: 'button-click' // ボタンクリックで次へ
  },
  {
    id: 'play',
    title: '再生ボタンを押してみよう',
    description: '▶ボタンで音楽を再生できます',
    targetSelector: '[data-tutorial="play-button"]',
    position: 'bottom',
    action: 'custom-event', // tutorial:play イベントで次へ
    eventName: 'tutorial:play'
  },
  {
    id: 'piano-track',
    title: 'Piano Trackを開いてみよう',
    description: 'タブをクリックしてエディタを表示',
    targetSelector: '[data-tutorial="piano-track-tab"]',
    position: 'bottom',
    action: 'custom-event', // tutorial:tab-switch イベントで次へ
    eventName: 'tutorial:tab-switch'
  },
  {
    id: 'keyboard-input',
    title: 'キーボードまたは鍵盤をクリックして音を鳴らしてみよう',
    description: 'A〜Kキーまたは鍵盤クリックで演奏できます',
    targetSelector: '[data-tutorial="piano-roll"]',
    position: 'left', // 鍵盤に向けて左向きの吹き出しに変更
    action: 'multi-event', // キーボード入力と鍵盤クリック両方に対応
    eventNames: ['tutorial:keyboard-play', 'tutorial:note-added'], // 両方のイベントで次へ
    highlightKeys: [60, 62, 64, 65, 67, 69, 71] // C4-B4をハイライト（A〜Kキーに対応）
  },
  {
    id: 'mouse-input',
    title: 'クリックで音符を配置してみよう',
    description: 'グリッド上をクリックすると音符が追加されます',
    targetSelector: '[data-tutorial="piano-roll"]',
    position: 'bottom',
    positionOffset: 0.5, // STEP4より右にずらして中央寄り50%の位置
    action: 'custom-event', // tutorial:note-added イベントで次へ
    eventName: 'tutorial:note-added'
  },
  {
    id: 'ai-completion',
    title: 'AI補完を試してみよう',
    description: '承認ボタンを押してください。',
    targetSelector: 'button[data-tutorial="ghost-accept"], button[title*="補完を承認"], button[aria-label*="補完を承認"]',
    position: 'bottom',
    forceVisible: true, // 画面内に必ず表示
    action: 'custom-event', // tutorial:completion-accepted イベントで次へ
    eventName: 'tutorial:completion-accepted'
  },
  {
    id: 'phrase-switch',
    title: 'フレーズの切り替え',
    description: '他のフレーズ候補を試してみましょう',
    targetSelector: 'button[data-tutorial="phrase-switch"], button[title*="フレーズ候補"], button[aria-label*="フレーズ候補"]',
    position: 'bottom',
    positionOffset: 0.3, // 左寄り30%の位置で読みやすく表示
    forceVisible: true, // 画面内に必ず表示
    action: 'custom-event', // tutorial:phrase-switched イベントで次へ
    eventName: 'tutorial:phrase-switched'
  },
  {
    id: 'back-to-arrangement',
    title: 'Arrangementに戻ってみよう',
    description: '全体ビューで他のトラックと合わせて演奏しよう',
    targetSelector: '[data-tutorial="arrangement-tab"]',
    position: 'bottom',
    action: 'custom-event', // tutorial:arrangement-view イベントで次へ
    eventName: 'tutorial:arrangement-view'
  },
  {
    id: 'demo-song',
    title: 'Demo Songを聴いてみよう',
    description: '好きなジャンルから曲を読み込んで再生してみよう',
    targetSelector: '[data-tutorial="demo-songs-button"]',
    position: 'bottom',
    action: 'custom-event', // tutorial:demo-loaded イベントで次へ
    eventName: 'tutorial:demo-loaded'
  },
  {
    id: 'ai-assistant',
    title: 'AIに質問してみよう',
    description: '例：「Cメジャーでメロディを作って」',
    targetSelector: 'button[description="クリックで展開"], [aria-label*="AIアシスタント"], [role="complementary"]',
    position: 'left',
    forceVisible: true, // 画面内に必ず表示
    action: 'custom-event', // tutorial:ai-message-sent イベントで次へ
    eventName: 'tutorial:ai-message-sent'
  }
]

const SimpleTutorial = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [highlightedElement, setHighlightedElement] = useState(null)
  const [popupPosition, setPopupPosition] = useState(null)

  // 現在のステップ情報
  const step = TUTORIAL_STEPS[currentStep]
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1

  // ポップアップの位置を計算（改善版）
  const calculatePopupPosition = useCallback((rect, position) => {
    const popup = { width: 320, height: 140 } // ポップアップの想定サイズ
    const margin = 16 // 要素との距離（視認性向上のため増加）

    let style = {
      position: 'fixed',
      zIndex: 10000
    }

    // positionOffsetを取得（カスタム位置調整）
    const positionOffset = step?.positionOffset ?? 0.5 // デフォルトは中央

    // 位置に応じて配置
    switch (position) {
      case 'top':
        // positionOffsetに基づいて左右位置を調整
        style.left = `${rect.left + rect.width * positionOffset}px`
        style.bottom = `${window.innerHeight - rect.top + margin}px`
        style.transform = 'translateX(-50%)'
        break
      case 'bottom':
        // ピアノロール要素の場合はpositionOffsetを使用、それ以外は中央
        const leftOffset = step?.targetSelector === '[data-tutorial="piano-roll"]' && step?.positionOffset
          ? rect.width * step.positionOffset
          : rect.width / 2
        style.left = `${rect.left + leftOffset}px`
        style.top = `${rect.bottom + margin}px`
        style.transform = 'translateX(-50%)'
        break
      case 'left':
        style.right = `${window.innerWidth - rect.left + margin}px`
        style.top = `${rect.top + rect.height / 2}px`
        style.transform = 'translateY(-50%)'
        break
      case 'right':
        style.left = `${rect.right + margin}px`
        style.top = `${rect.top + rect.height / 2}px`
        style.transform = 'translateY(-50%)'
        break
      default:
        style.left = `${rect.left + rect.width / 2}px`
        style.top = `${rect.bottom + margin}px`
        style.transform = 'translateX(-50%)'
    }

    // 画面外に出ないように調整
    const minMargin = 10
    const maxWidth = window.innerWidth - minMargin * 2
    const maxHeight = window.innerHeight - minMargin * 2

    // forceVisibleオプション: 画面内に必ず表示
    const forceVisible = step?.forceVisible ?? false

    // 左右の調整
    if (style.left) {
      const leftPos = parseFloat(style.left)
      if (style.transform?.includes('translateX(-50%)')) {
        // 中央揃えの場合
        const actualLeft = leftPos - popup.width / 2
        if (actualLeft < minMargin) {
          style.left = `${minMargin + popup.width / 2}px`
        } else if (actualLeft + popup.width > window.innerWidth - minMargin) {
          style.left = `${window.innerWidth - minMargin - popup.width / 2}px`
        }
      } else if (leftPos < minMargin) {
        style.left = `${minMargin}px`
      } else if (leftPos + popup.width > window.innerWidth - minMargin) {
        style.left = `${window.innerWidth - minMargin - popup.width}px`
      }
    }

    // 上下の調整
    if (style.top) {
      const topPos = parseFloat(style.top)
      if (style.transform?.includes('translateY(-50%)')) {
        // 中央揃えの場合
        const actualTop = topPos - popup.height / 2
        if (actualTop < minMargin) {
          style.top = `${minMargin + popup.height / 2}px`
        } else if (actualTop + popup.height > window.innerHeight - minMargin) {
          style.top = `${window.innerHeight - minMargin - popup.height / 2}px`
        }
      } else if (topPos < minMargin) {
        style.top = `${minMargin}px`
      } else if (topPos + popup.height > window.innerHeight - minMargin) {
        style.top = `${window.innerHeight - minMargin - popup.height}px`
      }
    }

    // bottomの調整（forceVisibleの場合は強制的に画面内に収める）
    if (style.bottom) {
      const bottomPos = parseFloat(style.bottom)

      // bottomで計算された位置が画面外になる場合
      const calculatedTop = window.innerHeight - bottomPos - popup.height

      if (forceVisible && calculatedTop < minMargin) {
        // forceVisible=trueの場合、bottomをtopに変換して画面内に収める
        delete style.bottom
        style.top = `${minMargin}px`
        style.transform = 'translateX(-50%)' // 中央揃えを維持
      } else if (bottomPos < minMargin) {
        // 通常の調整
        delete style.bottom
        style.top = `${window.innerHeight - minMargin - popup.height}px`
      }
    }

    return style
  }, [step])

  // ポップアップ位置を更新する関数
  const updatePopupPosition = useCallback((element) => {
    if (!element || !step) return

    const rect = element.getBoundingClientRect()
    const position = calculatePopupPosition(rect, step.position)
    setPopupPosition(position)
  }, [step, calculatePopupPosition])

  // ハイライト対象の要素を取得・設定
  useEffect(() => {
    if (!step || !step.targetSelector) {
      setHighlightedElement(null)
      setPopupPosition(null)
      // チュートリアルのハイライト情報をクリア
      window.tutorialHighlightKeys = null
      return
    }

    // チュートリアルのハイライト情報をグローバルに設定
    window.tutorialHighlightKeys = step.highlightKeys || null

    const element = document.querySelector(step.targetSelector)
    if (element) {
      setHighlightedElement(element)
      element.classList.add('tutorial-highlight')

      // 要素が画面外の場合はスクロール
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      })

      // 初期位置を計算
      updatePopupPosition(element)
    }

    return () => {
      if (element) {
        element.classList.remove('tutorial-highlight')
      }
      // クリーンアップ時にハイライト情報もクリア
      window.tutorialHighlightKeys = null
    }
  }, [step, updatePopupPosition])

  // スクロールやリサイズ時にポップアップ位置を再計算
  useEffect(() => {
    if (!highlightedElement) return

    const handleUpdate = () => {
      updatePopupPosition(highlightedElement)
    }

    // スクロール、リサイズ、タブバーのスクロールを監視
    window.addEventListener('scroll', handleUpdate, true)
    window.addEventListener('resize', handleUpdate)

    // タブバーのスクロールを監視
    const tabBarContainer = document.querySelector('.tab-scroll-container')
    if (tabBarContainer) {
      tabBarContainer.addEventListener('scroll', handleUpdate)
    }

    // 定期的に位置を更新（動的な変更に対応）
    const interval = setInterval(handleUpdate, 100)

    return () => {
      window.removeEventListener('scroll', handleUpdate, true)
      window.removeEventListener('resize', handleUpdate)
      if (tabBarContainer) {
        tabBarContainer.removeEventListener('scroll', handleUpdate)
      }
      clearInterval(interval)
    }
  }, [highlightedElement, updatePopupPosition])

  // カスタムイベントリスナーのセットアップ（複数イベント対応）
  useEffect(() => {
    if (!step || (step.action !== 'custom-event' && step.action !== 'multi-event')) return

    const handleEvent = (eventType) => () => {
      console.log(`Tutorial: Event "${eventType}" received, moving to next step`)
      handleNext()
    }

    // 複数イベント対応
    if (step.action === 'multi-event' && step.eventNames) {
      const listeners = []
      step.eventNames.forEach(eventName => {
        const listener = handleEvent(eventName)
        window.addEventListener(eventName, listener)
        listeners.push({ eventName, listener })
      })

      return () => {
        listeners.forEach(({ eventName, listener }) => {
          window.removeEventListener(eventName, listener)
        })
      }
    }
    // 単一イベント対応（従来通り）
    else if (step.eventName) {
      const listener = handleEvent(step.eventName)
      window.addEventListener(step.eventName, listener)
      return () => {
        window.removeEventListener(step.eventName, listener)
      }
    }
  }, [step, currentStep])

  // 次のステップへ進む
  const handleNext = useCallback(() => {
    if (isLastStep) {
      handleComplete()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }, [isLastStep])

  // 1ステップスキップ（通常のステップ）
  const handleSkipStep = useCallback(() => {
    handleNext()
  }, [handleNext])

  // チュートリアル全体をスキップ（すべてのスキップボタン用）
  const handleSkipTutorial = useCallback(() => {
    setIsVisible(false)
    localStorage.setItem('dawai_tutorial_completed', 'true')
    if (onSkip) onSkip()
  }, [onSkip])

  // チュートリアル完了
  const handleComplete = useCallback(() => {
    setIsVisible(false)
    localStorage.setItem('dawai_tutorial_completed', 'true')
    if (onComplete) onComplete()
  }, [onComplete])

  // チュートリアル全体をスキップ
  const handleSkipAll = useCallback(() => {
    setIsVisible(false)
    localStorage.setItem('dawai_tutorial_completed', 'true')
    if (onSkip) onSkip()
  }, [onSkip])

  // ポップアップのスタイルを取得
  const getPopupStyle = () => {
    // 位置が計算済みの場合はそれを使用
    if (popupPosition) {
      return popupPosition
    }

    // 中央表示（ウェルカムステップ）
    return {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 10000
    }
  }

  if (!isVisible) return null

  return (
    <>
      {/* 半透明背景オーバーレイ（非ブロッキング） */}
      <div className="tutorial-backdrop" />

      {/* チュートリアルポップアップ */}
      <div
        className="tutorial-popup"
        style={getPopupStyle()}
      >
        {/* ヘッダー */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-base font-bold text-gray-800 mb-1">
              {step.title}
            </h3>
            <p className="text-sm text-gray-600">
              {step.description}
            </p>
          </div>
          <button
            onClick={handleSkipAll}
            className="text-gray-400 hover:text-gray-600 ml-2"
            title="チュートリアルを終了"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* プログレスバー */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">
              ステップ {currentStep + 1} / {TUTORIAL_STEPS.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / TUTORIAL_STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex items-center justify-between">
          {step.action === 'button-click' ? (
            <div className="flex items-center justify-between w-full">
              <button
                onClick={handleNext}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
              >
                {isLastStep ? '完了' : 'はじめる'}
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={handleSkipTutorial}
                className="text-gray-400 hover:text-gray-600 text-xs flex items-center gap-1"
              >
                スキップ
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                実際に操作してください
              </span>
              <button
                onClick={handleSkipTutorial}
                className="text-gray-400 hover:text-gray-600 text-xs flex items-center gap-1"
              >
                スキップ
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* 矢印（ターゲット要素への接続線） */}
        {highlightedElement && step.position && (
          <div className={`tutorial-arrow tutorial-arrow-${step.position}`} />
        )}
      </div>
    </>
  )
}

export default SimpleTutorial
