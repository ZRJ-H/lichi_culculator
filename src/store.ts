import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Wind = '東' | '南' | '西' | '北'
export type GameRule = 'east' | 'south'

export interface Player {
  id: number
  name: string
  score: number
  wind: Wind
  isRiichi: boolean
}

export interface RoundState {
  wind: Wind
  roundNum: number
  honba: number
  riichiPool: number
}

export interface WinPayment {
  playerId: number
  delta: number
}

export interface WinPreview {
  level: string
  winnerTotal: number
  payments: WinPayment[]
}

interface GameStore {
  roundState: RoundState
  players: Player[]
  history: { roundState: RoundState; players: Player[] }[]
  gameRule: GameRule
  isGameOver: boolean

  setGameRule: (rule: GameRule) => void
  declareRiichi: (playerId: number) => void
  handleWin: (winnerId: number, loserId: number | null, han: number, fu: number) => void
  handleDraw: (tenpaiPlayerIds: number[], isAbortive: boolean) => void
  undoLast: () => void
  resetGame: () => void
}

// ─── Wind constants ────────────────────────────────────────────────────────
const WIND_ORDER: Wind[] = ['東', '南', '西', '北']

/** Seat rotation when a non-dealer wins/draws:
 *  南→東 (new dealer), 西→南, 北→西, 東→北 */
const WIND_ROTATE: Record<Wind, Wind> = {
  東: '北',
  南: '東',
  西: '南',
  北: '西',
}

// ─── Scoring helpers ───────────────────────────────────────────────────────

function ceil100(n: number): number {
  return Math.ceil(n / 100) * 100
}

/**
 * Compute effective base points.
 * han 13  = 役満  (8000)
 * han 14+ = N倍役満 (N = han - 12)
 * han 5-12 = normal mangan levels
 * han 1-4  = fu × 2^(han+2), with mangan caps
 */
function calcBase(han: number, fu: number): number {
  if (han >= 14) return (han - 12) * 8000   // 2倍役満=16000, 3倍=24000 …
  if (han === 13) return 8000               // 役満
  const raw = fu * Math.pow(2, han + 2)
  const isMangan =
    han >= 5 ||
    raw >= 2000 ||
    (han === 4 && fu === 30) ||
    (han === 3 && fu === 60)
  if (!isMangan) return raw
  if (han >= 11) return 6000 // 三倍満
  if (han >= 8) return 4000  // 倍満
  if (han >= 6) return 3000  // 跳満
  return 2000                // 満貫
}

/** Human-readable level label */
function levelLabel(han: number, fu: number): string {
  if (han >= 14) return `${han - 12}倍役満`
  if (han === 13) return '役満'
  const raw = fu * Math.pow(2, han + 2)
  const isMangan =
    han >= 5 ||
    raw >= 2000 ||
    (han === 4 && fu === 30) ||
    (han === 3 && fu === 60)
  if (!isMangan) return `${han}番${fu}符`
  if (han >= 11) return '三倍満'
  if (han >= 8) return '倍満'
  if (han >= 6) return '跳満'
  return '満貫'
}

/**
 * Detect whether we just completed a 过庄 (non-dealer advancement) out of
 * the game's final round, which triggers the end-condition score check.
 */
function passedFinalRound(
  oldRound: RoundState,
  newRound: RoundState,
  gameRule: GameRule,
): boolean {
  const finalWind: Wind = gameRule === 'east' ? '東' : '南'
  return (
    oldRound.wind === finalWind &&
    oldRound.roundNum === 4 &&
    newRound.roundNum === 1  // 过庄 from round 4 always resets to 1
  )
}

/** Returns true if the game should end (tobi or score condition met). */
function shouldGameEnd(
  players: Player[],
  oldRound: RoundState,
  newRound: RoundState,
  gameRule: GameRule,
  isGuazhuang: boolean,   // true = 过庄 just happened
): boolean {
  if (players.some((p) => p.score < 0)) return true
  if (isGuazhuang && passedFinalRound(oldRound, newRound, gameRule)) {
    const maxScore = Math.max(...players.map((p) => p.score))
    if (maxScore >= 30000) return true
  }
  return false
}

// ─── Win scoring (pure) ────────────────────────────────────────────────────

