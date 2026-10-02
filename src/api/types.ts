// Mirrors the backend DTOs (com.lanparty.dashboard.*). Instants are ISO strings.

export type RoomSide = 'TOP' | 'RIGHT' | 'BOTTOM' | 'LEFT';
export type SeatOrientation = 'ROWS' | 'COLUMNS';
export type MarkerKind = 'BEAMER' | 'ENTRANCE' | 'OTHER';
export type MarkerAlign = 'START' | 'CENTER' | 'END';

export interface RoomMarker {
  kind: MarkerKind;
  label: string;
  side: RoomSide;
  align: MarkerAlign;
}

export interface EventView {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  location: string | null;
  timezone: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
  welcomeTitle: string | null;
  welcomeText: string | null;
  logoUrl: string | null;
  kioskIntervalSec: number;
  kioskViews: string;
}

export interface InfoItem {
  label: string;
  value: string;
}

export interface EventInfo {
  event: EventView;
  infos: InfoItem[];
  serverTime: string;
}

export interface Banner {
  id: string;
  kind: 'MANUAL' | 'REGISTRATION_CLOSING';
  text: string;
  countdownTo: string | null;
}

export interface LiveTag {
  text: string | null;
  tournamentId: number | null;
}

export type ScheduleStatus = 'DONE' | 'LIVE' | 'NEXT' | 'PLANNED';

export interface ScheduleEntry {
  id: number;
  startsAt: string;
  endsAt: string;
  time: string;
  title: string;
  location: string | null;
  color: string;
  tournamentId: number | null;
  status: ScheduleStatus;
}

export interface ScheduleView {
  days: { key: string; label: string; items: ScheduleEntry[] }[];
  currentDay: string | null;
  live: ScheduleEntry | null;
  next: ScheduleEntry | null;
}

export interface PublicServer {
  id: number;
  name: string;
  shortCode: string | null;
  address: string;
  connectUrl: string | null;
  online: boolean;
  players: number | null;
  maxPlayers: number | null;
  map: string | null;
  availableFrom: string | null;
}

export type TournamentStatusKind = 'LIVE' | 'OPEN' | 'PLANNED' | 'CLOSED' | 'DONE';

export interface TournamentSummary {
  id: number;
  name: string;
  color: string;
  formatLabel: string | null;
  statusKind: TournamentStatusKind;
  statusText: string;
  maxParticipants: number;
  registered: number;
  teamSize: number;
  acceptsRegistrations: boolean;
  registrationClosesAt: string | null;
  startsAt: string | null;
  serverName: string | null;
  challongeUrl: string | null;
  rulesUrl: string | null;
}

export interface BracketSide {
  name: string;
  score: string | null;
  winner: boolean;
  placeholder: boolean;
}

export interface BracketMatch {
  id: number;
  identifier: string;
  player1: BracketSide;
  player2: BracketSide;
  state: string;
  live: boolean;
}

export interface BracketRound {
  number: number;
  name: string;
  matches: BracketMatch[];
}

export interface Bracket {
  type: string;
  state: string;
  rounds: BracketRound[];
  losersRounds: BracketRound[];
  currentRound: string | null;
  participants: string[];
}

export interface TournamentDetail {
  summary: TournamentSummary;
  bracket: Bracket | null;
  participants: string[];
  snapshotAt: string | null;
}

export interface RegistrationRequest {
  gamertag: string;
  teamName?: string;
  teammates?: string;
  seatLabel?: string;
  rulesAccepted: boolean;
}

export type SeatStatus = 'FREE' | 'TAKEN' | 'BLOCKED';

export interface SeatView {
  label: string;
  number: number;
  status: SeatStatus;
  gamertag: string | null;
  pending: boolean;
  note: string | null;
}

export interface RowView {
  id: number;
  label: string;
  seats: SeatView[];
}

export interface SeatMapView {
  orientation: SeatOrientation;
  rowsReversed: boolean;
  numbersReversed: boolean;
  markers: RoomMarker[];
  rows: RowView[];
  taken: number;
  free: number;
  blocked: number;
  total: number;
}

