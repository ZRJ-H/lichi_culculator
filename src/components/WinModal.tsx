import { useState, useMemo } from 'react'
import {
  X, Swords, Wind as WindIcon,
  Calculator, ChevronDown, ChevronUp,
  Plus, Minus, Tag,
} from 'lucide-react'
import { useGameStore, calcWinPreview } from '../store'
import type { Wind } from '../store'

// ─── Shared style helpers ──────────────────────────────────────────────────

const WIND_COLOR: Record<Wind, string> = {
  東: 'text-emerald-300',
  南: 'text-sky-300',
  西: 'text-rose-300',
  北: 'text-amber-300',
}

function SectionLabel({ icon, title }: { icon?: React.ReactNode; title: string }) {
  return (
    <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-emerald-500">
      {icon}{title}
    </div>
  )
}

interface RadioCardProps {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
  accent?: string
}
function RadioCard({ selected, onClick, children, accent = 'border-sky-500 bg-sky-900/40' }: RadioCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex-1 rounded-xl border-2 py-2.5 px-1 text-sm font-bold
        transition-all duration-150 active:scale-95
        ${selected ? `${accent} text-white shadow-lg` : 'border-emerald-800 bg-emerald-900/30 text-emerald-300'}
      `}
    >
      {children}
    </button>
  )
}

// ─── Counter widget ─────────────────────────────────────────────────────────

interface CounterProps {
  value: number
  min?: number
  max?: number
  onChange: (n: number) => void
  disabled?: boolean
}
function Counter({ value, min = 0, max = 99, onChange, disabled = false }: CounterProps) {
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

// ─── FuCalculator ──────────────────────────────────────────────────────────

type SpecialHand = 'none' | 'chiitoi' | 'pinfu'
type WaitType   = 'normal' | 'hard'   // normal=両面/双碰  hard=嵌張/辺張/単騎
type PairType   = 'suupai' | 'yakuhai' | 'renfuu'
type BaseType   = 'menzen' | 'other'

interface MeldCounts {
  cm:  number  // 中张 明刻 +2
  ca:  number  // 中张 暗刻 +4
  cmk: number  // 中张 明杠 +8
  cak: number  // 中张 暗杠 +16
  ym:  number  // 幺九 明刻 +4
  ya:  number  // 幺九 暗刻 +8
  ymk: number  // 幺九 明杠 +16
  yak: number  // 幺九 暗杠 +32
}

const MELD_FU: Record<keyof MeldCounts, number> = {
  cm: 2, ca: 4, cmk: 8, cak: 16,
  ym: 4, ya: 8, ymk: 16, yak: 32,
}

// Open-meld keys that are FORBIDDEN when base = 'menzen' (closed hand)
const OPEN_MELD_KEYS: (keyof MeldCounts)[] = ['cm', 'cmk', 'ym', 'ymk']

function calcFuFromInputs(
  special: SpecialHand,
  base: BaseType,
  wait: WaitType,
  pair: PairType,
  melds: MeldCounts,
  isTsumo: boolean,
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

interface FuCalculatorProps {
  isTsumo: boolean
  onApply: (fu: number) => void
}

function FuCalculator({ isTsumo, onApply }: FuCalculatorProps) {
  const [special, setSpecial] = useState<SpecialHand>('none')
  const [base,    setBase]    = useState<BaseType>('menzen')
  const [wait,    setWait]    = useState<WaitType>('normal')
  const [pair,    setPair]    = useState<PairType>('suupai')
  const [melds,   setMelds]   = useState<MeldCounts>({
    cm: 0, ca: 0, cmk: 0, cak: 0, ym: 0, ya: 0, ymk: 0, yak: 0,
  })

  // ── Mutex: base changed ──────────────────────────────────────────────────
  const handleBaseChange = (newBase: BaseType) => {
    setBase(newBase)
    if (newBase === 'menzen') {
      // Close-hand: open melds impossible → zero & lock them
      setMelds((p) => ({ ...p, cm: 0, cmk: 0, ym: 0, ymk: 0 }))
    }
    if (newBase === 'other' && special === 'pinfu') {
      // 副露/非門清: 平和 requires closed hand → unset it
      setSpecial('none')
    }
  }

  const isMenzen  = base === 'menzen'
  const isLocked  = special !== 'none'

  const setMeld   = (key: keyof MeldCounts) => (n: number) =>
    setMelds((p) => ({ ...p, [key]: n }))

  const resultFu  = calcFuFromInputs(special, base, wait, pair, melds, isTsumo)

  // Small toggle button used throughout the calculator
  function TB({
    active, onClick, children,
    color = 'border-sky-500 bg-sky-900/50',
  }: { active: boolean; onClick: () => void; children: React.ReactNode; color?: string }) {
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

  function MeldRow({
    label, meldKey, fuEach, openDisabled,
  }: { label: string; meldKey: keyof MeldCounts; fuEach: number; openDisabled?: boolean }) {
    const disabled = openDisabled || isLocked
    return (
      <div className={`flex items-center justify-between rounded-xl px-3 py-2
        ${disabled ? 'bg-emerald-950/20 opacity-40' : 'bg-emerald-900/40'}`}>
        <span className="flex-1 text-xs font-bold text-emerald-100">
          {label}
          <span className="ml-1.5 text-violet-400">+{fuEach}</span>
        </span>
        <Counter
          value={melds[meldKey]}
          onChange={setMeld(meldKey)}
          disabled={disabled}
        />
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-2xl border border-violet-800 bg-violet-950/30 p-4">

      {/* ── 特殊牌型 ── */}
      <div>
        <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-violet-400">特殊牌型（互斥）</p>
        <div className="flex gap-2">
          <TB
            active={special === 'chiitoi'}
            color="border-violet-500 bg-violet-900/50"
            onClick={() => setSpecial(special === 'chiitoi' ? 'none' : 'chiitoi')}
          >
            七対子<br /><span className="font-normal opacity-70">固定 25符</span>
          </TB>
          <TB
            active={special === 'pinfu'}
            color="border-violet-500 bg-violet-900/50"
            onClick={() => {
              if (special === 'pinfu') { setSpecial('none'); return }
              // 平和 requires 門清 → force menzen base
              setSpecial('pinfu')
              if (base !== 'menzen') handleBaseChange('menzen')
            }}
          >
            平和<br />
            <span className="font-normal opacity-70">{isTsumo ? '自摸 20符' : '荣和 30符'}</span>
          </TB>
        </div>
      </div>

      <div className={`space-y-3 transition-opacity ${isLocked ? 'pointer-events-none opacity-25' : ''}`}>

        {/* ── 底符 ── */}
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-violet-400">底符</p>
          <div className="flex gap-2">
            <TB active={base === 'menzen'} onClick={() => handleBaseChange('menzen')} color="border-sky-500 bg-sky-900/50">
              門前清荣和<br /><span className="font-normal opacity-70">30符</span>
            </TB>
            <TB active={base === 'other'} onClick={() => handleBaseChange('other')} color="border-sky-500 bg-sky-900/50">
              自摸 / 副露荣和<br /><span className="font-normal opacity-70">20符</span>
            </TB>
          </div>
          {isTsumo && <p className="mt-1 text-xs text-sky-600">✦ 自摸加符 +2 已自动计入</p>}
          {isMenzen && (
            <p className="mt-1 text-xs text-amber-700">⚠ 門前清：明刻 / 明杠 已禁用</p>
          )}
        </div>

        {/* ── 听牌型 ── */}
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-violet-400">听牌型</p>
          <div className="flex gap-2">
            <TB active={wait === 'normal'} onClick={() => setWait('normal')} color="border-sky-500 bg-sky-900/50">
              两面 / 双碰<br /><span className="font-normal opacity-70">+0符</span>
            </TB>
            <TB active={wait === 'hard'} onClick={() => setWait('hard')} color="border-sky-500 bg-sky-900/50">
              嵌张 / 边张 / 单骑<br /><span className="font-normal opacity-70">+2符</span>
            </TB>
          </div>
        </div>

        {/* ── 雀头 ── */}
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-violet-400">雀头（对子）</p>
          <div className="flex gap-2">
            <TB active={pair === 'suupai'}  onClick={() => setPair('suupai')}  color="border-sky-500 bg-sky-900/50">数牌/客风<br /><span className="font-normal opacity-70">+0符</span></TB>
            <TB active={pair === 'yakuhai'} onClick={() => setPair('yakuhai')} color="border-sky-500 bg-sky-900/50">役牌<br /><span className="font-normal opacity-70">+2符</span></TB>
            <TB active={pair === 'renfuu'}  onClick={() => setPair('renfuu')}  color="border-sky-500 bg-sky-900/50">连风牌<br /><span className="font-normal opacity-70">+4符</span></TB>
          </div>
        </div>

        {/* ── 面子 · 中张 ── */}
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-violet-400">面子 · 中张（2-8）</p>
          <div className="space-y-1.5">
            <MeldRow label="明刻" meldKey="cm"  fuEach={2}  openDisabled={isMenzen} />
            <MeldRow label="暗刻" meldKey="ca"  fuEach={4} />
            <MeldRow label="明杠" meldKey="cmk" fuEach={8}  openDisabled={isMenzen} />
            <MeldRow label="暗杠" meldKey="cak" fuEach={16} />
          </div>
        </div>

        {/* ── 面子 · 幺九 ── */}
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-violet-400">面子 · 幺九（1, 9, 字牌）</p>
          <div className="space-y-1.5">
            <MeldRow label="明刻" meldKey="ym"  fuEach={4}  openDisabled={isMenzen} />
            <MeldRow label="暗刻" meldKey="ya"  fuEach={8} />
            <MeldRow label="明杠" meldKey="ymk" fuEach={16} openDisabled={isMenzen} />
            <MeldRow label="暗杠" meldKey="yak" fuEach={32} />
          </div>
        </div>
      </div>

      {/* ── Result ── */}
      <div className="flex items-center justify-between rounded-xl bg-violet-900/40 px-4 py-3">
        <div>
          <p className="text-xs text-violet-400">计算结果</p>
          <p className="text-xl font-black text-violet-200">
            {resultFu} <span className="text-sm font-normal">符</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => onApply(resultFu)}
          className="rounded-xl bg-violet-600 px-5 py-2.5 font-bold text-white shadow-md transition-all active:scale-95 hover:bg-violet-500"
        >
          应用并关闭
        </button>
      </div>
    </div>
  )
}

// ─── Main WinModal ──────────────────────────────────────────────────────────

interface WinModalProps {
  onClose: () => void
}

export default function WinModal({ onClose }: WinModalProps) {
  const players    = useGameStore((s) => s.players)
  const roundState = useGameStore((s) => s.roundState)
  const handleWin  = useGameStore((s) => s.handleWin)

  // ── Core selections ──────────────────────────────────────────────────────
  const [winnerId, setWinnerId] = useState<number>(players[0].id)
  const [loserId,  setLoserId]  = useState<number | null>(null)  // null = tsumo

  // ── Han composition ──────────────────────────────────────────────────────
  const [yakuHan, setYakuHan] = useState<number>(1)   // 役種番数 (1-18)
  const [dora,    setDora]    = useState<number>(0)   // 表宝牌 / 拔北
  const [akaDora, setAkaDora] = useState<number>(0)   // 赤宝牌 (max 3)
  const [uraDora, setUraDora] = useState<number>(0)   // 里宝牌

  // ── Fu ───────────────────────────────────────────────────────────────────
  const [fu,          setFu]          = useState<number>(30)
  const [showFuCalc,  setShowFuCalc]  = useState(false)

  // ── Derived ──────────────────────────────────────────────────────────────
  const winner         = players.find((p) => p.id === winnerId)!
  const winnerIsRiichi = winner.isRiichi
  const isTsumo        = loserId === null
  const loserCandidates = players.filter((p) => p.id !== winnerId)

  // Yakuman & above: dora / riichi don't stack in standard rules
  const isYakuman  = yakuHan >= 13
  const riichiHan  = !isYakuman && winnerIsRiichi ? 1 : 0
  const totalDora  = isYakuman ? 0 : dora + akaDora + uraDora
  const totalHan   = yakuHan + riichiHan + totalDora
  const isHighHan  = totalHan >= 5
  const effectiveFu = isHighHan ? 30 : fu

  // ── Live preview ─────────────────────────────────────────────────────────
  const preview = useMemo(
    () => calcWinPreview(players, roundState, winnerId, loserId, totalHan, effectiveFu),
    [players, roundState, winnerId, loserId, totalHan, effectiveFu],
  )

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleWinnerChange = (id: number) => {
    setWinnerId(id)
    if (loserId === id) setLoserId(null)
    // Reset ura dora when winner changes (riichi state may differ)
    setUraDora(0)
  }

  const handleYakuHanChange = (h: number) => {
    setYakuHan(h)
    if (h >= 5) setShowFuCalc(false)
    if (h >= 13) { setDora(0); setAkaDora(0); setUraDora(0) }
  }

  const onConfirm = () => {
    handleWin(winnerId, loserId, totalHan, effectiveFu)
    onClose()
  }

  // ── Han label helpers ─────────────────────────────────────────────────────
  const YAKU_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
  const yakuLabel = (h: number) => {
    if (h >= 14) return `${h - 12}倍\n役満`
    if (h === 13) return '役満'
    return `${h}番`
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border-t border-emerald-700 bg-emerald-950 shadow-2xl">

        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-emerald-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-sky-400" />
            <span className="text-lg font-black tracking-widest text-white">和牌结算</span>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-emerald-500 hover:bg-emerald-800 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* ── 和牌者 ── */}
          <section>
            <SectionLabel icon={<WindIcon className="h-3.5 w-3.5" />} title="和牌者" />
            <div className="flex gap-2">
              {players.map((p) => (
                <RadioCard key={p.id} selected={winnerId === p.id}
                  onClick={() => handleWinnerChange(p.id)} accent="border-sky-500 bg-sky-900/50">
                  <span className={`block text-base ${WIND_COLOR[p.wind]}`}>{p.wind}</span>
                  <span className="block text-xs text-white/80">{p.name}</span>
                </RadioCard>
              ))}
            </div>

            {/* 立直 badge */}
            {winnerIsRiichi && (
              <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-rose-700 bg-rose-950/60 px-3 py-2">
                <Tag className="h-4 w-4 shrink-0 text-rose-400" />
                <span className="text-sm font-bold text-rose-300">
                  已立直
                  <span className="ml-1.5 font-black text-rose-200">自动 +1番</span>
                </span>
                {isTsumo && (
                  <span className="ml-auto rounded-full bg-rose-800/60 px-2 py-0.5 text-xs text-rose-300">
                    自摸立直
                  </span>
                )}
              </div>
            )}
          </section>

          {/* ── 放铳者 / 自摸 ── */}
          <section>
            <SectionLabel title="放铳者 / 自摸" />
            <div className="flex flex-wrap gap-2">
              <RadioCard selected={isTsumo} onClick={() => setLoserId(null)} accent="border-emerald-500 bg-emerald-900/60">
                <span className="block text-base">🀄</span>
                <span className="block text-xs">自摸</span>
              </RadioCard>
              {loserCandidates.map((p) => (
                <RadioCard key={p.id} selected={loserId === p.id}
                  onClick={() => setLoserId(p.id)} accent="border-rose-500 bg-rose-900/50">
                  <span className={`block text-base ${WIND_COLOR[p.wind]}`}>{p.wind}</span>
                  <span className="block text-xs text-white/80">{p.name}</span>
                </RadioCard>
              ))}
            </div>
          </section>

          {/* ── 役種番数 ── */}
          <section>
            <SectionLabel title="役种番数" />
            <div className="flex flex-wrap gap-2">
              {YAKU_OPTIONS.map((h) => (
                <button key={h} type="button" onClick={() => handleYakuHanChange(h)}
                  className={`
                    min-w-[3rem] whitespace-pre-line rounded-xl border-2 py-2 px-2
                    text-center text-xs font-black leading-tight
                    transition-all duration-150 active:scale-95
                    ${yakuHan === h
                      ? 'border-amber-500 bg-amber-900/60 text-amber-200 shadow-md'
                      : h >= 14
                      ? 'border-yellow-900 bg-yellow-950/40 text-yellow-700 hover:border-yellow-700 hover:text-yellow-400'
                      : 'border-emerald-800 bg-emerald-900/30 text-emerald-400'
                    }
                  `}
                >
                  {yakuLabel(h)}
                </button>
              ))}
            </div>
          </section>

          {/* ── 宝牌 (hidden for 役満+) ── */}
          {!isYakuman ? (
            <section>
              <SectionLabel title="宝牌" />
              <div className="space-y-2">
                {/* 表宝牌 / 拔北 */}
                <div className="flex items-center justify-between rounded-xl border border-emerald-800 bg-emerald-900/30 px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-emerald-100">表宝牌 / 拔北 Dora</p>
                    <p className="text-xs text-emerald-600">每张 +1番</p>
                  </div>
                  <Counter value={dora} onChange={setDora} />
                </div>

                {/* 赤宝牌 */}
                <div className="flex items-center justify-between rounded-xl border border-orange-900 bg-orange-950/30 px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-orange-200">赤宝牌 Aka Dora</p>
                    <p className="text-xs text-orange-700">红五万/饼/索，最多 3 张</p>
                  </div>
                  <Counter value={akaDora} max={3} onChange={setAkaDora} />
                </div>

                {/* 里宝牌 — 仅立直时显示 */}
                {winnerIsRiichi && (
                  <div className="flex items-center justify-between rounded-xl border border-rose-900 bg-rose-950/30 px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-rose-200">里宝牌 Ura Dora</p>
                      <p className="text-xs text-rose-800">立直和牌后翻开</p>
                    </div>
                    <Counter value={uraDora} onChange={setUraDora} />
                  </div>
                )}
              </div>
            </section>
          ) : (
            <div className="rounded-xl border border-yellow-900 bg-yellow-950/30 px-4 py-3 text-xs text-yellow-600">
              役満以上：宝牌不计入（基础点固定）
            </div>
          )}

          {/* ── 番数汇总 ── */}
          <section className="rounded-2xl border border-emerald-700 bg-emerald-900/20 px-4 py-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* 役種 */}
              <span className="rounded-lg bg-amber-900/50 px-2.5 py-1 text-sm font-black text-amber-200">
                役种 {yakuHan}番
              </span>
              {!isYakuman && (
                <>
                  {winnerIsRiichi && (
                    <>
                      <span className="text-emerald-700">+</span>
                      <span className="rounded-lg bg-rose-900/50 px-2.5 py-1 text-sm font-black text-rose-300">
                        立直 1番
                      </span>
                    </>
                  )}
                  {totalDora > 0 && (
                    <>
                      <span className="text-emerald-700">+</span>
                      <span className="rounded-lg bg-orange-900/50 px-2.5 py-1 text-sm font-black text-orange-300">
                        宝牌 {totalDora}番
                        {uraDora > 0 && winnerIsRiichi && (
                          <span className="ml-1 text-xs font-normal opacity-70">（含里{uraDora}）</span>
                        )}
                      </span>
                    </>
                  )}
                </>
              )}
              <span className="text-emerald-700">=</span>
              <span className="rounded-lg bg-sky-800/60 px-3 py-1 text-base font-black text-sky-200">
                {totalHan}番
              </span>
              <span className="ml-auto rounded-full bg-amber-800/50 px-3 py-0.5 text-sm font-black text-amber-300">
                {preview.level}
              </span>
            </div>
          </section>

          {/* ── 符数 (hidden when totalHan >= 5) ── */}
          {!isHighHan && (
            <section>
              <SectionLabel title="符数" />
              <div className="flex flex-wrap gap-2">
                {[20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110].map((f) => (
                  <button key={f} type="button" onClick={() => setFu(f)}
                    className={`
                      rounded-xl border-2 py-2 px-3 text-sm font-black
                      transition-all duration-150 active:scale-95
                      ${fu === f
                        ? 'border-violet-500 bg-violet-900/60 text-violet-200 shadow-md'
                        : 'border-emerald-800 bg-emerald-900/30 text-emerald-400'
                      }
                    `}
                  >
                    {f === 25 ? '25符\n七対' : `${f}符`}
                  </button>
                ))}
              </div>

              {/* FuCalc toggle */}
              <button
                type="button"
                onClick={() => setShowFuCalc((v) => !v)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-violet-800 bg-violet-950/30 py-2.5 text-sm font-bold text-violet-400 transition-all hover:bg-violet-900/30 hover:text-violet-200 active:scale-95"
              >
                <Calculator className="h-4 w-4" />
                算符辅助
                {showFuCalc
                  ? <ChevronUp className="h-4 w-4 ml-auto" />
                  : <ChevronDown className="h-4 w-4 ml-auto" />
                }
              </button>

              {showFuCalc && (
                <div className="mt-3">
                  <FuCalculator
                    isTsumo={isTsumo}
                    onApply={(calcedFu) => { setFu(calcedFu); setShowFuCalc(false) }}
                  />
                </div>
              )}
            </section>
          )}

          {/* ── 结算预览 ── */}
          <section className="rounded-2xl border border-emerald-700 bg-emerald-900/30 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-emerald-500">结算预览</p>
            <div className="space-y-1.5">
              {preview.payments.map(({ playerId, delta }) => {
                const p = players.find((pl) => pl.id === playerId)!
                const isWinner = playerId === winnerId
                return (
                  <div key={playerId}
                    className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-sm
                      ${isWinner ? 'bg-sky-900/40 text-sky-200'
                        : delta < 0 ? 'bg-rose-950/40 text-rose-300'
                        : 'bg-emerald-900/20 text-emerald-400'}`}
                  >
                    <span className="font-medium">
                      <span className={`mr-1.5 ${WIND_COLOR[p.wind]}`}>{p.wind}</span>
                      {p.name}
                      {isWinner && <span className="ml-1.5 text-xs text-sky-400">（和牌）</span>}
                    </span>
                    <span className="font-black tabular-nums">
                      {delta > 0 ? '+' : ''}{delta.toLocaleString()}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="mt-3 text-center text-xs text-emerald-600">
              {winner.name} 共获得{' '}
              <span className="font-black text-sky-400">+{preview.winnerTotal.toLocaleString()}</span> 点
              {roundState.riichiPool > 0 && (
                <span className="ml-1 text-amber-500">（含 {roundState.riichiPool} 根立直棒）</span>
              )}
            </p>
          </section>

        </div>

        {/* ── Footer ── */}
        <div className="flex gap-3 border-t border-emerald-800 px-5 py-4">
          <button onClick={onClose}
            className="flex-1 rounded-2xl border-2 border-emerald-700 py-3.5 font-bold text-emerald-400 transition-all active:scale-95 hover:border-emerald-500 hover:text-emerald-200">
            取消
          </button>
          <button onClick={onConfirm}
            className="flex-[2] rounded-2xl bg-sky-600 py-3.5 font-black text-white shadow-lg shadow-sky-900 transition-all active:scale-95 hover:bg-sky-500">
            确认和牌
          </button>
        </div>
      </div>
    </div>
  )
}
