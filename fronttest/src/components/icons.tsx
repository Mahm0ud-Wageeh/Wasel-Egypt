import {
  TrainFront, TramFront, CableCar, BusFront, Bus, CarFront,
  TrainTrack, Footprints, ArrowLeftRight, MapPin,
} from 'lucide-react'

export type TransitModeKind =
  | 'metro' | 'train' | 'rail' | 'lrt' | 'monorail' | 'brt'
  | 'bus' | 'minibus' | 'microbus' | 'walking' | 'transfer'

export const MODE_COLORS: Record<string, string> = {
  metro: '#E11D48',
  train: '#7C3AED',
  rail: '#7C3AED',
  lrt: '#059669',
  monorail: '#D97706',
  brt: '#0891B2',
  bus: '#6366F1',
  minibus: '#84CC16',
  microbus: '#F59E0B',
  walking: '#64748B',
  transfer: '#64748B',
}

export const THEME_COLORS = {
  navy: '#0A1E46',
  primary: '#1E6BFF',
  emerald: '#059669',
  amber: '#D97706',
  red: '#DC2626',
  bgLight: '#F5F7FC',
  surfaceLight: '#FFFFFF',
  bgDark: '#0A1120',
  surfaceDark: '#131E33',
  borderDark: '#26314D',
  white: '#FFFFFF',
  slate: '#64748B',
  blueDark: '#153874',
}

export const MAP_LAYER_COLORS = {
  bgDark: '#101418',
  bgLight: '#E8ECEF',
  outlineDark: '#7d93a8',
  outlineLight: '#9db2c4',
  slateLine: '#9AA7AE',
  walkingDash: '#6b7280',
  activeBlue: '#2563EB',
  activeBlueGlow: '#1D4ED8',
  white: '#FFFFFF',
  darkPin: '#0F172A',
  originPin: '#1a6bb0',
  originStroke: '#14558b',
  destPin: '#d3a044',
  metroRed: '#c62828',
  busBlue: '#1565c0',
  minibusOrange: '#e07c00',
  microbusTeal: '#00897b',
  railPurple: '#6a3fa0',
  trainPurple: '#7C3AED',
  lrtGreen: '#059669',
  monorailAmber: '#D97706',
  brtCyan: '#0891B2',
  metroOrange: '#ff7043',
  busLightBlue: '#64b5f6',
  minibusYellow: '#ffb74d',
  microbusMint: '#4dd0c4',
  railLavender: '#b39ddb',
  walkingMuted: '#c3ccd6',
}

export const GPS_STATUS_COLORS = {
  blueBg: '#DBEAFE',
  blueText: '#1D4ED8',
  emeraldBg: '#D1FAE5',
  emeraldText: '#059669',
  redBg: '#FEE2E2',
  redText: '#DC2626',
  amberBg: '#FEF3C7',
  amberText: '#D97706',
  purpleBg: '#EDE9FE',
  purpleText: '#7C3AED',
  slateBg: '#F1F5F9',
  slateText: '#475569',
  darkCard: '#1e293b',
  slateDot: '#94a3b8',
  slateDotLight: '#e2e8f0',
}

const MODE_ICONS: Record<TransitModeKind, typeof TrainFront> = {
  metro: TrainFront,
  train: TrainTrack,
  rail: TrainTrack,
  lrt: TramFront,
  monorail: CableCar,
  brt: BusFront,
  bus: Bus,
  minibus: Bus,
  microbus: CarFront,
  walking: Footprints,
  transfer: ArrowLeftRight,
}

function normalizeMode(mode?: string): TransitModeKind {
  const m = (mode ?? '').toLowerCase()
  if (m in MODE_ICONS) return m as TransitModeKind
  return 'bus'
}

/**
 * Professional transport-mode glyph — single source of truth so no screen
 * ever needs an emoji for a transit mode again.
 */
export function ModeIcon({
  mode,
  size = 18,
  color,
  className,
}: {
  mode?: string
  size?: number
  color?: string
  className?: string
}) {
  const kind = normalizeMode(mode)
  const Cmp = MODE_ICONS[kind]
  return <Cmp size={size} color={color ?? MODE_COLORS[kind]} className={className} />
}

/**
 * Soft tinted chip with mode glyph + label (replaces colored emoji pills).
 */
export function ModeBadge({
  mode,
  label,
  size = 13,
}: {
  mode?: string
  label: string
  size?: number
}) {
  const kind = normalizeMode(mode)
  const color = MODE_COLORS[kind]
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full text-white shadow-xs"
      style={{ backgroundColor: color }}
    >
      <ModeIcon mode={kind} size={size} color="white" />
      <span>{label}</span>
    </span>
  )
}

/**
 * Origin / destination / stop pin glyph.
 */
export function PinIcon({ size = 16, color = THEME_COLORS.primary }: { size?: number; color?: string }) {
  return <MapPin size={size} color={color} />
}