export function calcWinPreview(
  players: Player[],
  roundState: RoundState,
  winnerId: number,
  loserId: number | null,
  han: number,
  fu: number,
): WinPreview {
  const winner = players.find((p) => p.id === winnerId)!
  const dealerPlayer = players.find((p) => p.wind === '東')!
  const winnerIsDealer = winner.id === dealerPlayer.id
  const isTsumo = loserId === null
  const base = calcBase(han, fu)
  const { honba, riichiPool } = roundState

  const deltas: Record<number, number> = {}
  players.forEach((p) => (deltas[p.id] = 0))

  if (isTsumo) {
    players.forEach((p) => {
      if (p.id === winnerId) return
      const basePay = winnerIsDealer
        ? ceil100(base * 2)
        : p.id === dealerPlayer.id
        ? ceil100(base * 2)
        : ceil100(base * 1)
      const honbaPay = honba * 100
      deltas[p.id] -= basePay + honbaPay
      deltas[winnerId] += basePay + honbaPay
    })
  } else {
    const ronPay = ceil100(winnerIsDealer ? base * 6 : base * 4)
    const honbaPay = honba * 300
    deltas[loserId!] -= ronPay + honbaPay
    deltas[winnerId] += ronPay + honbaPay
  }

  deltas[winnerId] += riichiPool * 1000

  return {
    level: levelLabel(han, fu),
    winnerTotal: deltas[winnerId],
    payments: players.map((p) => ({ playerId: p.id, delta: deltas[p.id] })),
  }
}

// ─── Draw scoring (pure) ───────────────────────────────────────────────────

const DRAW_DELTAS: Record<number, { tenpai: number; noten: number }> = {
  0: { tenpai: 0, noten: 0 },
  1: { tenpai: 3000, noten: -1000 },
  2: { tenpai: 1500, noten: -1500 },
  3: { tenpai: 1000, noten: -3000 },
  4: { tenpai: 0, noten: 0 },
}

export function calcDrawPreview(
  players: Player[],
  tenpaiIds: number[],
): { playerId: number; delta: number }[] {
  const count = tenpaiIds.length
  const { tenpai, noten } = DRAW_DELTAS[count] ?? { tenpai: 0, noten: 0 }
  return players.map((p) => ({
    playerId: p.id,
    delta: tenpaiIds.includes(p.id) ? tenpai : noten,
  }))
}

// ─── Initial state ─────────────────────────────────────────────────────────

const INITIAL_PLAYERS: Player[] = [
  { id: 1, name: '玩家A', score: 25000, wind: '東', isRiichi: false },
  { id: 2, name: '玩家B', score: 25000, wind: '南', isRiichi: false },
  { id: 3, name: '玩家C', score: 25000, wind: '西', isRiichi: false },
  { id: 4, name: '玩家D', score: 25000, wind: '北', isRiichi: false },
]

const INITIAL_ROUND: RoundState = { wind: '東', roundNum: 1, honba: 0, riichiPool: 0 }

