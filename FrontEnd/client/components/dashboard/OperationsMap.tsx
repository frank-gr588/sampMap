import { Badge } from "@/components/ui/badge";
import { API_BASE, cn } from "@/lib/utils";
import * as React from "react";
import { Compass, MapPin } from "lucide-react";
import type { PlayerRecord } from "./PlayersTable";
import type { SituationRecord } from "./SituationsPanel";

interface OperationsMapProps {
  players: PlayerRecord[];
  assignments?: Record<number, number | null>;
  situations?: SituationRecord[];
}

const STATUS_MARKER_COLORS: Record<string, string> = {
  Pursuit: "bg-rose-400 text-rose-100",
  "Code 7": "bg-amber-300 text-amber-900",
  "Traffic Stop": "bg-amber-500 text-amber-50",
  Staged: "bg-sky-400 text-sky-950",
  "On Patrol": "bg-emerald-400 text-emerald-950",
  Unassigned: "bg-slate-400 text-slate-950",
  Recon: "bg-indigo-400 text-indigo-950",
  Support: "bg-cyan-400 text-cyan-950",
};

const HEAT_RING_STYLES: Record<string, string> = {
  Pursuit: "bg-rose-400/35",
  "Code 7": "bg-amber-400/35",
  "Traffic Stop": "bg-amber-300/25",
  Staged: "bg-sky-400/28",
  "On Patrol": "bg-emerald-400/28",
  Unassigned: "bg-muted/30",
  Recon: "bg-indigo-400/28",
  Support: "bg-cyan-400/28",
};

const WORLD_MIN_X = -3000; // adjust if your SA:MP bounds differ
const WORLD_MAX_X = 3000;
const WORLD_MIN_Y = -3000;
const WORLD_MAX_Y = 3000;

