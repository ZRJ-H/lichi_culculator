import { useState, useMemo } from 'react'
import {
  X, Swords, Wind as WindIcon,
  Calculator, ChevronDown, ChevronUp,
  Plus, Minus, BookOpen,
} from 'lucide-react'
import { useGameStore, calcWinPreview } from '../store'
import type { Wind } from '../store'
import YakuDictionary from './YakuDictionary'

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
type PairType   = 'chuuchan' | 'honour' | 'renfuu'
// chuuchan = 中张数牌(2-8)/客风 → +0
// honour   = 幺九数牌(1/9)/役牌(三元/场风/自风) → +2
// renfuu   = 连风(场风+自风) → +4
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
  const pairFu  = pair === 'honour' ? 2 : pair === 'renfuu' ? 4 : 0
  const meldFu  = (Object.keys(melds) as (keyof MeldCounts)[])
    .reduce((s, k) => s + melds[k] * MELD_FU[k], 0)

  return Math.ceil((baseFu + tsumoFu + waitFu + pairFu + meldFu) / 10) * 10
}

interface FuCalculatorProps {
  isTsumo: boolean
  isRiichi: boolean   // Fix 1: riichi forces menzen & locks open melds
  onApply: (fu: number) => void
}

function FuCalculator({ isTsumo, isRiichi, onApply }: FuCalculatorProps) {
  const [special, setSpecial] = useState<SpecialHand>('none')
  // Riichi always implies 門前清 — initialise accordingly and lock
  const [base,    setBase]    = useState<BaseType>('menzen')
  const [wait,    setWait]    = useState<WaitType>('normal')
  const [pair,    setPair]    = useState<PairType>('chuuchan')
  const [melds,   setMelds]   = useState<MeldCounts>({
    cm: 0, ca: 0, cmk: 0, cak: 0, ym: 0, ya: 0, ymk: 0, yak: 0,
  })

  // ── Mutex: base changed ──────────────────────────────────────────────────
  const handleBaseChange = (newBase: BaseType) => {
    // Riichi hand is always closed — cannot switch to 'other'
    if (isRiichi && newBase === 'other') return
    setBase(newBase)
    if (newBase === 'menzen') {
      setMelds((p) => ({ ...p, cm: 0, cmk: 0, ym: 0, ymk: 0 }))
    }
    if (newBase === 'other' && special === 'pinfu') {
      setSpecial('none')
    }
  }

  // Open melds are impossible when the hand is closed (門前清 or Riichi)
  const isMenzen       = base === 'menzen'
  const openMeldLocked = isMenzen || isRiichi
  // 七対子: all fu sections disabled (fixed 25fu). 平和: only melds disabled (all sequences).
  const isChiitoi      = special === 'chiitoi'
  const isPinfu        = special === 'pinfu'
  const sectionLocked  = isChiitoi
  const meldsLocked    = isChiitoi || isPinfu

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
    label, meldKey, fuEach, isOpenMeld,
  }: { label: string; meldKey: keyof MeldCounts; fuEach: number; isOpenMeld?: boolean }) {
    // Open melds (明刻/明杠) are disabled when the hand is closed or riichi
    const disabled = (isOpenMeld && openMeldLocked) || meldsLocked
    return (
      <div className={`flex items-center justify-between rounded-xl px-3 py-2
        ${disabled ? 'bg-emerald-950/20 opacity-40' : 'bg-emerald-900/40'}`}>
        <span className="flex-1 text-xs font-bold text-emerald-100">
          {label}
          <span className="ml-1.5 text-violet-400">+{fuEach}</span>
          {isOpenMeld && openMeldLocked && (
            <span className="ml-1 text-xs text-rose-700">（门清/立直禁用）</span>
          )}
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
        <div className="grid grid-cols-2 gap-2">
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
              setSpecial('pinfu')
              if (base !== 'menzen') handleBaseChange('menzen')
            }}
          >
            平和<br /><span className="font-normal opacity-70">自摸 20符 / 荣和 30符</span>
          </TB>
        </div>
      </div>

      {/* ── 当前模式 ── */}
      <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold
        ${isTsumo ? 'bg-sky-900/40 text-sky-300' : 'bg-emerald-900/40 text-emerald-300'}`}>
        <span className="text-sm">{isTsumo ? '自摸' : '荣和'}</span>
        <span>{isPinfu ? '（平和不计自摸+2符）' : isTsumo ? '（+2符）' : '（+0符）'}</span>
        <span className="ml-auto text-[10px] opacity-60">由外部分配</span>
      </div>

      <div className={`space-y-3 transition-opacity ${sectionLocked ? 'pointer-events-none opacity-25' : ''}`}>

        {/* ── 底符 ── */}
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-violet-400">底符</p>
          <div className="grid grid-cols-2 gap-2">
            <TB active={base === 'menzen'} onClick={() => handleBaseChange('menzen')} color="border-sky-500 bg-sky-900/50">
              門前清<br /><span className="font-normal opacity-70">30符</span>
            </TB>
            <div className={isRiichi ? 'opacity-30 pointer-events-none' : ''}>
              <TB active={base === 'other'} onClick={() => handleBaseChange('other')} color="border-orange-500 bg-orange-900/50">
                副露<br /><span className="font-normal opacity-70">20符</span>
              </TB>
            </div>
          </div>
          {isRiichi && (
            <p className="mt-1 text-xs text-rose-700">🔒 立直必须门前清，副露已锁定</p>
          )}
          {openMeldLocked && !isRiichi && (
            <p className="mt-1 text-xs text-amber-700">⚠ 門前清：明刻 / 明杠 已禁用</p>
          )}
        </div>

        {/* ── 听牌型 ── */}
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-violet-400">听牌型</p>
          <div className="grid grid-cols-2 gap-2">
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
          <div className="grid grid-cols-3 gap-2">
            <TB active={pair === 'chuuchan'} onClick={() => setPair('chuuchan')} color="border-sky-500 bg-sky-900/50">中张数牌(2-8)/客风<br /><span className="font-normal opacity-70">+0符</span></TB>
            <TB active={pair === 'honour'}   onClick={() => setPair('honour')}   color="border-amber-500 bg-amber-900/50">幺九数牌(1/9)/役牌<br /><span className="font-normal opacity-70">+2符</span></TB>
            <TB active={pair === 'renfuu'}   onClick={() => setPair('renfuu')}   color="border-rose-500 bg-rose-900/50">连风牌<br /><span className="font-normal opacity-70">+4符</span></TB>
          </div>
        </div>

        {/* ── 面子 · 中张 ── */}
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-violet-400">面子 · 中张（2-8）</p>
          <div className="space-y-1.5">
            <MeldRow label="明刻" meldKey="cm"  fuEach={2}  isOpenMeld />
            <MeldRow label="暗刻" meldKey="ca"  fuEach={4} />
            <MeldRow label="明杠" meldKey="cmk" fuEach={8}  isOpenMeld />
            <MeldRow label="暗杠" meldKey="cak" fuEach={16} />
          </div>
        </div>

        {/* ── 面子 · 幺九 ── */}
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-violet-400">面子 · 幺九（1, 9, 字牌）</p>
          <div className="space-y-1.5">
            <MeldRow label="明刻" meldKey="ym"  fuEach={4}  isOpenMeld />
            <MeldRow label="暗刻" meldKey="ya"  fuEach={8} />
            <MeldRow label="明杠" meldKey="ymk" fuEach={16} isOpenMeld />
            <MeldRow label="暗杠" meldKey="yak" fuEach={32} />
          </div>
        </div>
      </div>

      {/* ── Result ── */}
      <div className="flex flex-col gap-2 rounded-xl bg-violet-900/40 px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-violet-400">计算结果</p>
          <button
            type="button"
            onClick={() => onApply(resultFu)}
            className="rounded-xl bg-violet-600 px-5 py-2.5 font-bold text-white shadow-md transition-all active:scale-95 hover:bg-violet-500"
          >
            应用并关闭
          </button>
        </div>
        <p className="text-xs text-violet-500">
          20(底符)
          {base === 'menzen' ? ' + 10(門前)' : ''}
          {isTsumo ? ' + 2(自摸)' : ''}
          {wait === 'hard' ? ' + 2(嵌張/辺張/単騎)' : ''}
          {pair === 'honour' ? ' + 2(幺九/役牌雀頭)' : pair === 'renfuu' ? ' + 4(連風雀頭)' : ''}
          {(Object.keys(melds) as (keyof MeldCounts)[]).filter(k => melds[k] > 0).map(k => ` + ${melds[k] * MELD_FU[k]}(${k})`).join('')}
          {' = '}{resultFu} 符
        </p>
      </div>
    </div>
  )
}

// ─── Han button helpers ─────────────────────────────────────────────────────

const HAN_NORMAL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const HAN_YAKUMAN = [13, 14, 15, 16, 17, 18]

function hanLabel(h: number): string {
  if (h <= 12) return `${h}番`
  if (h === 13) return '役満'
  return `${h - 12}倍役満`
}

/** Small sub-label showing the mangan tier name */
function hanTier(h: number): string {
  if (h <= 4)  return ''
  if (h === 5)  return '満貫'
  if (h <= 7)  return '跳満'
  if (h <= 10) return '倍満'
  if (h <= 12) return '三倍満'
  return ''
}

/** Tailwind classes for the button (inactive state) */
function hanIdleClass(h: number): string {
  if (h <= 4)  return 'border-emerald-800 bg-emerald-900/30 text-emerald-400 hover:border-emerald-600 hover:text-emerald-200'
  if (h === 5)  return 'border-amber-900/70 bg-amber-950/30 text-amber-600 hover:border-amber-600 hover:text-amber-300'
  if (h <= 7)  return 'border-orange-900/70 bg-orange-950/30 text-orange-600 hover:border-orange-600 hover:text-orange-300'
  if (h <= 10) return 'border-rose-900/70 bg-rose-950/30 text-rose-600 hover:border-rose-600 hover:text-rose-300'
  if (h <= 12) return 'border-red-900/70 bg-red-950/30 text-red-600 hover:border-red-600 hover:text-red-300'
  return 'border-yellow-900/60 bg-yellow-950/30 text-yellow-700 hover:border-yellow-700 hover:text-yellow-400'
}

/** Tailwind classes for the button (active/selected state) */
function hanActiveClass(h: number): string {
  if (h <= 4)  return 'border-emerald-400 bg-emerald-700 text-white shadow-md shadow-emerald-950'
  if (h === 5)  return 'border-amber-400 bg-amber-700 text-white shadow-md shadow-amber-950'
  if (h <= 7)  return 'border-orange-400 bg-orange-700 text-white shadow-md shadow-orange-950'
  if (h <= 10) return 'border-rose-400 bg-rose-700 text-white shadow-md shadow-rose-950'
  if (h <= 12) return 'border-red-400 bg-red-800 text-white shadow-md shadow-red-950'
  return 'border-yellow-400 bg-yellow-700 text-white shadow-md shadow-yellow-950'
}

// ─── Main WinModal ──────────────────────────────────────────────────────────

interface WinModalProps {
  onClose: () => void
}

export default function WinModal({ onClose }: WinModalProps) {
  const players    = useGameStore((s) => s.players)
  const roundState = useGameStore((s) => s.roundState)
  const handleWin  = useGameStore((s) => s.handleWin)

  // ── Selections ───────────────────────────────────────────────────────────
  const [winnerId, setWinnerId] = useState<number>(players[0].id)
  const [loserId,  setLoserId]  = useState<number | null>(null)

  // ── Total han (player inputs the final number directly) ──────────────────
  const [han, setHan] = useState<number>(1)

  // ── Fu ───────────────────────────────────────────────────────────────────
  const [fu,          setFu]          = useState<number>(30)
  const [showFuCalc,  setShowFuCalc]  = useState(false)
  const [showYakuDict, setShowYakuDict] = useState(false)

  // ── Derived ──────────────────────────────────────────────────────────────
  const winner         = players.find((p) => p.id === winnerId)!
  const winnerIsRiichi = winner.isRiichi
  const isTsumo        = loserId === null
  const loserCandidates = players.filter((p) => p.id !== winnerId)

  const isHighHan  = han >= 5
  const isYakuman  = han >= 13
  const effectiveFu = isHighHan ? 30 : fu

  // ── Live preview ─────────────────────────────────────────────────────────
  const preview = useMemo(
    () => calcWinPreview(players, roundState, winnerId, loserId, han, effectiveFu),
    [players, roundState, winnerId, loserId, han, effectiveFu],
  )

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleWinnerChange = (id: number) => {
    setWinnerId(id)
    if (loserId === id) setLoserId(null)
    setShowFuCalc(false)
  }

  const selectHan = (h: number) => {
    setHan(h)
    setShowFuCalc(false)
  }

  const onConfirm = () => {
    handleWin(winnerId, loserId, han, effectiveFu)
    onClose()
  }

  return (
    <>
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
              {winnerIsRiichi && (
                <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-rose-800 bg-rose-950/50 px-3 py-2">
                  <span className="text-rose-400">🀄</span>
                  <span className="text-sm font-bold text-rose-300">
                    已立直 — 番数中请自行计入立直 / 里宝牌
                  </span>
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

            {/* ── 最终总番数 ── */}
            <section>
              {/* Section header with dictionary button */}
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-emerald-500">
                  <span>最终总番数</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowYakuDict(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-700 bg-emerald-900/40 px-2.5 py-1.5 text-xs font-bold text-emerald-400 transition-all hover:border-emerald-500 hover:text-emerald-200 active:scale-95"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  役种速查表
                </button>
              </div>

              {/* 1–4番 grid */}
              <div className="mb-1.5 grid grid-cols-4 gap-1.5">
                {HAN_NORMAL.slice(0, 4).map((h) => (
                  <button key={h} type="button" onClick={() => selectHan(h)}
                    className={`rounded-xl border-2 py-3 text-sm font-black transition-all active:scale-95
                      ${han === h ? hanActiveClass(h) : hanIdleClass(h)}`}
                  >
                    {hanLabel(h)}
                  </button>
                ))}
              </div>

              {/* 5–12番 grid (2 rows × 4) */}
              <div className="mb-1.5 grid grid-cols-4 gap-1.5">
                {HAN_NORMAL.slice(4).map((h) => (
                  <button key={h} type="button" onClick={() => selectHan(h)}
                    className={`flex flex-col items-center justify-center rounded-xl border-2 py-2.5 transition-all active:scale-95
                      ${han === h ? hanActiveClass(h) : hanIdleClass(h)}`}
                  >
                    <span className="text-sm font-black leading-none">{hanLabel(h)}</span>
                    {hanTier(h) && (
                      <span className={`mt-0.5 text-[10px] font-bold leading-none opacity-70`}>
                        {hanTier(h)}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* 役満以上 */}
              <div className="grid grid-cols-3 gap-1.5">
                {HAN_YAKUMAN.map((h) => (
                  <button key={h} type="button" onClick={() => selectHan(h)}
                    className={`rounded-xl border-2 py-2.5 text-xs font-black transition-all active:scale-95
                      ${han === h ? hanActiveClass(h) : hanIdleClass(h)}`}
                  >
                    {hanLabel(h)}
                  </button>
                ))}
              </div>

              {/* Current selection badge */}
              <div className={`mt-2.5 flex items-center justify-between rounded-xl px-4 py-2.5
                ${isYakuman ? 'border border-yellow-800 bg-yellow-950/30' : 'border border-emerald-800 bg-emerald-900/20'}`}>
                <span className="text-xs text-emerald-600">已选择</span>
                <span className={`text-base font-black ${isYakuman ? 'text-yellow-300' : 'text-white'}`}>
                  {hanLabel(han)}
                  {hanTier(han) && <span className="ml-1.5 text-xs font-bold opacity-60">{hanTier(han)}</span>}
                </span>
                <span className="rounded-full bg-amber-800/50 px-3 py-0.5 text-sm font-black text-amber-300">
                  {preview.level}
                </span>
              </div>
            </section>

            {/* ── 符数 (only for 1–4番) ── */}
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
                          : 'border-emerald-800 bg-emerald-900/30 text-emerald-400 hover:border-emerald-600'
                        }
                      `}
                    >
                      {f === 25 ? '25\n七対' : `${f}符`}
                    </button>
                  ))}
                </div>
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
                      isRiichi={winnerIsRiichi}
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

      {/* ── 役种速查表 (higher z-index, rendered as sibling) ── */}
      {showYakuDict && <YakuDictionary onClose={() => setShowYakuDict(false)} />}
    </>
  )
}
