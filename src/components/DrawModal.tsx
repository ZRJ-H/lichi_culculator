import { useState, useMemo } from 'react'
import { X, Waves, AlertTriangle } from 'lucide-react'
import { useGameStore, calcDrawPreview } from '../store'
import type { Wind } from '../store'

const WIND_COLOR: Record<Wind, string> = {
  東: 'text-emerald-300',
  南: 'text-sky-300',
  西: 'text-rose-300',
  北: 'text-amber-300',
}

interface DrawModalProps {
  onClose: () => void
}

export default function DrawModal({ onClose }: DrawModalProps) {
  const players = useGameStore((s) => s.players)
  const roundState = useGameStore((s) => s.roundState)
  const handleDraw = useGameStore((s) => s.handleDraw)

  const [tenpaiIds, setTenpaiIds] = useState<number[]>([])

  const toggleTenpai = (id: number) => {
    setTenpaiIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  // Live payment preview
  const payments = useMemo(
    () => calcDrawPreview(players, tenpaiIds),
    [players, tenpaiIds],
  )

  const tenpaiCount = tenpaiIds.length
  const noMovement = tenpaiCount === 0 || tenpaiCount === 4

  const onConfirmDraw = () => {
    handleDraw(tenpaiIds, false)
    onClose()
  }

  const onAbortive = () => {
    handleDraw([], true)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border-t border-emerald-700 bg-emerald-950 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-emerald-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <Waves className="h-5 w-5 text-amber-400" />
            <span className="text-lg font-black tracking-widest text-white">流局结算</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-emerald-500 transition-colors hover:bg-emerald-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* ── 荒牌平局标题 ── */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-500 mb-1">
              荒牌平局 — 选择听牌玩家
            </p>
            <p className="text-xs text-emerald-600">
              点击卡片切换听牌 / 未听状态，底部将实时预览点数变动
            </p>
          </div>

          {/* ── 玩家听牌开关 ── */}
          <div className="grid grid-cols-2 gap-3">
            {players.map((p) => {
              const isTenpai = tenpaiIds.includes(p.id)
              const pay = payments.find((x) => x.playerId === p.id)!
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleTenpai(p.id)}
                  className={`
                    relative flex flex-col gap-1.5 rounded-2xl border-2 p-4 text-left
                    transition-all duration-200 active:scale-95
                    ${isTenpai
                      ? 'border-sky-500 bg-sky-900/40 shadow-lg shadow-sky-950'
                      : 'border-emerald-800 bg-emerald-900/30'
                    }
                  `}
                >
                  {/* Tenpai badge */}
                  <span
                    className={`
                      absolute right-3 top-3 rounded-full px-2 py-0.5 text-xs font-black tracking-widest
                      ${isTenpai
                        ? 'bg-sky-600 text-white'
                        : 'bg-emerald-900 text-emerald-600'
                      }
                    `}
                  >
                    {isTenpai ? '听牌' : '未听'}
                  </span>

                  <span className={`text-2xl font-black leading-none ${WIND_COLOR[p.wind]}`}>
                    {p.wind}
                  </span>
                  <span className="text-sm font-medium text-white/80">{p.name}</span>

                  {/* Delta preview */}
                  <span
                    className={`text-lg font-black tabular-nums ${
                      pay.delta > 0
                        ? 'text-sky-300'
                        : pay.delta < 0
                        ? 'text-rose-400'
                        : 'text-emerald-600'
                    }`}
                  >
                    {pay.delta > 0 ? '+' : ''}{pay.delta !== 0 ? pay.delta.toLocaleString() : '±0'}
                  </span>
                </button>
              )
            })}
          </div>

          {/* ── 结算预览 ── */}
          <section className="rounded-2xl border border-emerald-700 bg-emerald-900/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-500">
                点数变动预览
              </span>
              <span className="rounded-full bg-amber-900/60 px-3 py-0.5 text-xs font-black text-amber-300">
                {noMovement
                  ? '无点数移动'
                  : `${tenpaiCount} 人听牌`}
              </span>
            </div>

            <div className="space-y-1.5">
              {players.map((p) => {
                const pay = payments.find((x) => x.playerId === p.id)!
                const isTenpai = tenpaiIds.includes(p.id)
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-sm
                      ${isTenpai && pay.delta > 0
                        ? 'bg-sky-900/30 text-sky-200'
                        : !isTenpai && pay.delta < 0
                        ? 'bg-rose-950/40 text-rose-300'
                        : 'bg-emerald-900/20 text-emerald-500'
                      }`}
                  >
                    <span className="font-medium">
                      <span className={`mr-1.5 ${WIND_COLOR[p.wind]}`}>{p.wind}</span>
                      {p.name}
                      <span className="ml-1.5 text-xs opacity-60">
                        {isTenpai ? '（听牌）' : '（未听）'}
                      </span>
                    </span>
                    <span className="font-black tabular-nums">
                      {pay.delta > 0 ? '+' : ''}{pay.delta !== 0 ? pay.delta.toLocaleString() : '±0'}
                    </span>
                  </div>
                )
              })}
            </div>

            {roundState.riichiPool > 0 && (
              <p className="mt-3 text-center text-xs text-amber-600">
                桌面 {roundState.riichiPool} 根立直棒将保留至下一局
              </p>
            )}
          </section>

          {/* ── 分割线 + 途中流局 ── */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-emerald-800" />
            <span className="text-xs font-bold tracking-widest text-emerald-700">途中流局</span>
            <div className="h-px flex-1 bg-emerald-800" />
          </div>

          <button
            type="button"
            onClick={onAbortive}
            className="
              flex w-full items-center justify-center gap-2.5 rounded-2xl
              border-2 border-amber-800 bg-amber-950/40 py-4
              font-bold text-amber-400 transition-all duration-200
              hover:border-amber-600 hover:bg-amber-900/40 hover:text-amber-200
              active:scale-95
            "
          >
            <AlertTriangle className="h-5 w-5" />
            <span>发生途中流局</span>
            <span className="rounded-full bg-amber-900/60 px-2 py-0.5 text-xs">
              不计罚符，本场 +1
            </span>
          </button>

        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-emerald-800 px-5 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl border-2 border-emerald-700 py-3.5 font-bold text-emerald-400 transition-all active:scale-95 hover:border-emerald-500 hover:text-emerald-200"
          >
            取消
          </button>
          <button
            onClick={onConfirmDraw}
            className="flex-[2] rounded-2xl bg-amber-700 py-3.5 font-black text-white shadow-lg shadow-amber-950 transition-all active:scale-95 hover:bg-amber-600"
          >
            确认荒牌平局
          </button>
        </div>
      </div>
    </div>
  )
}
