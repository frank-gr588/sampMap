import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Fragment,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { PlayerRecord } from "./PlayersTable";
import type { SituationRecord } from "./SituationsPanel";

interface AssignmentBoardProps {
  players: PlayerRecord[];
  situations: SituationRecord[];
  assignments: Record<number, number | null>;
  onAssignmentChange: (playerId: number, situationId: number | null) => void;
}

type Connection = {
  id: string;
  path: string;
  gradientId: string;
};

const DRAG_DATA_TYPE = "application/x-dispatch-player";

export function AssignmentBoard({
  players,
  situations,
  assignments,
  onAssignmentChange,
}: AssignmentBoardProps) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const unitRefs = useRef(new Map<number, HTMLButtonElement>());
  const situationRefs = useRef(new Map<number, HTMLDivElement>());
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [hoveredSituation, setHoveredSituation] = useState<number | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);

  const assignmentsBySituation = useMemo(() => {
    const grouped = new Map<number, PlayerRecord[]>();
    situations.forEach((situation) => grouped.set(situation.id, []));
    players.forEach((player) => {
      const target = assignments[player.id];
      if (target == null) return;
      const bucket = grouped.get(target);
      if (!bucket) return;
      bucket.push(player);
    });
    return grouped;
  }, [assignments, players, situations]);

  const handleDragStart = useCallback(
    (event: React.DragEvent<HTMLButtonElement>, playerId: number) => {
      event.dataTransfer.setData(DRAG_DATA_TYPE, String(playerId));
      event.dataTransfer.effectAllowed = "move";
      setDraggingId(playerId);
    },
    [],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setHoveredSituation(null);
  }, []);

  const assignPlayer = useCallback(
    (playerId: number, situationId: number | null) => {
      onAssignmentChange(playerId, situationId);
    },
    [onAssignmentChange],
  );

  const handleDropOnSituation = useCallback(
    (event: React.DragEvent<HTMLDivElement>, situationId: number) => {
      event.preventDefault();
      const data = event.dataTransfer.getData(DRAG_DATA_TYPE);
      if (!data) return;
      assignPlayer(Number(data), situationId);
      setHoveredSituation(null);
    },
    [assignPlayer],
  );

  const handleDropOnUnassigned = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const data = event.dataTransfer.getData(DRAG_DATA_TYPE);
      if (!data) return;
      assignPlayer(Number(data), null);
    },
    [assignPlayer],
  );

  const setupUnitRef = useCallback(
    (playerId: number) => (node: HTMLButtonElement | null) => {
      if (!node) {
        unitRefs.current.delete(playerId);
        return;
      }
      unitRefs.current.set(playerId, node);
    },
    [],
  );

  const setupSituationRef = useCallback(
    (situationId: number) => (node: HTMLDivElement | null) => {
      if (!node) {
        situationRefs.current.delete(situationId);
        return;
      }
      situationRefs.current.set(situationId, node);
    },
    [],
  );

  const recomputeConnections = useCallback(() => {
    const boardEl = boardRef.current;
    if (!boardEl) {
      setConnections([]);
      return;
    }
    const boardRect = boardEl.getBoundingClientRect();
    const next: Connection[] = [];

    Object.entries(assignments).forEach(([playerIdKey, situationIdValue]) => {
      if (situationIdValue == null) return;
      const playerId = Number(playerIdKey);
      const unitEl = unitRefs.current.get(playerId);
      const situationEl = situationRefs.current.get(situationIdValue);
      if (!unitEl || !situationEl) return;

      const unitRect = unitEl.getBoundingClientRect();
      const situationRect = situationEl.getBoundingClientRect();

      const startX = unitRect.left + unitRect.width / 2 - boardRect.left;
      const startY = unitRect.top + unitRect.height / 2 - boardRect.top;
      const endX = situationRect.left + situationRect.width / 2 - boardRect.left;
      const endY = situationRect.top + 12 - boardRect.top;
      const controlX = (startX + endX) / 2;

      next.push({
        id: `${playerId}-${situationIdValue}`,
        gradientId: `gradient-${playerId}-${situationIdValue}`,
        path: `M ${startX} ${startY} C ${controlX} ${startY}, ${controlX} ${endY}, ${endX} ${endY}`,
      });
    });

    setConnections(next);
  }, [assignments]);

  useLayoutEffect(() => {
    recomputeConnections();
  }, [assignments, recomputeConnections, players.length, situations.length]);

  useLayoutEffect(() => {
    if (!boardRef.current) return;
    const observer = new ResizeObserver(recomputeConnections);
    observer.observe(boardRef.current);
    const handleResize = () => recomputeConnections();
    window.addEventListener("resize", handleResize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [recomputeConnections]);

  const unassignedCount = useMemo(() => {
    return players.filter((player) => assignments[player.id] == null).length;
  }, [assignments, players]);

  return (
    <div
      ref={boardRef}
      className="relative overflow-hidden rounded-[28px] border border-border/40 bg-card/85 shadow-panel backdrop-blur"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(34,216,255,0.16),transparent_60%),radial-gradient(circle_at_100%_100%,rgba(112,71,255,0.14),transparent_60%)]" />
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        {connections.map((connection) => (
          <Fragment key={connection.id}>
            <defs>
              <linearGradient
                id={connection.gradientId}
                gradientUnits="userSpaceOnUse"
                x1="0"
                x2="100"
                y1="0"
                y2="0"
              >
                <stop offset="0%" stopColor="rgba(34,216,255,0.25)" />
                <stop offset="100%" stopColor="rgba(112,71,255,0.35)" />
              </linearGradient>
            </defs>
            <path
              d={connection.path}
              stroke={`url(#${connection.gradientId})`}
              strokeWidth={1.8}
              strokeLinecap="round"
              fill="none"
              className="drop-shadow-[0_0_6px_rgba(34,216,255,0.2)]"
            />
          </Fragment>
        ))}
      </svg>
      <div className="relative grid gap-6 px-6 py-7 lg:grid-cols-[360px_1fr] lg:px-8 lg:py-9">
        <section className="space-y-5">
          <header className="flex flex-col gap-2">
            <p className="text-[0.6rem] uppercase tracking-[0.28em] text-muted-foreground">
              Дежурная часть
            </p>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">Доступные юниты</h2>
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-primary"
              >
                {unassignedCount} ожидают задание
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Drag a unit token onto a situation to commit them. Drop back into the hold area to release.
            </p>
          </header>
          <div className="flex flex-wrap gap-3">
            {players.map((player) => {
              const isAssigned = assignments[player.id] != null;
              return (
                <button
                  key={player.id}
                  type="button"
                  draggable
                  onDragStart={(event) => handleDragStart(event, player.id)}
                  onDragEnd={handleDragEnd}
                  ref={setupUnitRef(player.id)}
                  className={cn(
                    "group relative flex min-w-[140px] flex-col gap-2 rounded-2xl border border-border/40 bg-background/70 px-4 py-3 text-left shadow-sm transition hover:border-primary/40 hover:shadow-glow",
                    draggingId === player.id && "opacity-70",
                    isAssigned && "border-primary/50 bg-primary/10",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border/50 bg-secondary/30 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
                      {player.nickname.slice(0, 2)}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{player.nickname}</p>
                      <p className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-muted-foreground">
                        {player.callSign}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[0.65rem] text-muted-foreground">
                    <span>{player.status}</span>
                    <span>{player.channel}</span>
                  </div>
                  {isAssigned && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[0.6rem] uppercase tracking-[0.24em] text-primary">
                      Linked to situation
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            }}
            onDrop={handleDropOnUnassigned}
            className="flex min-h-[80px] items-center justify-center rounded-2xl border border-dashed border-border/40 bg-background/60 text-center text-xs text-muted-foreground"
          >
            Перетащите сюда для снятия назначения
          </div>
        </section>
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.6rem] uppercase tracking-[0.28em] text-muted-foreground">Ситуации</p>
              <h2 className="text-lg font-semibold">Активные инциденты</h2>
            </div>
            <Badge
              variant="outline"
              className="border-border/40 bg-background/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
            >
              Перетащите юниты на карточку инцидента
            </Badge>
          </div>
          <div className="space-y-4">
            {situations.map((situation) => {
              const assigned = assignmentsBySituation.get(situation.id) ?? [];
              return (
                <div
                  key={situation.id}
                  ref={setupSituationRef(situation.id)}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setHoveredSituation(situation.id);
                  }}
                  onDragLeave={() => {
                    setHoveredSituation((current) =>
                      current === situation.id ? null : current,
                    );
                  }}
                  onDrop={(event) => handleDropOnSituation(event, situation.id)}
                  className={cn(
                    "relative overflow-hidden rounded-2xl border border-border/40 bg-secondary/20 px-5 py-5 transition hover:border-primary/40 hover:bg-secondary/25",
                    hoveredSituation === situation.id && "border-primary/60 bg-secondary/30 shadow-glow",
                  )}
                >
                  <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/0 via-primary/35 to-primary/0 opacity-0 transition group-hover:opacity-100" />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[0.6rem] uppercase tracking-[0.3em] text-muted-foreground">
                        {situation.code}
                      </p>
                      <h3 className="text-base font-semibold text-foreground">
                        {situation.title}
                      </h3>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-right">
                      <Badge
                        variant="outline"
                        className="border-transparent bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                      >
                        {situation.status}
                      </Badge>
                      <p className="text-[0.6rem] uppercase tracking-[0.24em] text-muted-foreground">
                        {situation.channel}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 text-xs text-muted-foreground sm:grid-cols-2">
                    <div>
                      <span className="block text-[0.58rem] uppercase tracking-[0.24em] text-muted-foreground/70">
                        Location
                      </span>
                      <span className="text-foreground/90">{situation.location}</span>
                    </div>
                    <div>
                      <span className="block text-[0.58rem] uppercase tracking-[0.24em] text-muted-foreground/70">
                        Lead unit
                      </span>
                      <span className="text-foreground/90">{situation.leadUnit}</span>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl border border-border/30 bg-background/50 p-4">
                    <p className="text-[0.58rem] uppercase tracking-[0.24em] text-muted-foreground">
                      Assigned units
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {assigned.length === 0 && (
                        <span className="rounded-full border border-dashed border-border/50 px-3 py-1 text-[0.65rem] text-muted-foreground">
                          Drop units here
                        </span>
                      )}
                      {assigned.map((player) => (
                        <div
                          key={player.id}
                          className="group flex items-center gap-2 rounded-full border border-border/50 bg-background/70 px-3 py-1 text-[0.65rem] text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                        >
                          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border/50 bg-secondary/20 text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-primary">
                            {player.nickname.slice(0, 2)}
                          </span>
                          <span className="font-mono uppercase tracking-[0.28em]">
                            {player.callSign}
                          </span>
                          <button
                            type="button"
                            onClick={() => assignPlayer(player.id, null)}
                            className="text-xs uppercase tracking-[0.24em] text-muted-foreground transition hover:text-primary"
                          >
                            Release
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
