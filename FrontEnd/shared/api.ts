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

// Shared types between frontend and backend
export interface PlayerPointDto {
  nick: string;
  x: number;
  y: number;
  status: string;
  lastUpdate?: string;
}

export interface SituationDto {
  id: string;
  type: string;
  metadata: Record<string, string>;
  participants: string[];
  createdAt: string;
}

export interface UnitDto {
  id: string;
  name: string;
  marking: string;
  playerCount: number;
  status: string;
  situationId?: string | null;
  isRed: boolean;
  players: string[];
  tacticalChannelId?: string | null;
}

export interface TacticalChannelDto {
  id: string;
  name: string;
  isBusy: boolean;
  situationId?: string | null;
}

