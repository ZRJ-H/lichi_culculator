import { Calculator, Swords, Coins } from 'lucide-react'

interface Props {
  onNavigate: (screen: 'calculator' | 'game') => void
}

export default function HomeScreen({ onNavigate }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-emerald-950 text-white">
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4">
        {/* Logo + Title */}
        <div className="text-center">
          <div className="mb-3 flex justify-center">
            <Coins className="h-14 w-14 text-amber-400" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-black tracking-[0.15em] text-white">立直麻雀</h1>
          <p className="mt-1 text-sm text-emerald-500">Riichi Mahjong Calculator</p>
        </div>

        {/* Entry cards */}
        <div className="flex w-full max-w-sm flex-col gap-4">
          <button
            onClick={() => onNavigate('calculator')}
            className="flex items-center gap-4 rounded-2xl border-2 border-violet-800 bg-violet-950/40 p-5 text-left transition-all active:scale-95 hover:border-violet-500"
          >
            <div className="rounded-xl bg-violet-700 p-3">
              <Calculator className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-lg font-black tracking-wider text-white">点数计算器</p>
              <p className="mt-0.5 text-xs text-emerald-400">独立计算和牌点数，支持全部场景</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('game')}
            className="flex items-center gap-4 rounded-2xl border-2 border-emerald-800 bg-emerald-900/40 p-5 text-left transition-all active:scale-95 hover:border-emerald-600"
          >
            <div className="rounded-xl bg-emerald-700 p-3">
              <Swords className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-lg font-black tracking-wider text-white">四麻对局</p>
              <p className="mt-0.5 text-xs text-emerald-400">四人麻将分数追踪，完整对局管理</p>
            </div>
          </button>
        </div>
      </div>

      <p className="pb-6 text-center text-xs text-emerald-800">v0.1.0 · 离线使用</p>
    </div>
  )
}
