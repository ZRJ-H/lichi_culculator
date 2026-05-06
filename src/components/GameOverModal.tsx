import { Trophy, RefreshCcw } from 'lucide-react'
import { useGameStore } from '../store'
import type { Wind } from '../store'

const WIND_COLOR: Record<Wind, string> = {
  東: 'text-emerald-300',
  南: 'text-sky-300',
  西: 'text-rose-300',
  北: 'text-amber-300',
}

const RANK_STYLE = [
  { bg: 'bg-amber-900/60 border-amber-500', badge: 'bg-amber-500 text-amber-950', label: '1st' },
  { bg: 'bg-slate-800/60 border-slate-500', badge: 'bg-slate-400 text-slate-950', label: '2nd' },
  { bg: 'bg-amber-950/60 border-amber-800', badge: 'bg-amber-800 text-amber-100', label: '3rd' },
  { bg: 'bg-emerald-950/60 border-emerald-800', badge: 'bg-emerald-800 text-emerald-200', label: '4th' },
]

export default function GameOverModal() {
  const players = useGameStore((s) => s.players)
  const gameRule = useGameStore((s) => s.gameRule)
  const roundState = useGameStore((s) => s.roundState)
  const resetGame = useGameStore((s) => s.resetGame)

  const sorted = [...players].sort((a, b) => b.score - a.score)

  const endLabel = gameRule === 'east' ? '東風戦終了' : '半荘終了'
  const roundLabel = `${roundState.wind}${roundState.roundNum}局`

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 px-4 backdrop-blur-md">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-emerald-700 bg-emerald-950 shadow-2xl">

        {/* Header */}
        <div className="bg-gradient-to-b from-emerald-800/60 to-emerald-950 px-6 pt-8 pb-5 text-center">
          <div className="mb-2 flex justify-center">
            <div className="rounded-full bg-amber-500/20 p-3">
              <Trophy className="h-8 w-8 text-amber-400" />
            </div>
          </div>
          <h2 className="text-2xl font-black tracking-widest text-white">対局終了</h2>
          <p className="mt-1 text-sm text-emerald-400">
            {endLabel} · 终于 {roundLabel}
          </p>
        </div>

        {/* Rankings */}
        <div className="space-y-2 px-5 py-4">
          {sorted.map((player, idx) => {
            const style = RANK_STYLE[idx]
            return (
              <div
                key={player.id}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${style.bg}`}
              >
                {/* Rank badge */}
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${style.badge}`}
                >
                  {style.label}
                </span>

                {/* Wind + Name */}
                <div className="min-w-0 flex-1">
                  <span className={`text-lg font-black ${WIND_COLOR[player.wind]}`}>
                    {player.wind}
                  </span>
                  <span className="ml-1.5 text-sm font-medium text-white/80">{player.name}</span>
                </div>

                {/* Score */}
                <span
                  className={`tabular-nums text-xl font-black ${
                    player.score < 0 ? 'text-rose-400' : 'text-white'
                  }`}
                >
                  {player.score.toLocaleString()}
                </span>
              </div>
            )
          })}
        </div>

        {/* New game button */}
        <div className="px-5 pb-6">
          <button
            onClick={resetGame}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 py-4 font-black text-white shadow-lg shadow-emerald-950 transition-all active:scale-95 hover:bg-emerald-600"
          >
            <RefreshCcw className="h-5 w-5" />
            重开新局
          </button>
        </div>
      </div>
    </div>
  )
}
