import { useState } from 'react'
import { Button } from '../ui/button.jsx'
import { ChevronDown, Music } from 'lucide-react'

const InstrumentSelector = ({ 
  currentInstrument, 
  onInstrumentChange,
  trackType = 'piano'
}) => {
  const [isOpen, setIsOpen] = useState(false)

  const instruments = [
    { id: 'piano', name: 'ピアノ', icon: '🎹', category: 'keys' },
    { id: 'synth', name: 'シンセ', icon: '🎛️', category: 'synth' },
    { id: 'bass', name: 'ベース', icon: '🎸', category: 'bass' },
    { id: 'lead', name: 'リード', icon: '🎼', category: 'lead' },
    { id: 'pad', name: 'パッド', icon: '🎵', category: 'pad' },
    { id: 'drums', name: 'ドラム', icon: '🥁', category: 'drums' },
    { id: 'strings', name: 'ストリングス', icon: '🎻', category: 'strings' },
    { id: 'brass', name: 'ブラス', icon: '🎺', category: 'brass' },
    { id: 'woodwind', name: '木管', icon: '🎷', category: 'woodwind' },
    { id: 'fx', name: 'エフェクト', icon: '✨', category: 'fx' }
  ]

  const currentInstrumentData = instruments.find(inst => inst.id === currentInstrument) || instruments[0]

  const handleInstrumentSelect = (instrumentId) => {
    onInstrumentChange(instrumentId)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 h-10 px-3 text-white hover:bg-gray-700"
      >
        <span className="text-lg">{currentInstrumentData.icon}</span>
        <span className="text-sm font-medium">{currentInstrumentData.name}</span>
        <ChevronDown className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50">
          <div className="py-1">
            {instruments.map(inst => (
              <button
                key={inst.id}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-700 flex items-center gap-2 ${
                  inst.id === currentInstrument ? 'bg-gray-700 text-blue-400' : 'text-white'
                }`}
                onClick={() => handleInstrumentSelect(inst.id)}
              >
                <span className="text-lg">{inst.icon}</span>
                <span>{inst.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default InstrumentSelector 