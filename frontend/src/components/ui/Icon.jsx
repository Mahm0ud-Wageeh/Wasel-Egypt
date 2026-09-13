import {
  Clock,
  Zap,
  Sparkles,
  Wrench,
  Signpost,
  Accessibility,
  Lightbulb,
  FileText,
  Flag,
  Camera,
  Image,
  Trash2,
  KeyRound,
  Bus,
  Route as RouteIcon,
  BarChart3,
  UserCog,
  ClipboardList,
  CircleDot,
  House,
  Search,
  Megaphone,
  Bell,
  CircleUserRound,
  Map,
  LocateFixed,
  TriangleAlert,
  Waypoints,
  ShieldCheck,
  Users,
  ArrowRight,
  ArrowLeft,
  ArrowUpDown,
  Menu,
  X,
  Languages,
  Globe,
  TrainFront,
  BusFront,
  Van,
  Footprints,
  TrainTrack,
  Navigation,
  MapPin,
  CircleCheck,
  CircleAlert,
  Info,
  ChevronRight,
  ExternalLink,
  Plus,
  Minus,
  Crosshair,
  Layers,
  LoaderCircle,
  Moon,
  Map as MapIcon,
  SendHorizonal,
  MessageSquareText,
  Wallet,
  History,
  BadgeCheck,
  FlaskConical,
} from 'lucide-react'

/**
 * Central icon registry (lucide-react, MIT).
 *
 * Why a registry: screens reference icons by product meaning, not by
 * importing raw library components, so an icon swap is a one-file change
 * and the emoji→SVG migration stays auditable (spec §2.7: 24px grid,
 * 1.5px stroke, rounded caps — lucide's native style).
 *
 * Usage: <Icon name="search" size={20} aria-hidden="true" />
 * Decorative icons beside visible text MUST set aria-hidden.
 */
const ICONS = {
  // navigation
  home: House,
  search: Search,
  reports: Megaphone,
  alerts: Bell,
  profile: CircleUserRound,
  menu: Menu,
  close: X,
  language: Languages,
  globe: Globe,

  // how-it-works / product story
  plan: Map,
  track: LocateFixed,
  detect: TriangleAlert,
  recover: Waypoints,

  // trust / community
  shield: ShieldCheck,
  community: Users,

  // modes
  modeMetro: TrainFront,
  modeBus: BusFront,
  modeMinibus: Van,
  modeMicrobus: Van,
  modeRail: TrainTrack,
  modeWalking: Footprints,

  // ui
  arrowRight: ArrowRight,
  arrowLeft: ArrowLeft,
  arrowUpDown: ArrowUpDown,
  chevronRight: ChevronRight,
  navigate: Navigation,
  pin: MapPin,
  external: ExternalLink,
  plus: Plus,
  minus: Minus,
  crosshair: Crosshair,
  layers: Layers,
  spinner: LoaderCircle,
  moon: Moon,
  map: MapIcon,
  send: SendHorizonal,
  botMessage: MessageSquareText,
  wallet: Wallet,
  history: History,
  badgeCheck: BadgeCheck,
  flaskConical: FlaskConical,

  // status
  success: CircleCheck,
  warning: CircleAlert,
  info: Info,

  // report types / moderation
  clock: Clock,
  zap: Zap,
  users: Users,
  sparkles: Sparkles,
  wrench: Wrench,
  signage: Signpost,
  accessibility: Accessibility,
  lightbulb: Lightbulb,
  fileText: FileText,
  trash: Trash2,
  flag: Flag,
  camera: Camera,
  image: Image,
  key: KeyRound,
  bus: Bus,
  route: RouteIcon,
  chart: BarChart3,
  userCog: UserCog,
  clipboard: ClipboardList,
  circleDot: CircleDot,
}

export function Icon({ name, size = 20, strokeWidth = 1.75, ...rest }) {
  const Cmp = ICONS[name]
  if (!Cmp) return null
  return <Cmp size={size} strokeWidth={strokeWidth} {...rest} />
}
