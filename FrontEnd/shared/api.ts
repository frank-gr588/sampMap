/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

// Player status enum
export enum PlayerStatus {
  OutOfDuty = 0,
  OnDuty = 1,
  OnDutyLeadUnit = 2,
  OnDutyOutOfUnit = 3
}

// Player role enum
export enum PlayerRole {
  Officer = 0,
  Supervisor = 1,
  SuperSupervisor = 2
}

// Shared types between frontend and backend
export interface PlayerPointDto {
  nick: string;
  x: number;
  y: number;
  status: PlayerStatus;
  role: PlayerRole;
  unitId?: string | null;
  lastUpdate?: string;
}

export interface SituationDto {
  id: string;
  type: string;
  metadata: Record<string, string>;
  units: string[];
  leadUnitId?: string | null;
  greenUnits: string[];
  createdAt: string;
  isActive: boolean;
}

export interface UnitDto {
  id: string;
  name: string;
  marking: string;
  playerNicks: string[];
  playerCount: number;
  status: string;
  situationId?: string | null;
  isLeadUnit: boolean;
  tacticalChannelId?: string | null;
  createdAt: string;
}

export interface TacticalChannelDto {
  id: string;
  name: string;
  isBusy: boolean;
  situationId?: string | null;
}

// API request types
export interface CreatePlayerRequest {
  nick: string;
  x?: number;
  y?: number;
  role?: PlayerRole;
  status?: PlayerStatus;
}

export interface UpdatePlayerStatusRequest {
  status: PlayerStatus;
}

export interface UpdatePlayerRoleRequest {
  role: PlayerRole;
}

export interface CreateUnitRequest {
  name: string;
  marking: string;
  playerNicks: string[];
  isLeadUnit: boolean;
}

export interface AddPlayerToUnitRequest {
  playerNick: string;
}

export interface RemovePlayerFromUnitRequest {
  playerNick: string;
}

export interface UpdateUnitRequest {
  name?: string;
  marking?: string;
}

export interface CreateSituationRequest {
  type: string;
  metadata?: Record<string, string>;
}

// Helper functions for status display
export function getPlayerStatusText(status: PlayerStatus): string {
  switch (status) {
    case PlayerStatus.OutOfDuty:
      return "Вне службы";
    case PlayerStatus.OnDuty:
      return "На службе";
    case PlayerStatus.OnDutyLeadUnit:
      return "На службе (Ведущий)";
    case PlayerStatus.OnDutyOutOfUnit:
      return "На службе (Вне юнита)";
    default:
      return "Неизвестно";
  }
}

export function getPlayerRoleText(role: PlayerRole): string {
  switch (role) {
    case PlayerRole.Officer:
      return "Офицер";
    case PlayerRole.Supervisor:
      return "Супервайзер";
    case PlayerRole.SuperSupervisor:
      return "Суперсупервайзер";
    default:
      return "Неизвестно";
  }
}

export function getPlayerStatusColor(status: PlayerStatus): string {
  switch (status) {
    case PlayerStatus.OutOfDuty:
      return "bg-gray-500/15 text-gray-300 border-gray-500/50";
    case PlayerStatus.OnDuty:
      return "bg-emerald-500/12 text-emerald-200 border-emerald-400/40";
    case PlayerStatus.OnDutyLeadUnit:
      return "bg-yellow-400/15 text-yellow-200 border-yellow-400/40";
    case PlayerStatus.OnDutyOutOfUnit:
      return "bg-amber-400/12 text-amber-100 border-amber-400/30";
    default:
      return "bg-muted/30 text-muted-foreground border-border/50";
  }
}

export function getPlayerRoleColor(role: PlayerRole): string {
  switch (role) {
    case PlayerRole.Officer:
      return "bg-blue-500/15 text-blue-200 border-blue-500/50";
    case PlayerRole.Supervisor:
      return "bg-purple-500/15 text-purple-200 border-purple-500/50";
    case PlayerRole.SuperSupervisor:
      return "bg-red-500/15 text-red-200 border-red-500/50";
    default:
      return "bg-muted/30 text-muted-foreground border-border/50";
  }
}

