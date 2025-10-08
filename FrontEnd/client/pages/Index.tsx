import { useEffect, useMemo, useState, type ReactNode } from "react";
import { apiGet } from "@/lib/utils";
import type { PlayerPointDto } from "@shared/api";
import {
  PlayersTable,
  type PlayerRecord,
} from "@/components/dashboard/PlayersTable";
import {
  SituationsPanel,
  type SituationRecord,
} from "@/components/dashboard/SituationsPanel";
import { OperationsMap } from "@/components/dashboard/OperationsMap";
import { AssignmentBoard } from "@/components/dashboard/AssignmentBoard";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Coffee,
  Radio,
  ShieldCheck,
} from "lucide-react";

const initialPlayers: PlayerRecord[] = [
  {
    id: 1,
    nickname: "Aurora",
    callSign: "A-21",
    status: "On Patrol",
    comment: "North freeway sweep complete, staging near Bay City.",
    channel: "TAC 1",
    lastUpdate: "2m ago",
    priority: "Routine",
    location: { x: 62, y: 28 },
  },
  {
    id: 2,
    nickname: "Fury",
    callSign: "P-18",
    status: "Pursuit",
    comment: "High speed pursuit southbound Del Perro, requesting air.",
    channel: "TAC 3",
    lastUpdate: "Just now",
    priority: "Critical",
    location: { x: 84, y: 44 },
  },
  {
    id: 3,
    nickname: "Beacon",
    callSign: "M-05",
    status: "Code 7",
    comment: "15-minute refuel at Rockford HQ.",
    channel: "CMD",
    lastUpdate: "4m ago",
    priority: "Elevated",
    location: { x: 24, y: 64 },
  },
  {
    id: 4,
    nickname: "Atlas",
    callSign: "S-32",
    status: "Traffic Stop",
    comment: "Blue sedan, possible 10-55, backup requested.",
    channel: "TAC 2",
    lastUpdate: "1m ago",
    priority: "Elevated",
    location: { x: 48, y: 58 },
  },
  {
    id: 5,
    nickname: "Vega",
    callSign: "R-14",
    status: "Staged",
    comment: "Perimeter west of Mission Row, holding K9.",
    channel: "TAC 4",
    lastUpdate: "6m ago",
    priority: "Routine",
    location: { x: 18, y: 32 },
  },
  {
    id: 6,
    nickname: "Orbit",
    callSign: "A-42",
    status: "Recon",
    comment: "Thermal sweep over Blaine County ridge.",
    channel: "AIR",
    lastUpdate: "3m ago",
    priority: "Routine",
    location: { x: 72, y: 68 },
  },
  {
    id: 7,
    nickname: "Halo",
    callSign: "M-29",
    status: "Support",
    comment: "Medic staging at Del Perro interchange.",
    channel: "MED",
    lastUpdate: "5m ago",
    priority: "Elevated",
    location: { x: 54, y: 82 },
  },
  {
    id: 8,
    nickname: "Sable",
    callSign: "Q-11",
    status: "On Patrol",
    comment: "Checking Palomino routes, no contacts.",
    channel: "TAC 1",
    lastUpdate: "7m ago",
    priority: "Routine",
    location: { x: 36, y: 44 },
  },
  {
    id: 9,
    nickname: "Nova",
    callSign: "U-07",
    status: "Unassigned",
    comment: "Awaiting briefing in operations center.",
    channel: "CMD",
    lastUpdate: "9m ago",
    priority: "Routine",
    location: { x: 66, y: 16 },
  },
];