export interface Kpi {
  key: string;
  label: string;
  value: string;
  unit: string | null;
  tone: 'good' | 'bad' | null;
  updatedAt: string | null;
}

export interface Widget {
  id: number;
  type: string;
  name: string;
  ok: boolean;
  error: string | null;
  lastOkAt: string | null;
  data: unknown;
}

export interface StatsView {
  kpis: Kpi[];
  widgets: Widget[];
  serverTime: string;
}

// ---------------------------------------------------------------- admin

export interface AdminPrincipal {
  id: number;
  name: string;
}

export interface AnnouncementDto {
  id?: number | null;
  text: string;
  enabled: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

export type QueryType = 'SOURCE' | 'MINECRAFT' | 'QUAKE3' | 'NONE';

export interface ServerDto {
  id?: number | null;
  name: string;
  shortCode: string | null;
  host: string;
  port: number | null;
  queryPort: number | null;
  queryType: QueryType;
  connectUrl: string | null;
  visible: boolean;
  availableFrom: string | null;
}

export interface ScheduleDto {
  id?: number | null;
  startsAt: string;
  endsAt: string | null;
  title: string;
  location: string | null;
  color: string;
  tournamentId: number | null;
}

export interface AdminRegistration {
  id: number;
  gamertag: string;
  teamName: string | null;
  teammates: string | null;
  seatLabel: string | null;
  syncedToChallonge: boolean;
  createdAt: string;
}

export interface AdminTournament {
  id: number;
  name: string;
  color: string;
  formatLabel: string | null;
  maxParticipants: number;
  teamSize: number;
  registrationOpen: boolean;
  registrationClosesAt: string | null;
  startsAt: string | null;
  serverId: number | null;
  challongeSlug: string | null;
  rulesUrl: string | null;
  sort: number;
  snapshotAt: string | null;
  registrations: AdminRegistration[];
}

export type TournamentRequest = Omit<AdminTournament, 'id' | 'snapshotAt' | 'registrations'>;

export interface ConfigField {
  name: string;
  label: string;
  kind: 'text' | 'url' | 'number' | 'password';
  required: boolean;
  placeholder: string;
}

export interface ProviderInfo {
  type: string;
  label: string;
  fields: ConfigField[];
}

export interface IntegrationView {
  id: number;
  type: string;
  name: string;
  enabled: boolean;
  sort: number;
  config: Record<string, unknown>;
  lastError: string | null;
  lastOkAt: string | null;
}

export interface IntegrationRequest {
  type: string;
  name: string;
  enabled: boolean;
  sort: number;
  config: Record<string, unknown>;
}

export interface TestResult {
  ok: boolean;
  message: string;
  data: unknown;
}

export interface SettingsView {
  challongeConfigured: boolean;
  challongeKeyHint: string | null;
  pushToken: string;
}

export interface AdminUser {
  id: number;
  name: string;
  codeHint: string;
}

export interface AdminWithCode {
  admin: AdminUser;
  code: string;
}

export interface PendingRequest {
  id: number;
  seat: string;
  gamertag: string;
  companions: string | null;
  createdAt: string;
}

export interface RowLayout {
  id?: number | null;
  label: string;
  seatCount: number;
}

export interface LayoutRequest {
  orientation: SeatOrientation;
  rowsReversed: boolean;
  numbersReversed: boolean;
  markers: RoomMarker[];
  rows: RowLayout[];
}

export interface EventRequest {
  title: string;
  subtitle: string | null;
  location: string | null;
  timezone: string | null;
  startsAt: string;
  endsAt: string;
  welcomeTitle: string | null;
  welcomeText: string | null;
  kioskIntervalSec: number;
  kioskViews: string;
}

export interface CreateEventRequest {
  title: string;
  slug: string;
  startsAt: string;
  endsAt: string;
  cloneFromId: number | null;
}
