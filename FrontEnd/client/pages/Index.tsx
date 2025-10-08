import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/utils";
import type { PlayerPointDto, UnitDto } from "@shared/api";
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
import { UnitsManagement } from "@/components/dashboard/UnitsManagement";
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

const initialPlayers: PlayerPointDto[] = [ ];

const initialSituations: SituationRecord[] = [];

// Адаптер для конвертации PlayerPointDto в PlayerRecord для старых компонентов
const adaptPlayerForUI = (player: PlayerPointDto, index: number): PlayerRecord => ({
  id: index + 1,
  nickname: player.nick,
  callSign: player.nick,
  status: player.status?.toString() || "OnDuty",
  comment: "",
  channel: "TAC 1",
  lastUpdate: new Date(player.lastUpdate || Date.now()).toLocaleTimeString('ru-RU'),
  priority: "Routine" as const,
  location: { x: player.x || 0, y: player.y || 0 },
});

function buildInitialAssignments(units: UnitDto[]): Record<string, string | null> {
  const assignments: Record<string, string | null> = {};
  units.forEach((unit) => {
    assignments[unit.id] = null;
  });
  return assignments;
}

export default function Index() {
  const [players, setPlayers] = useState(initialPlayers);
  const [units, setUnits] = useState<UnitDto[]>([]);
  const [situations, setSituations] = useState(initialSituations);
  const [assignments, setAssignments] = useState<Record<string, string | null>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentTime, setCurrentTime] = useState(new Date());

  const normalizedSearch = searchTerm.trim().toLowerCase();

  // Адаптированные данные для старых компонентов
  const adaptedPlayers = useMemo(() => 
    players.map(adaptPlayerForUI), 
    [players]
  );

  // Адаптированная фильтрация для старых компонентов
  const statuses = useMemo(
    () =>
      Array.from(new Set(adaptedPlayers.map((player) => player.status))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [adaptedPlayers],
  );

  const filteredPlayers = useMemo(() => {
    return adaptedPlayers.filter((player) => {
      const matchesStatus = statusFilter === "all" || player.status === statusFilter;
      if (!normalizedSearch) {
        return matchesStatus;
      }
      const haystack = `${player.nickname} ${player.callSign} ${player.comment}`.toLowerCase();
      const matchesSearch = haystack.includes(normalizedSearch);
      return matchesStatus && matchesSearch;
    });
  }, [normalizedSearch, adaptedPlayers, statusFilter]);

  const activeUnits = units.filter(
    (unit) => unit.status !== "Code 7" && unit.status !== "Unassigned",
  ).length;
  const criticalSituations = situations.filter((situation) => situation.priority === "Critical").length;
  const codeSeven = units.filter((unit) => unit.status === "Code 7").length;

  const handleAssignmentChange = (unitId: string, situationId: string | null) => {
    setAssignments((current) => ({
      ...current,
      [unitId]: situationId,
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
      Object.entries(next).forEach(([unitId, assigned]) => {
        if (assigned === String(situationId)) {
          next[unitId] = null;
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
        setPlayers(data);
      } catch (error) {
        console.warn("Failed to sync player data:", error);
      }
    };

    // Load immediately
    load();
    const id = setInterval(load, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Load units from backend
  useEffect(() => {
    const loadUnits = async () => {
      try {
        const data = await apiGet<UnitDto[]>("/api/unitscontrollernew");
        setUnits(data);
      } catch (error) {
        console.warn("Failed to load units:", error);
      }
    };

    loadUnits();
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
                description={`${units.length} всего на смене`}
                accent="from-primary/25"
              />
              <SummaryCard
                icon={<AlertTriangle className="h-5 w-5" />}
                label="Критические ситуации"
                value={criticalSituations}
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
                  players={adaptedPlayers}
                  units={units}
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
                units={units}
                situations={situations}
                assignments={assignments}
                onAssignmentChange={handleAssignmentChange}
              />
            </section>

            <section className="grid gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <UnitsManagement 
                players={players}
                setPlayers={setPlayers}
                assignments={assignments}
                setAssignments={setAssignments}
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
