import { useState } from 'react'
import { Coins, RotateCcw, Trophy, Waves } from 'lucide-react'
import { useGameStore } from './store'
import type { Player, Wind, GameRule } from './store'
import WinModal from './components/WinModal'
import DrawModal from './components/DrawModal'
import GameOverModal from './components/GameOverModal'

const WIND_COLOR: Record<Wind, string> = {
  東: 'text-emerald-300',
  南: 'text-sky-300',
  西: 'text-rose-300',
  北: 'text-amber-300',
}

function PlayerCard({ player }: { player: Player }) {
  const declareRiichi = useGameStore((s) => s.declareRiichi)

  return (
    <div
      className={`
        relative flex flex-col justify-between rounded-2xl border p-4
        ${player.isRiichi
          ? 'border-rose-500 bg-rose-950/60 shadow-lg shadow-rose-900/50'
          : 'border-emerald-800 bg-emerald-900/40'
        }
        transition-all duration-300
      `}
    >
      <div className="flex items-center justify-between">
        <span className={`text-3xl font-black leading-none ${WIND_COLOR[player.wind]}`}>
          {player.wind}
        </span>
        {player.isRiichi && (
          <span className="rounded-full bg-rose-600 px-2 py-0.5 text-xs font-bold tracking-widest text-white">
            立直中
          </span>
        )}
      </div>

      <p className="mt-1 text-sm font-medium text-emerald-400 tracking-wide">{player.name}</p>

      <p className={`my-3 text-center text-5xl font-black tabular-nums drop-shadow-lg
        ${player.score < 0 ? 'text-rose-400' : 'text-white'}`}>
        {player.score.toLocaleString()}
      </p>

      <button
        onClick={() => declareRiichi(player.id)}
        disabled={player.isRiichi}
        className={`
          w-full rounded-xl py-3 text-base font-bold tracking-widest transition-all duration-200
          ${player.isRiichi
            ? 'cursor-not-allowed bg-rose-900/50 text-rose-400 opacity-60'
            : 'bg-rose-600 text-white shadow-md shadow-rose-900 active:scale-95 hover:bg-rose-500'
          }
        `}
      >
        {player.isRiichi ? '已立直' : '立　直'}
      </button>
    </div>
  )
}

// ── Rule toggle ──────────────────────────────────────────────────────────────

const RULE_OPTIONS: { value: GameRule; label: string }[] = [
  { value: 'east', label: '東風' },
  { value: 'south', label: '半荘' },
]

function RuleToggle() {
  const gameRule = useGameStore((s) => s.gameRule)
  const setGameRule = useGameStore((s) => s.setGameRule)
  const history = useGameStore((s) => s.history)
  const isStarted = history.length > 0

  return (
    <div className="flex overflow-hidden rounded-xl border border-emerald-800">
      {RULE_OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => {
            if (isStarted && gameRule !== value) {
              if (!confirm('切换规则将重置对局，确定吗？')) return
            }
            setGameRule(value)
          }}
          className={`px-3 py-1.5 text-xs font-bold transition-all
            ${gameRule === value
              ? 'bg-emerald-700 text-white'
              : 'bg-transparent text-emerald-600 hover:text-emerald-300'
            }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// ── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const roundState = useGameStore((s) => s.roundState)
  const players = useGameStore((s) => s.players)
  const undoLast = useGameStore((s) => s.undoLast)
  const isGameOver = useGameStore((s) => s.isGameOver)
  const [showWinModal, setShowWinModal] = useState(false)
  const [showDrawModal, setShowDrawModal] = useState(false)

  const roundLabel = `${roundState.wind}${roundState.roundNum}局`
  const honbaLabel = `${roundState.honba}本場`

  return (
    <div className="flex min-h-screen flex-col bg-emerald-950 text-white">

      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-emerald-800 bg-emerald-950/90 px-4 py-3 backdrop-blur-sm">
        {/* Left: rule toggle */}
        <RuleToggle />

        {/* Center: round info */}
        <div className="flex flex-col items-center">
          <span className="text-xl font-black tracking-widest text-emerald-100">{roundLabel}</span>
          <span className="text-xs text-emerald-400 tracking-wider">{honbaLabel}</span>
        </div>

        {/* Right: riichi pool */}
        <div className="flex w-20 items-center justify-end gap-1.5">
          <Coins className="h-4 w-4 text-amber-400" strokeWidth={2.5} />
          <span className="text-base font-bold text-amber-300">{roundState.riichiPool}</span>
          <span className="text-xs text-emerald-500">棒</span>
        </div>
      </header>

      {/* Player grid */}
      <main className="flex-1 grid grid-cols-2 gap-3 p-3 pb-28">
        {players.map((player) => (
          <PlayerCard key={player.id} player={player} />
        ))}
      </main>

      {/* Bottom floating action bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-10 flex gap-2 border-t border-emerald-800 bg-emerald-950/95 px-3 py-3 backdrop-blur-sm">
        <button
          className="flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl bg-sky-700 py-3 font-bold text-white shadow-md shadow-sky-900 transition-all active:scale-95 hover:bg-sky-600"
          onClick={() => setShowWinModal(true)}
        >
          <Trophy className="h-5 w-5" strokeWidth={2.5} />
          <span className="text-sm tracking-widest">和　牌</span>
        </button>

        <button
          className="flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl bg-amber-700 py-3 font-bold text-white shadow-md shadow-amber-900 transition-all active:scale-95 hover:bg-amber-600"
          onClick={() => setShowDrawModal(true)}
        >
          <Waves className="h-5 w-5" strokeWidth={2.5} />
          <span className="text-sm tracking-widest">流　局</span>
        </button>

        <button
          className="flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl bg-slate-700 py-3 font-bold text-white shadow-md shadow-slate-900 transition-all active:scale-95 hover:bg-slate-600"
          onClick={undoLast}
        >
          <RotateCcw className="h-5 w-5" strokeWidth={2.5} />
          <span className="text-sm tracking-widest">撤　销</span>
        </button>
      </footer>

      {/* Modals */}
      {showWinModal && <WinModal onClose={() => setShowWinModal(false)} />}
      {showDrawModal && <DrawModal onClose={() => setShowDrawModal(false)} />}
      {isGameOver && <GameOverModal />}
    </div>
  )
}