export function OperationsMap({ players, assignments, situations }: OperationsMapProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [dims, setDims] = React.useState<{ w: number; h: number }>({ w: 0, h: 0 });

  React.useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) {
        const cr = e.contentRect;
        setDims({ w: cr.width, h: cr.height });
      }
    });
    obs.observe(el);
    setDims({ w: el.clientWidth, h: el.clientHeight });
    return () => obs.disconnect();
  }, []);

  const mapToScreen = React.useCallback(
    (wx: number, wy: number) => {
      const { w, h } = dims;
      if (w <= 0 || h <= 0) return { x: 0, y: 0, ready: false };

      const imgAspect = 1; // square image
      const containerAspect = w / h;
      let drawW: number;
      let drawH: number;
      let offX = 0;
      let offY = 0;

      if (containerAspect >= imgAspect) {
        // height-limited, horizontal letterbox
        drawH = h;
        drawW = h * imgAspect;
        offX = (w - drawW) / 2;
      } else {
        // width-limited, vertical letterbox
        drawW = w;
        drawH = w / imgAspect;
        offY = (h - drawH) / 2;
      }

      const u = (wx - WORLD_MIN_X) / (WORLD_MAX_X - WORLD_MIN_X);
      const v = (wy - WORLD_MIN_Y) / (WORLD_MAX_Y - WORLD_MIN_Y);
      const vImg = 1 - v; // invert Y to match top-left origin

      const sx = offX + u * drawW;
      const sy = offY + vImg * drawH;
      return { x: sx, y: sy, ready: true };
    },
    [dims]
  );

  return (
    <div ref={containerRef} className="relative aspect-square flex flex-col overflow-hidden rounded-[32px] border border-border/40 bg-card/80 shadow-panel backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 bg-secondary/25 px-6 py-6 backdrop-blur-lg">
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
            Tactical overview
          </p>
          <h2 className="text-xl font-semibold text-foreground">
            Situations
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1 font-medium uppercase tracking-[0.2em] text-primary">
            <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-primary" />
            Realtime feed
          </div>
          <Badge
            variant="outline"
            className="border-border/40 bg-background/60 px-3 py-1 font-mono text-[0.7rem] uppercase tracking-[0.24em] text-muted-foreground"
          >
            Updated {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Badge>
        </div>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(34,216,255,0.24),transparent_55%),radial-gradient(circle_at_82%_72%,rgba(112,71,255,0.22),transparent_60%)]"
        />
        <img
          src={`${API_BASE}/sa_map.png`}
          alt="San Andreas map"
          className="absolute inset-0 h-full w-full object-contain opacity-80"
        />
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(79, 112, 153, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(79, 112, 153, 0.15) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(34, 216, 255, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(34, 216, 255, 0.08) 1px, transparent 1px)",
            backgroundSize: "240px 240px",
          }}
        />
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full text-slate-400/20"
          aria-hidden
        >
          <g fill="none" stroke="rgba(180, 210, 255, 0.22)" strokeWidth="0.4">
            <path d="M6 20c6-7 12-10 22-11s24 6 30 14 12 10 20 9 15-6 20-14" />
            <path d="M10 70c4-9 10-13 18-15s16 2 24 9 15 11 24 10 14-6 18-12" />
            <path d="M40 12c2 7 4 13 3 22s-4 18-3 28 6 20 10 26" />
          </g>
          <g fill="rgba(34, 216, 255, 0.12)" stroke="rgba(34, 216, 255, 0.28)" strokeWidth="0.35">
            <path d="M12 22c5-5 12-8 20-7 8 1 14 6 18 11s8 9 5 15-12 10-19 10-15-4-20-9-6-14-4-20Z" />
            <path d="M60 12c6-3 12-5 19-3s14 6 18 12 3 14-3 18-17 8-25 6-12-10-15-16-2-14 6-17Z" />
            <path d="M18 68c5-6 12-9 21-8s18 9 24 15 9 13 4 18-18 8-26 6-14-10-18-16-5-11-5-15Z" />
          </g>
        </svg>
        <div className="relative z-10 h-full w-full">
          {players.map((player) => {
            const situationId = assignments?.[player.id] ?? null;
            const situation = situationId
              ? situations?.find((item) => item.id === situationId)
              : undefined;

            // Support both world coords and precomputed percentage
            const hasWorld = (player as any).worldX !== undefined && (player as any).worldY !== undefined;
            let stylePos: React.CSSProperties;
            if (hasWorld) {
              const m = mapToScreen((player as any).worldX, (player as any).worldY);
              stylePos = m.ready ? { left: m.x + 'px', top: m.y + 'px' } : { left: '-9999px', top: '-9999px' };
            } else {
              stylePos = { left: `${player.location.x}%`, top: `${player.location.y}%` };
            }

            return (
              <div
                key={player.id}
                className="absolute"
                style={stylePos}
              >
                <div className="group relative flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
                  <span
                    className={cn(
                      "pointer-events-none absolute -inset-4 -z-10 rounded-full blur-2xl transition duration-200 group-hover:scale-125",
                      situation ? "bg-primary/25" : HEAT_RING_STYLES[player.status] ?? "bg-primary/20",
                    )}
                  />
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-xs font-semibold uppercase tracking-[0.16em] shadow-glow transition group-hover:scale-110",
                      STATUS_MARKER_COLORS[player.status] ?? "bg-primary text-primary-foreground",
                      situation && "border-primary/60 ring-2 ring-primary/50",
                    )}
                  >
                    <MapPin className="h-3.5 w-3.5" />
                  </span>
                  <div className="pointer-events-none mt-3 w-44 origin-top scale-95 rounded-2xl border border-border/40 bg-background/85 p-3 text-left text-xs text-foreground opacity-0 shadow-lg transition duration-200 group-hover:scale-100 group-hover:opacity-100">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {player.nickname}
                      </p>
                      <span className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-muted-foreground">
                        {player.callSign}
                      </span>
                    </div>
                    <p className="mt-1 text-[0.7rem] text-muted-foreground">
                      {player.comment}
                    </p>
                    <div className="mt-3 flex flex-col gap-1 text-[0.65rem] text-muted-foreground/80">
                      <span className="flex items-center justify-between">
                        <span>Status</span>
                        <span>{player.status}</span>
                      </span>
                      <span className="flex items-center justify-between">
                        <span>Last update</span>
                        <span>{player.lastUpdate}</span>
                      </span>
                      {situation && (
                        <span className="flex items-center justify-between text-primary">
                          <span>Tasked</span>
                          <span>{situation.code}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 border-t border-border/40 bg-secondary/20 px-6 py-4 text-[0.7rem] text-muted-foreground">
        <div className="flex items-center gap-2 text-foreground">
          <Compass className="h-4 w-4" />
          <span className="uppercase tracking-[0.26em]">Legend</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {Object.entries(STATUS_MARKER_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full", color)} />
              <span className="text-muted-foreground">{status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
