import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/utils";
import type { PlayerPointDto, UnitDto, SituationDto, TacticalChannelDto } from "@shared/api";
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

// Адаптер для конвертации SituationDto в SituationRecord
const adaptSituationForUI = (situation: SituationDto, index: number, units: UnitDto[]): SituationRecord => {
  // Определяем приоритет на основе типа ситуации
  const getPriority = (type: string): "Critical" | "High" | "Moderate" | "Low" => {
    switch (type.toLowerCase()) {
      case "panic":
        return "Critical";
      case "pursuit":
      case "code6":
        return "High";
      case "911":
        return "Moderate";
      default:
        return "Low";
    }
  };

  // Получаем название типа ситуации
  const getTitle = (type: string, metadata: Record<string, string>): string => {
    switch (type.toLowerCase()) {
      case "pursuit":
        return "Погоня";
      case "trafficstop":
        return "Трафик-стоп";
      case "code6":
        return "Code 6";
      case "911":
        return "911";
      default:
        return type;
    }
  };

  // Считаем количество назначенных юнитов
  const assignedUnits = units.filter(u => u.situationId === situation.id);
  const leadUnit = assignedUnits.find(u => u.isLeadUnit);

  // Приоритет из metadata, если есть, иначе по типу
  const priority = (situation.metadata.priority as "Critical" | "High" | "Moderate" | "Low") || getPriority(situation.type);
  
  // Название из metadata, если есть, иначе по типу
  const title = situation.metadata.title || getTitle(situation.type, situation.metadata);

  return {
    id: index + 1,
    code: situation.type.toUpperCase(),
    title,
    status: situation.isActive ? "Active" : "Monitoring",
    location: situation.metadata.location || "Неизвестно",
    leadUnit: leadUnit?.marking || "Не назначен",
    unitsAssigned: assignedUnits.length,
    channel: situation.metadata.channel || "TAC 1",
    priority,
    updated: new Date(situation.createdAt).toLocaleString('ru-RU'),
  };
};

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
  const [backendSituations, setBackendSituations] = useState<SituationDto[]>([]);
  const [tacticalChannels, setTacticalChannels] = useState<TacticalChannelDto[]>([]);
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

  // Адаптированные ситуации из backend + демо
  const adaptedSituations = useMemo(() => {
    const backendAdapted = backendSituations.map((s, i) => adaptSituationForUI(s, i, units));
    // Объединяем с демо-ситуациями (если есть)
    return [...backendAdapted, ...situations.map((s, i) => ({...s, id: backendAdapted.length + i + 1}))];
  }, [backendSituations, situations, units]);

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
  const criticalSituations = adaptedSituations.filter((situation) => situation.priority === "Critical").length;
  const codeSeven = units.filter((unit) => unit.status === "Code 7").length;

  const handleAssignmentChange = async (unitId: string, situationId: string | null) => {
    // Обновляем локальный state сразу для быстрого UI
    const oldAssignment = assignments[unitId];
    setAssignments((current) => ({
      ...current,
      [unitId]: situationId,
    }));

    try {
      // Находим юнит
      const unit = units.find(u => u.id === unitId);
      if (!unit) {
        throw new Error("Unit not found");
      }

      // Если была старая ситуация - убираем юнит с неё
      if (oldAssignment && oldAssignment !== situationId) {
        const oldSitIndex = parseInt(oldAssignment) - 1;
        if (oldSitIndex >= 0 && oldSitIndex < backendSituations.length) {
          const oldSit = backendSituations[oldSitIndex];
          await fetch(`/api/situations/${oldSit.id}/units/remove`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "X-API-Key": "changeme-key"
            },
            body: JSON.stringify({ unitId: unit.id })
          });
        }
      }

      // Если новая ситуация - добавляем юнит на неё
      if (situationId) {
        const sitIndex = parseInt(situationId) - 1;
        if (sitIndex >= 0 && sitIndex < backendSituations.length) {
          const situation = backendSituations[sitIndex];
          const response = await fetch(`/api/situations/${situation.id}/units/add`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "X-API-Key": "changeme-key"
            },
            body: JSON.stringify({ 
              unitId: unit.id,
              asLeadUnit: unit.isLeadUnit 
            })
          });

          if (!response.ok) {
            throw new Error(`Failed to assign unit: ${response.status}`);
          }
        }
      }
      
      // Данные обновятся автоматически через useEffect
      console.log("Assignment changed:", unitId, "->", situationId);
      
    } catch (error) {
      console.error("Error changing assignment:", error);
      // Откатываем изменение в UI
      setAssignments((current) => ({
        ...current,
        [unitId]: oldAssignment,
      }));
      alert(`Ошибка назначения: ${error.message}`);
    }
  };

  const handleSituationStatusChange = async (situationId: number, status: string) => {
    // Находим соответствующую backend ситуацию
    const backendSitIndex = situationId - 1;
    if (backendSitIndex >= 0 && backendSitIndex < backendSituations.length) {
      const backendSit = backendSituations[backendSitIndex];
      
      try {
        let response;
        
        // Если меняем на "Monitoring" - закрываем ситуацию
        if (status === "Monitoring" && backendSit.isActive) {
          response = await fetch(`/api/situations/${backendSit.id}/close`, {
            method: "POST",
            headers: { "X-API-Key": "changeme-key" }
          });
        }
        // Если меняем на любой активный статус (Active, Stabilizing, Escalated) - открываем ситуацию
        else if ((status === "Active" || status === "Stabilizing" || status === "Escalated") && !backendSit.isActive) {
          response = await fetch(`/api/situations/${backendSit.id}/open`, {
            method: "POST",
            headers: { "X-API-Key": "changeme-key" }
          });
        }
        
        // Обновляем метаданные для изменения статуса между Stabilizing/Escalated/Active
        if (response && response.ok && (status === "Stabilizing" || status === "Escalated")) {
          const metadata = { ...backendSit.metadata, status: status };
          await fetch(`/api/situations/${backendSit.id}/metadata`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "X-API-Key": "changeme-key"
            },
            body: JSON.stringify({ metadata })
          });
        }
        
        if (response && response.ok) {
          // Обновление произойдет автоматически через useEffect
          console.log("Situation status changed:", backendSit.id, status);
        } else if (response) {
          alert(`Ошибка изменения статуса: ${response.status}`);
        }
      } catch (error) {
        console.error("Error changing situation status:", error);
        alert(`Ошибка изменения статуса: ${error.message}`);
      }
    } else {
      // Локальная демо-ситуация
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
    }
  };

  const handleEditSituation = async (situationId: number, updates: Partial<SituationRecord>) => {
    // Находим соответствующую backend ситуацию
    const backendSitIndex = situationId - 1;
    if (backendSitIndex >= 0 && backendSitIndex < backendSituations.length) {
      const backendSit = backendSituations[backendSitIndex];
      
      try {
        // Формируем обновленные metadata
        const metadata: Record<string, string> = { ...backendSit.metadata };
        
        if (updates.location !== undefined) {
          metadata.location = updates.location;
        }
        if (updates.channel !== undefined) {
          metadata.channel = updates.channel;
        }
        if (updates.priority !== undefined) {
          metadata.priority = updates.priority;
        }
        if (updates.title !== undefined) {
          metadata.title = updates.title;
        }
        
        const response = await fetch(`/api/situations/${backendSit.id}/metadata`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "X-API-Key": "changeme-key"
          },
          body: JSON.stringify({ metadata })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to update situation: ${response.status}`);
        }
        
        // Обновление произойдет автоматически через useEffect
        console.log("Situation updated:", backendSit.id);
        
      } catch (error) {
        console.error("Error updating situation:", error);
        alert(`Ошибка обновления ситуации: ${error.message}`);
      }
    } else {
      // Локальная демо-ситуация
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
    }
  };

  const handleDeleteSituation = async (situationId: number) => {
    // Находим соответствующую backend ситуацию
    const backendSitIndex = situationId - 1;
    if (backendSitIndex >= 0 && backendSitIndex < backendSituations.length) {
      const backendSit = backendSituations[backendSitIndex];
      
      if (!confirm(`Удалить ситуацию "${backendSit.type}"?`)) return;
      
      try {
        const response = await fetch(`/api/situations/${backendSit.id}`, {
          method: "DELETE",
          headers: { "X-API-Key": "changeme-key" }
        });
        
        if (response.ok || response.status === 204) {
          // Обновление произойдет автоматически через useEffect
          console.log("Situation deleted:", backendSit.id);
        } else {
          alert(`Ошибка удаления ситуации: ${response.status}`);
        }
      } catch (error) {
        console.error("Error deleting situation:", error);
        alert(`Ошибка удаления ситуации: ${error.message}`);
      }
    } else {
      // Локальная демо-ситуация
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
    }
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
        
        // Синхронизируем assignments с реальными данными
        const newAssignments: Record<string, string | null> = {};
        data.forEach(unit => {
          if (unit.situationId) {
            // Найти индекс ситуации в backendSituations
            // Пока просто сохраняем situationId, конвертация произойдет после загрузки ситуаций
            newAssignments[unit.id] = unit.situationId;
          } else {
            newAssignments[unit.id] = null;
          }
        });
        setAssignments(newAssignments);
      } catch (error) {
        console.warn("Failed to load units:", error);
      }
    };

    loadUnits();
  }, []);

  // Load situations from backend
  useEffect(() => {
    const loadSituations = async () => {
      try {
        const data = await apiGet<SituationDto[]>("/api/situations/all");
        setBackendSituations(data);
        console.log("Loaded situations from backend:", data);
      } catch (error) {
        console.warn("Failed to load situations:", error);
      }
    };

    loadSituations();
    // Обновляем каждые 5 секунд
    const interval = setInterval(loadSituations, 5000);
    return () => clearInterval(interval);
  }, []);

  // Load tactical channels from backend
  useEffect(() => {
    const loadChannels = async () => {
      try {
        const data = await apiGet<TacticalChannelDto[]>("/api/channels/all");
        setTacticalChannels(data);
        console.log("Loaded tactical channels:", data);
      } catch (error) {
        console.warn("Failed to load tactical channels:", error);
      }
    };

    loadChannels();
    // Обновляем каждые 10 секунд
    const interval = setInterval(loadChannels, 10000);
    return () => clearInterval(interval);
  }, []);

  // Синхронизация assignments с backend ситуациями
  useEffect(() => {
    if (backendSituations.length === 0) return;
    
    // Конвертируем Guid ситуаций в UI id
    setAssignments(current => {
      const updated = { ...current };
      Object.keys(updated).forEach(unitId => {
        const situationGuid = updated[unitId];
        if (situationGuid && situationGuid.length > 10) { // Это Guid, а не число
          // Найти индекс ситуации
          const sitIndex = backendSituations.findIndex(s => s.id === situationGuid);
          if (sitIndex >= 0) {
            updated[unitId] = String(sitIndex + 1); // UI id = index + 1
          }
        }
      });
      return updated;
    });
  }, [backendSituations]);

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
                value={adaptedSituations.filter(s => s.status === "Active").length}
                description={`Всего: ${adaptedSituations.length} | TAC каналов: ${tacticalChannels.length}`}
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
                  situations={adaptedSituations}
                  onStatusChange={handleSituationStatusChange}
                  onDeleteSituation={handleDeleteSituation}
                  onEditSituation={handleEditSituation}
                />
              </div>
            </section>

            <section>
              <AssignmentBoard
                units={units}
                situations={adaptedSituations}
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
                situations={adaptedSituations}
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
