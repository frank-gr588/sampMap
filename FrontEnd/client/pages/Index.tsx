import { useEffect, useMemo, useState } from "react";
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
import { ManagementDashboard } from "@/components/dashboard/ManagementDashboard";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Coffee,
  Radio,
  ShieldCheck,
  Settings,
  Users,
  MapPin,
} from "lucide-react";

const initialPlayers: PlayerRecord[] = [
  {
    id: 1,
    nickname: "Аврора",
    callSign: "А-21",
    status: "Патруль",
    comment: "Зачистка северной магистрали завершена, дислокация у Бей-Сити.",
    channel: "ТАК 1",
    lastUpdate: "2 мин назад",
    priority: "Routine",
    location: { x: 62, y: 28 },
  },
  {
    id: 2,
    nickname: "Фурия",
    callSign: "П-18",
    status: "Преследование",
    comment: "Высокоскоростная погоня на юг Дель-Перро, запрос воздушной поддержки.",
    channel: "ТАК 3",
    lastUpdate: "Сейчас",
    priority: "Critical",
    location: { x: 84, y: 44 },
  },
];

const initialSituations: SituationRecord[] = [
  {
    id: 1,
    code: "Дельта-41",
    title: "Погоня на магистрали — Дель-Перро",
    status: "Активная",
    location: "Автострада Дель-Перро ЮН",
    leadUnit: "Фурия / П-18",
    unitsAssigned: 5,
    channel: "ТАК 3",
    priority: "Critical",
    updated: "Синх. 00:47 назад",
  },
];

function buildInitialAssignments(players: PlayerRecord[]): Record<number, number | null> {
  const assignments: Record<number, number | null> = {};
  players.forEach((player) => {
    assignments[player.id] = null;
  });
  return assignments;
}

export default function Index() {
  const [players, setPlayers] = useState(initialPlayers);
  const [situations, setSituations] = useState(initialSituations);
  const [assignments, setAssignments] = useState<Record<number, number | null>>(() =>
    buildInitialAssignments(initialPlayers),
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentTime, setCurrentTime] = useState(new Date());

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

  const handleEditPlayer = (playerId: number, updates: Partial<PlayerRecord>) => {
    setPlayers((current) =>
      current.map((player) =>
        player.id === playerId
          ? {
              ...player,
              ...updates,
              lastUpdate: "Just now",
            }
          : player,
      ),
    );
  };

  const handleAssignmentChange = (playerId: number, situationId: number | null) => {
    setAssignments((current) => ({
      ...current,
      [playerId]: situationId,
    }));
  };

  const handleSituationStatusChange = (situationId: number, status: string) => {
    setSituations((current) =>
      current.map((situation) =>
        situation.id === situationId
          ? {
              ...situation,
              status,
              updated: "Synced just now",
            }
          : situation,
      ),
    );
  };

  const handleEditSituation = (situationId: number, updates: Partial<SituationRecord>) => {
    setSituations((current) =>
      current.map((situation) =>
        situation.id === situationId
          ? {
              ...situation,
              ...updates,
              updated: "Synced just now",
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

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync player coordinates from backend in real-time
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
          status: p.status?.toString() || "On Patrol",
          comment: "",
          channel: "TAC 1",
          lastUpdate: new Date(p.lastUpdate || Date.now()).toLocaleTimeString('ru-RU'),
          priority: "Routine",
          location: { x: p.x || 0, y: p.y || 0 },
        }));
        setPlayers(mapped);
      } catch (error) {
        console.warn("Failed to sync player data:", error);
      }
    };

    // Load immediately
    load();
    const id = setInterval(load, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="relative isolate mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-6 py-10 lg:px-10">
        <div className="absolute inset-0 -z-10 bg-radial-fade opacity-80" />
        
        {/* Header Section */}
        <section className="relative overflow-hidden rounded-[28px] border border-border/40 bg-card/80 shadow-panel backdrop-blur">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(34,216,255,0.25),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(112,71,255,0.25),transparent_60%)] opacity-80" />
          <div className="relative flex flex-col gap-8 px-6 py-8 md:px-10 md:py-10">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-2xl space-y-4">
                <Badge
                  variant="outline"
                  className="border-primary/30 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary"
                >
                  Диспетчерская Сан-Андреас
                </Badge>
                <h1 className="text-3xl font-semibold leading-tight text-foreground md:text-4xl">
                  Командный центр реагирования для операций Grand Theft Auto: San Andreas
                </h1>
                <p className="text-base text-muted-foreground md:text-lg">
                  Отслеживайте каждый юнит, объединяйте картографические данные с тактическим статусом и координируйте поддержку на высокой скорости.
                </p>
              </div>
              <div className="flex flex-col items-end gap-3 text-right">
                <span className="text-xs uppercase tracking-[0.32em] text-muted-foreground">
                  Смена диспетчера
                </span>
                <span className="text-3xl font-semibold text-foreground">
                  {currentTime.toLocaleTimeString('ru-RU', { hour12: false })}
                </span>
                <span className="text-xs uppercase tracking-[0.32em] text-muted-foreground">
                  Время сервера
                </span>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                icon={<ShieldCheck className="h-5 w-5" />}
                label="Активные юниты"
                value={activeUnits}
                description={`${players.length} всего на смене`}
                accent="from-primary/25"
              />
              <SummaryCard
                icon={<AlertTriangle className="h-5 w-5" />}
                label="Критические вызовы"
                value={criticalCalls}
                description="Требуют немедленного внимания"
                accent="from-rose-400/30"
              />
              <SummaryCard
                icon={<Radio className="h-5 w-5" />}
                label="Активные ситуации"
                value={situations.length}
                description="По тактическим каналам"
                accent="from-emerald-400/25"
              />
              <SummaryCard
                icon={<Coffee className="h-5 w-5" />}
                label="Код 7"
                value={codeSeven}
                description="Юниты на обязательном перерыве"
                accent="from-amber-400/25"
              />
            </div>
          </div>
        </section>

        {/* Main Tabs Section */}
        <Tabs defaultValue="operations" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="operations" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Операции
            </TabsTrigger>
            <TabsTrigger value="management" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Управление
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="operations" className="space-y-6">
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
                  onEditSituation={handleEditSituation}
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
                onEditPlayer={handleEditPlayer}
              />
              <SituationsPanel
                situations={situations}
                onStatusChange={handleSituationStatusChange}
                onDeleteSituation={handleDeleteSituation}
                onEditSituation={handleEditSituation}
              />
            </section>
          </TabsContent>
          
          <TabsContent value="management">
          <ManagementDashboard
            players={players}
            setPlayers={setPlayers}
            situations={situations}
            setSituations={setSituations}
            assignments={assignments}
            setAssignments={setAssignments}
          />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

interface SummaryCardProps {
  icon: React.ReactNode;
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