const initialSituations: SituationRecord[] = [
  {
    id: 1,
    code: "Delta-41",
    title: "Freeway pursuit — Del Perro",
    status: "Active",
    location: "Del Perro Fwy SB",
    leadUnit: "Fury / P-18",
    unitsAssigned: 5,
    channel: "TAC 3",
    priority: "Critical",
    updated: "Synced 00:47 ago",
  },
  {
    id: 2,
    code: "Echo-19",
    title: "Multi-vehicle pileup",
    status: "Stabilizing",
    location: "La Puerta Tunnel",
    leadUnit: "Halo / M-29",
    unitsAssigned: 6,
    channel: "MED",
    priority: "High",
    updated: "Synced 02:11 ago",
  },
  {
    id: 3,
    code: "Bravo-07",
    title: "Burglary in progress",
    status: "Escalated",
    location: "Vespucci Canals",
    leadUnit: "Atlas / S-32",
    unitsAssigned: 4,
    channel: "TAC 2",
    priority: "High",
    updated: "Synced 05:39 ago",
  },
  {
    id: 4,
    code: "Sierra-28",
    title: "VIP motorcade convoy",
    status: "Monitoring",
    location: "Vinewood Park Dr",
    leadUnit: "Aurora / A-21",
    unitsAssigned: 3,
    channel: "CMD",
    priority: "Moderate",
    updated: "Synced 08:25 ago",
  },
];

function buildInitialAssignments(players: PlayerRecord[]) {
  return players.reduce<Record<number, number | null>>((acc, player) => {
    acc[player.id] = null;
    return acc;
  }, {});
}