// ─── Store ─────────────────────────────────────────────────────────────────

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      roundState: INITIAL_ROUND,
      players: INITIAL_PLAYERS,
      history: [],
      gameRule: 'south',
      isGameOver: false,

      // ── 规则切换 ───────────────────────────────────────────────────────────
      setGameRule: (rule: GameRule) => {
        set({
          gameRule: rule,
          roundState: INITIAL_ROUND,
          players: INITIAL_PLAYERS,
          history: [],
          isGameOver: false,
        })
      },

      // ── 立直 ───────────────────────────────────────────────────────────────
      declareRiichi: (playerId: number) => {
        const { roundState, players, history } = get()
        const player = players.find((p) => p.id === playerId)
        if (!player || player.isRiichi) return
        if (player.score < 1000) {
          alert(`${player.name} 分数不足 1000，无法立直！`)
          return
        }
        set({
          history: [
            ...history,
            { roundState: { ...roundState }, players: players.map((p) => ({ ...p })) },
          ],
          players: players.map((p) =>
            p.id === playerId ? { ...p, score: p.score - 1000, isRiichi: true } : p,
          ),
          roundState: { ...roundState, riichiPool: roundState.riichiPool + 1 },
        })
      },

      // ── 和牌 ───────────────────────────────────────────────────────────────
      handleWin: (
        winnerId: number,
        loserId: number | null,
        han: number,
        fu: number,
      ) => {
        const { roundState, players, history, gameRule } = get()

        const snapshot = {
          roundState: { ...roundState },
          players: players.map((p) => ({ ...p })),
        }

        const preview = calcWinPreview(players, roundState, winnerId, loserId, han, fu)

        let newPlayers = players.map((p) => {
          const payment = preview.payments.find((pay) => pay.playerId === p.id)!
          return { ...p, score: p.score + payment.delta, isRiichi: false }
        })

        const winner = players.find((p) => p.id === winnerId)!
        const winnerIsDealer = winner.wind === '東'
        let isGuazhuang = false
        let newRound: RoundState

        if (winnerIsDealer) {
          newRound = { ...roundState, honba: roundState.honba + 1, riichiPool: 0 }
        } else {
          isGuazhuang = true
          newPlayers = newPlayers.map((p) => ({ ...p, wind: WIND_ROTATE[p.wind] }))

          let newRoundNum = roundState.roundNum + 1
          let newRoundWind = roundState.wind
          if (newRoundNum > 4) {
            newRoundNum = 1
            const idx = WIND_ORDER.indexOf(roundState.wind)
            newRoundWind = WIND_ORDER[(idx + 1) % 4]
          }
          newRound = { wind: newRoundWind, roundNum: newRoundNum, honba: 0, riichiPool: 0 }
        }

        const isGameOver = shouldGameEnd(newPlayers, roundState, newRound, gameRule, isGuazhuang)

        set({
          history: [...history, snapshot],
          players: newPlayers,
          roundState: newRound,
          isGameOver,
        })
      },

      // ── 流局 ───────────────────────────────────────────────────────────────
      handleDraw: (tenpaiPlayerIds: number[], isAbortive: boolean) => {
        const { roundState, players, history, gameRule } = get()

        const snapshot = {
          roundState: { ...roundState },
          players: players.map((p) => ({ ...p })),
        }

        const clearedPlayers = players.map((p) => ({ ...p, isRiichi: false }))

        if (isAbortive) {
          set({
            history: [...history, snapshot],
            players: clearedPlayers,
            roundState: { ...roundState, honba: roundState.honba + 1 },
          })
          return
        }

        const payments = calcDrawPreview(players, tenpaiPlayerIds)
        let newPlayers = clearedPlayers.map((p) => {
          const pay = payments.find((x) => x.playerId === p.id)!
          return { ...p, score: p.score + pay.delta }
        })

        const dealer = players.find((p) => p.wind === '東')!
        const dealerIsTenpai = tenpaiPlayerIds.includes(dealer.id)
        let isGuazhuang = false
        let newRound: RoundState

        if (dealerIsTenpai) {
          newRound = { ...roundState, honba: roundState.honba + 1 }
        } else {
          isGuazhuang = true
          newPlayers = newPlayers.map((p) => ({ ...p, wind: WIND_ROTATE[p.wind] }))

          let newRoundNum = roundState.roundNum + 1
          let newRoundWind = roundState.wind
          if (newRoundNum > 4) {
            newRoundNum = 1
            const idx = WIND_ORDER.indexOf(roundState.wind)
            newRoundWind = WIND_ORDER[(idx + 1) % 4]
          }
          newRound = {
            wind: newRoundWind,
            roundNum: newRoundNum,
            honba: roundState.honba + 1,
            riichiPool: roundState.riichiPool,
          }
        }

        const isGameOver = shouldGameEnd(newPlayers, roundState, newRound, gameRule, isGuazhuang)

        set({
          history: [...history, snapshot],
          players: newPlayers,
          roundState: newRound,
          isGameOver,
        })
      },

      // ── 撤销 ───────────────────────────────────────────────────────────────
      undoLast: () => {
        const { history } = get()
        if (history.length === 0) return
        const prev = history[history.length - 1]
        set({
          roundState: prev.roundState,
          players: prev.players,
          history: history.slice(0, -1),
          isGameOver: false,
        })
      },

      // ── 重置 ───────────────────────────────────────────────────────────────
      resetGame: () => {
        set({
          roundState: INITIAL_ROUND,
          players: INITIAL_PLAYERS,
          history: [],
          isGameOver: false,
        })
      },
    }),
    { name: 'riichi-calculator-state' },
  ),
)
