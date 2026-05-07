import { X, BookOpen } from 'lucide-react'

// ─── Data ──────────────────────────────────────────────────────────────────

type Restriction = 'menzen' | 'minus1' | null

interface YakuEntry {
  name: string
  restriction: Restriction
  note?: string
}

interface YakuGroup {
  han: string
  color: string   // Tailwind text color for the han badge
  bg: string      // badge background
  entries: YakuEntry[]
}

const YAKU_GROUPS: YakuGroup[] = [
  {
    han: '1番',
    color: 'text-emerald-200',
    bg: 'bg-emerald-800/60',
    entries: [
      { name: '立直',         restriction: 'menzen' },
      { name: '一发',         restriction: 'menzen' },
      { name: '门前清自摸和', restriction: 'menzen' },
      { name: '平和',         restriction: 'menzen' },
      { name: '断幺九',       restriction: null },
      { name: '一杯口',       restriction: 'menzen' },
      { name: '役牌（白/发/中/场风/自风）', restriction: null },
      { name: '岭上开花',     restriction: null },
      { name: '抢杠',         restriction: null },
      { name: '海底摸月',     restriction: null },
      { name: '河底捞鱼',     restriction: null },
    ],
  },
  {
    han: '2番',
    color: 'text-sky-200',
    bg: 'bg-sky-800/60',
    entries: [
      { name: '三色同顺', restriction: 'minus1' },
      { name: '一气通贯', restriction: 'minus1' },
      { name: '混全带幺九（混带）', restriction: 'minus1' },
      { name: '七对子',   restriction: 'menzen' },
      { name: '对对和',   restriction: null },
      { name: '三暗刻',   restriction: null },
      { name: '三色同刻', restriction: null },
      { name: '三杠子',   restriction: null },
      { name: '混老头',   restriction: null },
      { name: '小三元',   restriction: null },
    ],
  },
  {
    han: '3番',
    color: 'text-amber-200',
    bg: 'bg-amber-800/60',
    entries: [
      { name: '混一色',         restriction: 'minus1' },
      { name: '纯全带幺九（纯带）', restriction: 'minus1' },
      { name: '二杯口',         restriction: 'menzen' },
    ],
  },
  {
    han: '6番',
    color: 'text-orange-200',
    bg: 'bg-orange-800/60',
    entries: [
      { name: '清一色', restriction: 'minus1' },
    ],
  },
  {
    han: '役満',
    color: 'text-yellow-200',
    bg: 'bg-yellow-700/60',
    entries: [
      { name: '国士无双',  restriction: 'menzen',  note: '十三幺' },
      { name: '四暗刻',   restriction: 'menzen' },
      { name: '大三元',   restriction: null },
      { name: '字一色',   restriction: null },
      { name: '小四喜',   restriction: null },
      { name: '大四喜',   restriction: null,       note: '双倍役満' },
      { name: '绿一色',   restriction: null },
      { name: '清老头',   restriction: null },
      { name: '四杠子',   restriction: null },
      { name: '九莲宝灯', restriction: 'menzen' },
      { name: '天和',     restriction: null,       note: '庄家限定' },
      { name: '地和',     restriction: null,       note: '子家限定' },
    ],
  },
]

// ─── Entry chip ────────────────────────────────────────────────────────────

function YakuChip({ entry }: { entry: YakuEntry }) {
  return (
    <div className="flex items-center gap-1.5 rounded-xl bg-emerald-900/40 px-3 py-2">
      <span className="flex-1 text-sm font-medium text-white">{entry.name}</span>
      <div className="flex shrink-0 gap-1">
        {entry.restriction === 'menzen' && (
          <span className="rounded-md bg-sky-900/70 px-1.5 py-0.5 text-[10px] font-bold text-sky-300">
            門清
          </span>
        )}
        {entry.restriction === 'minus1' && (
          <span className="rounded-md bg-orange-900/70 px-1.5 py-0.5 text-[10px] font-bold text-orange-300">
            副露−1
          </span>
        )}
        {entry.note && (
          <span className="rounded-md bg-emerald-800/60 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
            {entry.note}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────

interface YakuDictionaryProps {
  onClose: () => void
}

export default function YakuDictionary({ onClose }: YakuDictionaryProps) {
  return (
    <div
      className="fixed inset-0 z-60 flex items-end justify-center bg-black/80 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border-t border-emerald-700 bg-emerald-950 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-emerald-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-400" />
            <span className="text-lg font-black tracking-widest text-white">役種速查表</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-emerald-500 transition-colors hover:bg-emerald-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 border-b border-emerald-900 px-5 py-2.5">
          <span className="text-xs text-emerald-600">图例：</span>
          <span className="rounded-md bg-sky-900/70 px-1.5 py-0.5 text-[10px] font-bold text-sky-300">門清</span>
          <span className="text-xs text-emerald-700">= 门前清限定</span>
          <span className="rounded-md bg-orange-900/70 px-1.5 py-0.5 text-[10px] font-bold text-orange-300">副露−1</span>
          <span className="text-xs text-emerald-700">= 副露时番数-1</span>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {YAKU_GROUPS.map((group) => (
            <section key={group.han}>
              {/* Group header */}
              <div className="mb-2 flex items-center gap-2">
                <span className={`rounded-lg px-3 py-1 text-sm font-black ${group.bg} ${group.color}`}>
                  {group.han}
                </span>
                <div className="h-px flex-1 bg-emerald-800/60" />
              </div>

              {/* Yaku list */}
              <div className="grid grid-cols-1 gap-1.5">
                {group.entries.map((entry) => (
                  <YakuChip key={entry.name} entry={entry} />
                ))}
              </div>
            </section>
          ))}

          {/* Footer note */}
          <p className="pb-2 text-center text-xs text-emerald-800">
            宝牌（Dora）不属于役种，但加算番数。里宝牌仅限立直和牌时翻开。
          </p>
        </div>

        {/* Close button */}
        <div className="border-t border-emerald-800 px-5 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-2xl bg-emerald-800 py-3.5 font-bold text-emerald-200 transition-all active:scale-95 hover:bg-emerald-700"
          >
            关闭速查表
          </button>
        </div>
      </div>
    </div>
  )
}