export default function Index() {
  const [players, setPlayers] = useState(initialPlayers);
  const [situations, setSituations] = useState(initialSituations);
  const [assignments, setAssignments] = useState<Record<number, number | null>>(() =>
    buildInitialAssignments(initialPlayers),
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const statuses = useMemo(
    () =>
      Array.from(new Set(players.map((player) => player.status))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [players],
  );

  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      const matchesStatus = statusFilter === "all" || player.status === statusFilter;
      if (!normalizedSearch) {
        return matchesStatus;
      }
      const haystack = `${player.nickname} ${player.callSign} ${player.comment}`.toLowerCase();
      const matchesSearch = haystack.includes(normalizedSearch);
      return matchesStatus && matchesSearch;
    });
  }, [normalizedSearch, players, statusFilter]);

  const activeUnits = players.filter(
    (player) => player.status !== "Code 7" && player.status !== "Unassigned",
  ).length;
  const criticalCalls = players.filter((player) => player.priority === "Critical").length;
  const codeSeven = players.filter((player) => player.status === "Code 7").length;

  const handleUnitStatusChange = (playerId: number, status: string) => {
    setPlayers((current) =>
      current.map((player) =>
        player.id === playerId
          ? {
              ...player,
              status,
              lastUpdate: "Just now",
            }
          : player,
      ),
    );
  };

  const handleAssignmentChange = (playerId: number, situationId: number | null) => {
    setAssignments((current) => ({ ...current, [playerId]: situationId }));
  };

  const handleSituationStatusChange = (situationId: number, status: string) => {
    setSituations((current) =>
      current.map((situation) =>
        situation.id === situationId
          ? {
              ...situation,
              status,
              updated: "Updated just now",
            }
          : situation,
      ),
    );
  };

  const handleDeleteSituation = (situationId: number) => {
    setSituations((current) => current.filter((situation) => situation.id !== situationId));
    setAssignments((current) => {
      const next = { ...current };
      Object.entries(next).forEach(([playerId, assigned]) => {
        if (assigned === situationId) {
          next[Number(playerId)] = null;
        }
      });
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await apiGet<PlayerPointDto[]>("/api/coords/all");
        if (cancelled) return;
        const mapped: PlayerRecord[] = data.map((p, idx) => ({
          id: idx + 1,
          nickname: p.nick,
          callSign: p.nick,
          status: p.status || "On Patrol",
          comment: "",
          channel: "TAC 1",
          lastUpdate: new Date(p.lastUpdate || Date.now()).toLocaleTimeString(),
          priority: "Routine",
          // keep percent fallback off-screen; map uses worldX/worldY if present
          location: { x: -9999, y: -9999 },
          // @ts-expect-error - augment with world coords for OperationsMap
          worldX: p.x,
          // Backend Y increases upwards; our projection expects same world axis
          // If needed, invert here depending on your world bounds convention
          worldY: p.y,
        }));
        setPlayers(mapped);
      } catch (e) {
        // ignore transient errors in dev
      }
    };
    load();
    const id = setInterval(load, 2000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="relative isolate mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-6 py-10 lg:px-10">
        <div className="absolute inset-0 -z-10 bg-radial-fade opacity-80" />
        <section className="relative overflow-hidden rounded-[28px] border border-border/40 bg-card/80 shadow-panel backdrop-blur">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(34,216,255,0.25),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(112,71,255,0.25),transparent_60%)] opacity-80" />
          <div className="relative flex flex-col gap-8 px-6 py-8 md:px-10 md:py-10">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-2xl space-y-4">
                <Badge
                  variant="outline"
                  className="border-primary/30 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary"
                >
                  San Andreas Dispatch
                </Badge>
                <h1 className="text-3xl font-semibold leading-tight text-foreground md:text-4xl">
                  Response command center for live Grand Theft Auto: San Andreas operations
                </h1>
                <p className="text-base text-muted-foreground md:text-lg">
                  Monitor every unit, merge map intelligence with tactical status, and coordinate support at lightning speed.
                </p>
              </div>
              <div className="flex flex-col items-end gap-3 text-right">
                <span className="text-xs uppercase tracking-[0.32em] text-muted-foreground">
                  Dispatch cycle
                </span>
                <span className="text-3xl font-semibold text-foreground">
                  17:42:08
                </span>
                <span className="text-xs uppercase tracking-[0.32em] text-muted-foreground">
                  Server time
                </span>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                icon={<ShieldCheck className="h-5 w-5" />}
                label="Active units"
                value={activeUnits}
                description={`${players.length} total on shift`}
                accent="from-primary/25"
              />
              <SummaryCard
                icon={<AlertTriangle className="h-5 w-5" />}
                label="Critical calls"
                value={criticalCalls}
                description="Immediate attention required"
                accent="from-rose-400/30"
              />
              <SummaryCard
                icon={<Radio className="h-5 w-5" />}
                label="Live situations"
                value={situations.length}
                description="Across tactical channels"
                accent="from-emerald-400/25"
              />
              <SummaryCard
                icon={<Coffee className="h-5 w-5" />}
                label="Code 7"
                value={codeSeven}
                description="Units on mandatory break"
                accent="from-amber-400/25"
              />
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <OperationsMap
              players={players}
              assignments={assignments}
              situations={situations}
            />
          </div>
          <div className="flex flex-col gap-6">
            <SituationsPanel
              situations={situations}
              onStatusChange={handleSituationStatusChange}
              onDeleteSituation={handleDeleteSituation}
            />
          </div>
        </section>

        <section>
          <AssignmentBoard
            players={players}
            situations={situations}
            assignments={assignments}
            onAssignmentChange={handleAssignmentChange}
          />
        </section>

        <section className="grid gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <PlayersTable
            players={players}
            filteredPlayers={filteredPlayers}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            statuses={statuses}
            onStatusChange={handleUnitStatusChange}
          />
          <SituationsPanel
            situations={situations}
            onStatusChange={handleSituationStatusChange}
            onDeleteSituation={handleDeleteSituation}
          />
        </section>
      </main>
    </div>
  );
}

interface SummaryCardProps {
  icon: ReactNode;
  label: string;
  value: number;
  description: string;
  accent: string;
}

function SummaryCard({ icon, label, value, description, accent }: SummaryCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/40 bg-secondary/25 px-5 py-5 text-foreground transition duration-200 hover:border-primary/35 hover:shadow-glow">
      <div className={`absolute inset-0 bg-gradient-to-br ${accent} to-transparent opacity-60 transition group-hover:opacity-80`} />
      <div className="relative flex flex-col gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/40 bg-background/70 text-primary">
          {icon}
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
            {label}
          </p>
          <p className="text-3xl font-semibold">{value}</p>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
