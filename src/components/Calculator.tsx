import { useState } from 'react'
import {
  ArrowLeft, Calculator, ChevronDown, ChevronUp, Coins,
  Minus, Plus, Hash, BookOpen,
} from 'lucide-react'
import { calcBase, levelLabel, ceil100 } from '../store'
import YakuDictionary from './YakuDictionary'

// ─── Counter ─────────────────────────────────────────────────────────────────

function Counter({ value, min = 0, max = 99, onChange, disabled = false }: {
  value: number; min?: number; max?: number; onChange: (n: number) => void; disabled?: boolean
}) {
  return (
    <div className={`flex items-center gap-2 ${disabled ? 'opacity-30 pointer-events-none' : ''}`}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-800 text-white hover:bg-emerald-700 active:scale-95 transition-all"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-5 text-center text-base font-black tabular-nums text-white">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-white hover:bg-emerald-600 active:scale-95 transition-all"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ─── FuCalculator (simplified — no riichi locking) ──────────────────────────

type SpecialHand = 'none' | 'chiitoi' | 'pinfu'
type WaitType   = 'normal' | 'hard'
type PairType   = 'suupai' | 'yakuhai' | 'renfuu'
type BaseType   = 'menzen' | 'other'

interface MeldCounts {
  cm: number; ca: number; cmk: number; cak: number
  ym: number; ya: number; ymk: number; yak: number
}

const MELD_FU: Record<keyof MeldCounts, number> = {
  cm: 2, ca: 4, cmk: 8, cak: 16,
  ym: 4, ya: 8, ymk: 16, yak: 32,
}

function calcFuFromInputs(
  special: SpecialHand, base: BaseType, wait: WaitType,
  pair: PairType, melds: MeldCounts, isTsumo: boolean,
): number {
  if (special === 'chiitoi') return 25
  if (special === 'pinfu')   return isTsumo ? 20 : 30
  const baseFu  = base === 'menzen' ? 30 : 20
  const tsumoFu = isTsumo ? 2 : 0
  const waitFu  = wait === 'hard' ? 2 : 0
  const pairFu  = pair === 'yakuhai' ? 2 : pair === 'renfuu' ? 4 : 0
  const meldFu  = (Object.keys(melds) as (keyof MeldCounts)[])
    .reduce((s, k) => s + melds[k] * MELD_FU[k], 0)
  return Math.ceil((baseFu + tsumoFu + waitFu + pairFu + meldFu) / 10) * 10
}

function FuCalculator({ onApply }: { onApply: (fu: number) => void }) {
  const [special, setSpecial] = useState<SpecialHand>('none')
  const [base,    setBase]    = useState<BaseType>('menzen')
  const [wait,    setWait]    = useState<WaitType>('normal')
  const [pair,    setPair]    = useState<PairType>('suupai')
  const [isTsumo, setIsTsumo] = useState(true)
  const [melds,   setMelds]   = useState<MeldCounts>({
    cm: 0, ca: 0, cmk: 0, cak: 0, ym: 0, ya: 0, ymk: 0, yak: 0,
  })

  const handleBaseChange = (newBase: BaseType) => {
    setBase(newBase)
    if (newBase === 'menzen') {
      setMelds((p) => ({ ...p, cm: 0, cmk: 0, ym: 0, ymk: 0 }))
    }
    if (newBase === 'other' && special === 'pinfu') {
      setSpecial('none')
    }
  }

  const isMenzen       = base === 'menzen'
  const openMeldLocked = isMenzen
  const isLocked       = special !== 'none'

  const setMeld = (key: keyof MeldCounts) => (n: number) =>
    setMelds((p) => ({ ...p, [key]: n }))

  const resultFu = calcFuFromInputs(special, base, wait, pair, melds, isTsumo)

  function TB({ active, onClick, children, color = 'border-sky-500 bg-sky-900/50' }: {
    active: boolean; onClick: () => void; children: React.ReactNode; color?: string
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex-1 rounded-xl border-2 py-2 px-1.5 text-xs font-bold leading-tight
          transition-all active:scale-95 text-center
          ${active ? `${color} text-white` : 'border-emerald-800 bg-emerald-900/30 text-emerald-400'}`}
      >
        {children}
      </button>
    )
  }

  function MeldRow({ label, meldKey, fuEach, isOpenMeld }: {
    label: string; meldKey: keyof MeldCounts; fuEach: number; isOpenMeld?: boolean
  }) {
    const disabled = (isOpenMeld && openMeldLocked) || isLocked
    return (
      <div className={`flex items-center justify-between rounded-xl px-3 py-2
        ${disabled ? 'bg-emerald-950/20 opacity-40' : 'bg-emerald-900/40'}`}>
        <span className="flex-1 text-xs font-bold text-emerald-100">
          {label}
          <span className="ml-1.5 text-violet-400">+{fuEach}</span>
          {isOpenMeld && openMeldLocked && (
            <span className="ml-1 text-xs text-rose-700">（门清禁用）</span>
          )}
        </span>
        <Counter value={melds[meldKey]} onChange={setMeld(meldKey)} disabled={disabled} />
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-2xl border border-violet-800 bg-violet-950/30 p-4">
      {/* Special hand type */}
      <div className="flex gap-2">
        <TB active={special === 'none'}   onClick={() => setSpecial('none')}   color="border-sky-500 bg-sky-900/50">一般手</TB>
        <TB active={special === 'chiitoi'} onClick={() => setSpecial('chiitoi')} color="border-amber-500 bg-amber-900/50">七対子</TB>
        <TB active={special === 'pinfu'}   onClick={() => setSpecial('pinfu')}   color="border-emerald-500 bg-emerald-900/50">平和</TB>
      </div>

      {special === 'none' && (
        <>
          {/* Base type + Tsumo toggle */}
          <div className="flex gap-2">
            <TB active={base === 'menzen'} onClick={() => handleBaseChange('menzen')} color="border-sky-500 bg-sky-900/50">門前清</TB>
            <TB active={base === 'other'}  onClick={() => handleBaseChange('other')}  color="border-orange-500 bg-orange-900/50">副露</TB>
          </div>

          {/* Tsumo toggle */}
          <div className="flex gap-2">
            <TB active={isTsumo}  onClick={() => setIsTsumo(true)}  color="border-emerald-500 bg-emerald-900/50">自摸 +2</TB>
            <TB active={!isTsumo} onClick={() => setIsTsumo(false)} color="border-slate-500 bg-slate-900/50">荣和</TB>
          </div>

          {/* Wait type */}
          <div className="flex gap-2">
            <TB active={wait === 'normal'} onClick={() => setWait('normal')} color="border-emerald-500 bg-emerald-900/50">両面/双碰</TB>
            <TB active={wait === 'hard'}   onClick={() => setWait('hard')}   color="border-rose-500 bg-rose-900/50">嵌張/辺張/単騎 +2</TB>
          </div>

          {/* Pair type */}
          <div className="flex gap-2">
            <TB active={pair === 'suupai'}  onClick={() => setPair('suupai')}  color="border-emerald-500 bg-emerald-900/50">数牌/客風</TB>
            <TB active={pair === 'yakuhai'} onClick={() => setPair('yakuhai')} color="border-amber-500 bg-amber-900/50">役牌 +2</TB>
            <TB active={pair === 'renfuu'}  onClick={() => setPair('renfuu')}  color="border-rose-500 bg-rose-900/50">連風 +4</TB>
          </div>

          {/* Melds */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase text-emerald-500 tracking-widest px-1">中张牌 (2-8)</p>
            <MeldRow label="明刻" meldKey="cm"  fuEach={2}  isOpenMeld />
            <MeldRow label="暗刻" meldKey="ca"  fuEach={4} />
            <MeldRow label="明杠" meldKey="cmk" fuEach={8}  isOpenMeld />
            <MeldRow label="暗杠" meldKey="cak" fuEach={16} />

            <p className="text-[10px] font-bold uppercase text-emerald-500 tracking-widest px-1 pt-1">幺九牌 (1/9/字)</p>
            <MeldRow label="明刻" meldKey="ym"  fuEach={4}  isOpenMeld />
            <MeldRow label="暗刻" meldKey="ya"  fuEach={8} />
            <MeldRow label="明杠" meldKey="ymk" fuEach={16} isOpenMeld />
            <MeldRow label="暗杠" meldKey="yak" fuEach={32} />
          </div>
        </>
      )}

      {/* Result */}
      <div className="flex items-center justify-between rounded-xl bg-emerald-900/60 px-4 py-3">
        <span className="text-xs text-emerald-400">计算结果</span>
        <span className="text-xl font-black text-white">{resultFu} 符</span>
        <button
          onClick={() => onApply(resultFu)}
          className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-500 active:scale-95 transition-all"
        >
          应用
        </button>
      </div>
    </div>
  )
}

// ─── Han grid helpers ────────────────────────────────────────────────────────

const HAN_NORMAL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const HAN_YAKUMAN = [13, 14, 15, 16, 17, 18]

function hanLabel(h: number): string {
  if (h <= 12) return `${h}番`
  if (h === 13) return '役満'
  return `${h - 12}倍役満`
}

function hanTier(h: number): string {
  if (h <= 4)  return ''
  if (h === 5)  return '満貫'
  if (h <= 7)  return '跳満'
  if (h <= 10) return '倍満'
  if (h <= 12) return '三倍満'
  return ''
}

function hanIdleClass(h: number): string {
  if (h <= 4)  return 'border-emerald-800 bg-emerald-900/30 text-emerald-400 hover:border-emerald-600'
  if (h === 5)  return 'border-amber-900/70 bg-amber-950/30 text-amber-600 hover:border-amber-600'
  if (h <= 7)  return 'border-orange-900/70 bg-orange-950/30 text-orange-600 hover:border-orange-600'
  if (h <= 10) return 'border-rose-900/70 bg-rose-950/30 text-rose-600 hover:border-rose-600'
  if (h <= 12) return 'border-red-900/70 bg-red-950/30 text-red-600 hover:border-red-600'
  return 'border-yellow-900/60 bg-yellow-950/30 text-yellow-700 hover:border-yellow-700'
}

function hanActiveClass(h: number): string {
  if (h <= 4)  return 'border-emerald-400 bg-emerald-700 text-white shadow-md shadow-emerald-950'
  if (h === 5)  return 'border-amber-400 bg-amber-700 text-white shadow-md shadow-amber-950'
  if (h <= 7)  return 'border-orange-400 bg-orange-700 text-white shadow-md shadow-orange-950'
  if (h <= 10) return 'border-rose-400 bg-rose-700 text-white shadow-md shadow-rose-950'
  if (h <= 12) return 'border-red-400 bg-red-800 text-white shadow-md shadow-red-950'
  return 'border-yellow-400 bg-yellow-700 text-white shadow-md shadow-yellow-950'
}

// ─── Scenario card ───────────────────────────────────────────────────────────

function ScenarioCard({ title, dealer, tsumo, children, color }: {
  title: string; dealer: boolean; tsumo: boolean; children: React.ReactNode
  color: 'amber' | 'sky'
}) {
  const border  = color === 'amber' ? 'border-amber-800 bg-amber-950/25' : 'border-sky-800 bg-sky-950/25'
  const badge   = color === 'amber' ? 'bg-amber-900 text-amber-200' : 'bg-sky-900 text-sky-200'
  const dot     = color === 'amber' ? 'bg-amber-400' : 'bg-sky-400'
  return (
    <div className={`rounded-2xl border ${border} p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`h-2.5 w-2.5 rounded-full ${dot}`} />
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${badge}`}>
          {dealer ? '親' : '子'} {tsumo ? 'ツモ' : 'ロン'}
        </span>
        <span className="text-sm font-bold text-white">{title}</span>
      </div>
      <div className="space-y-1 text-sm">{children}</div>
    </div>
  )
}

// ─── Main Calculator ─────────────────────────────────────────────────────────

interface Props {
  onBack: () => void
}

export default function CalculatorView({ onBack }: Props) {
  const [han, setHan] = useState(1)
  const [fu, setFu] = useState(30)
  const [honba, setHonba] = useState(0)
  const [showFuCalc, setShowFuCalc] = useState(false)
  const [showYakuDict, setShowYakuDict] = useState(false)

  // Use han>=5 to gate fu visibility; base calculation uses effective fu
  const highHan = han >= 5
  const effectiveFu = highHan ? 30 : fu
  const base = calcBase(han, effectiveFu)
  const level = levelLabel(han, effectiveFu)

  // ── Compute 4 scenarios ───────────────────────────────────────

  // Dealer tsumo: each non-dealer pays ceil100(base*2) + honba*100
  const dealerTsumoPer = ceil100(base * 2) + honba * 100
  const dealerTsumoTotal = dealerTsumoPer * 3

  // Dealer ron: loser pays ceil100(base*6) + honba*300
  const dealerRonPay = ceil100(base * 6) + honba * 300

  // Non-dealer tsumo: dealer pays ceil100(base*2)+honba*100, others ceil100(base)+honba*100
  const nonDealerTsumoDealerPay = ceil100(base * 2) + honba * 100
  const nonDealerTsumoOtherPay = ceil100(base) + honba * 100
  const nonDealerTsumoTotal = nonDealerTsumoDealerPay + nonDealerTsumoOtherPay * 2

  // Non-dealer ron: loser pays ceil100(base*4) + honba*300
  const nonDealerRonPay = ceil100(base * 4) + honba * 300

  return (
    <div className="flex min-h-screen flex-col bg-emerald-950 text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-emerald-800 bg-emerald-950/90 px-3 py-3 backdrop-blur-sm">
        <button
          onClick={onBack}
          className="rounded-lg p-1.5 text-emerald-500 hover:bg-emerald-800 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-emerald-400" />
          <span className="text-base font-bold tracking-widest text-emerald-100">点数计算器</span>
        </div>
        <button
          onClick={() => setShowYakuDict(true)}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-violet-400 hover:bg-violet-900/40 transition-colors"
        >
          <BookOpen className="h-3.5 w-3.5" />
          役種
        </button>
      </header>

      {/* Body */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-8 space-y-5">
        {/* Current level badge */}
        <div className="flex items-center justify-center gap-3 rounded-xl bg-emerald-900/40 px-4 py-2.5">
          <span className="text-sm text-emerald-400">已选</span>
          <span className="text-base font-black text-white">{hanLabel(han)}</span>
          {!highHan && (
            <>
              <span className="text-emerald-700">|</span>
              <span className="text-base font-black text-white">{fu}符</span>
            </>
          )}
          <span className="text-emerald-700">|</span>
          <span className={`text-base font-black ${han >= 13 ? 'text-yellow-400' : 'text-emerald-200'}`}>
            {level}
          </span>
        </div>

        {/* Han selector */}
        <section>
          <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-emerald-500">
            <Hash className="h-3.5 w-3.5" />
            最终总番数
          </h3>
          <div className="grid grid-cols-4 gap-1.5 mb-1.5">
            {HAN_NORMAL.map((h) => (
              <button
                key={h}
                onClick={() => { setHan(h); setShowFuCalc(false) }}
                className={`rounded-xl border-2 py-2.5 text-center text-sm font-bold transition-all active:scale-95
                  ${han === h ? hanActiveClass(h) : hanIdleClass(h)}`}
              >
                <div>{hanLabel(h)}</div>
                {hanTier(h) && <div className="text-[10px] opacity-70 mt-0.5">{hanTier(h)}</div>}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {HAN_YAKUMAN.map((h) => (
              <button
                key={h}
                onClick={() => { setHan(h); setShowFuCalc(false) }}
                className={`rounded-xl border-2 py-2.5 text-center text-sm font-bold transition-all active:scale-95
                  ${han === h ? hanActiveClass(h) : hanIdleClass(h)}`}
              >
                {hanLabel(h)}
              </button>
            ))}
          </div>
        </section>

        {/* Fu selector (only when han <= 4) */}
        {!highHan && (
          <section>
            <h3 className="mb-2.5 text-xs font-bold uppercase tracking-widest text-emerald-500">符数</h3>
            <div className="grid grid-cols-6 gap-1.5">
              {[20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110].map((f) => (
                <button
                  key={f}
                  onClick={() => setFu(f)}
                  className={`rounded-xl border-2 py-2.5 text-center text-sm font-bold transition-all active:scale-95
                    ${fu === f
                      ? 'border-violet-400 bg-violet-700 text-white shadow-md shadow-violet-950'
                      : 'border-emerald-800 bg-emerald-900/30 text-emerald-400 hover:border-emerald-600'
                    }`}
                >
                  {f === 25 ? (
                    <>
                      <div>25</div>
                      <div className="text-[9px] opacity-60 mt-0.5">七対</div>
                    </>
                  ) : (
                    f
                  )}
                </button>
              ))}
            </div>

            {/* Fu calculator toggle */}
            <button
              onClick={() => setShowFuCalc(!showFuCalc)}
              className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border-2 py-2.5 text-xs font-bold transition-all
                ${showFuCalc
                  ? 'border-violet-500 bg-violet-900/30 text-violet-300'
                  : 'border-emerald-800 bg-emerald-900/20 text-emerald-500 hover:border-emerald-600'
                }`}
            >
              算符辅助
              {showFuCalc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {showFuCalc && (
              <div className="mt-2">
                <FuCalculator onApply={(f) => { setFu(f); setShowFuCalc(false) }} />
              </div>
            )}
          </section>
        )}

        {/* Honba counter */}
        <section className="flex items-center justify-between rounded-xl bg-emerald-900/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-bold text-emerald-300">本場数</span>
          </div>
          <Counter value={honba} max={99} onChange={setHonba} />
        </section>

        {/* Results — 4 scenario cards */}
        <section>
          <h3 className="mb-2.5 text-xs font-bold uppercase tracking-widest text-emerald-500">结算结果</h3>
          <div className="space-y-3">
            {/* Dealer tsumo */}
            <ScenarioCard title="庄家自摸和了" dealer tsumo color="amber">
              <p className="text-emerald-400">
                各家支付 <span className="font-bold text-white">{dealerTsumoPer.toLocaleString()} 点</span>
              </p>
              <p className="text-amber-300 font-bold">
                和牌者总计获得 {dealerTsumoTotal.toLocaleString()} 点
              </p>
            </ScenarioCard>

            {/* Dealer ron */}
            <ScenarioCard title="庄家荣和" dealer tsumo={false} color="amber">
              <p className="text-emerald-400">
                放铳者支付 <span className="font-bold text-rose-400">{dealerRonPay.toLocaleString()} 点</span>
              </p>
            </ScenarioCard>

            {/* Non-dealer tsumo */}
            <ScenarioCard title="子家自摸和了" dealer={false} tsumo color="sky">
              <p className="text-emerald-400">
                庄家支付 <span className="font-bold text-white">{nonDealerTsumoDealerPay.toLocaleString()} 点</span>
              </p>
              <p className="text-emerald-400">
                其他子家各付 <span className="font-bold text-white">{nonDealerTsumoOtherPay.toLocaleString()} 点</span>
              </p>
              <p className="text-sky-300 font-bold">
                和牌者总计获得 {nonDealerTsumoTotal.toLocaleString()} 点
              </p>
            </ScenarioCard>

            {/* Non-dealer ron */}
            <ScenarioCard title="子家荣和" dealer={false} tsumo={false} color="sky">
              <p className="text-emerald-400">
                放铳者支付 <span className="font-bold text-rose-400">{nonDealerRonPay.toLocaleString()} 点</span>
              </p>
            </ScenarioCard>
          </div>
        </section>
      </main>

      {/* Yaku dictionary overlay */}
      {showYakuDict && <YakuDictionary onClose={() => setShowYakuDict(false)} />}
    </div>
  )
}
