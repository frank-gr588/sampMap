import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, AlertTriangle, Crown, Users, X, Target } from "lucide-react";
import { 
  SituationDto, 
  UnitDto,
  CreateSituationRequest
} from "@shared/api";
import type { SituationRecord } from "./SituationsPanel";

interface SituationsManagementProps {
  className?: string;
  situations: SituationRecord[];
  setSituations: React.Dispatch<React.SetStateAction<SituationRecord[]>>;
  assignments: Record<string, string | null>;
  setAssignments: React.Dispatch<React.SetStateAction<Record<string, string | null>>>;
}

const SITUATION_TYPES = [
  { value: "pursuit", label: "Погоня", color: "bg-red-500/15 text-red-200 border-red-500/50" },
  { value: "trafficstop", label: "Трафик-стоп", color: "bg-amber-500/15 text-amber-200 border-amber-500/50" },
  { value: "code6", label: "Code 6", color: "bg-purple-500/15 text-purple-200 border-purple-500/50" },
  { value: "911", label: "911", color: "bg-red-600/15 text-red-300 border-red-600/50" },
  { value: "panic", label: "PANIC", color: "bg-rose-600/20 text-rose-200 border-rose-600/60" },
];

export function SituationsManagement({ className }: SituationsManagementProps) {
  const [situations, setSituations] = useState<SituationDto[]>([]);
  const [availableUnits, setAvailableUnits] = useState<UnitDto[]>([]);
  const [filteredSituations, setFilteredSituations] = useState<SituationDto[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedSituation, setSelectedSituation] = useState<SituationDto | null>(null);
  const [situationUnits, setSituationUnits] = useState<UnitDto[]>([]);
  const [showAddUnitDialog, setShowAddUnitDialog] = useState(false);

  // Form states
  const [newSituation, setNewSituation] = useState<CreateSituationRequest>({
    type: "",
    metadata: {}
  });

  // Загрузка данных
  useEffect(() => {
    fetchSituations();
    fetchAvailableUnits();
  }, []);

  // Фильтрация
  useEffect(() => {
    let filtered = situations;

    if (searchTerm) {
      filtered = filtered.filter(situation => 
        situation.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        situation.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter(situation => situation.type === typeFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(situation => 
        statusFilter === "active" ? situation.isActive : !situation.isActive
      );
    }

    setFilteredSituations(filtered);
  }, [situations, searchTerm, typeFilter, statusFilter]);

  const fetchSituations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/situations/all");
      if (response.ok) {
        const data = await response.json();
        setSituations(data);
      }
    } catch (error) {
      console.error("Error fetching situations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableUnits = async () => {
    try {
      const response = await fetch("/api/unitscontrollernew/available");
      if (response.ok) {
        const data = await response.json();
        setAvailableUnits(data);
      }
    } catch (error) {
      console.error("Error fetching available units:", error);
    }
  };

  const fetchSituationUnits = async (situationId: string) => {
    try {
      const response = await fetch(`/api/unitscontrollernew/by-situation/${situationId}`);
      if (response.ok) {
        const data = await response.json();
        setSituationUnits(data);
      }
    } catch (error) {
      console.error("Error fetching situation units:", error);
    }
  };

  const createSituation = async () => {
    try {
      const response = await fetch("/api/situations/create", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-API-Key": "changeme-key"
        },
        body: JSON.stringify(newSituation)
      });

      if (response.ok) {
        await fetchSituations();
        setIsCreateDialogOpen(false);
        setNewSituation({
          type: "",
          metadata: {}
        });
      }
    } catch (error) {
      console.error("Error creating situation:", error);
    }
  };

  const closeSituation = async (situationId: string) => {
    if (!confirm("Закрыть ситуацию? Все юниты будут освобождены.")) return;

    try {
      const response = await fetch(`/api/situations/${situationId}/close`, {
        method: "POST",
        headers: { "X-API-Key": "changeme-key" }
      });

      if (response.ok) {
        await fetchSituations();
        await fetchAvailableUnits();
      }
    } catch (error) {
      console.error("Error closing situation:", error);
    }
  };

  const addUnitToSituation = async (situationId: string, unitId: string, asLeadUnit: boolean = false) => {
    try {
      const response = await fetch(`/api/situations/${situationId}/units/add`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-API-Key": "changeme-key"
        },
        body: JSON.stringify({ unitId, asLeadUnit })
      });

      if (response.ok) {
        await fetchSituations();
        await fetchAvailableUnits();
        if (selectedSituation?.id === situationId) {
          await fetchSituationUnits(situationId);
        }
      }
    } catch (error) {
      console.error("Error adding unit to situation:", error);
    }
  };

  const removeUnitFromSituation = async (situationId: string, unitId: string) => {
    if (!confirm("Убрать юнит с ситуации?")) return;

    try {
      const response = await fetch(`/api/situations/${situationId}/units/remove`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-API-Key": "changeme-key"
        },
        body: JSON.stringify({ unitId })
      });

      if (response.ok) {
        await fetchSituations();
        await fetchAvailableUnits();
        if (selectedSituation?.id === situationId) {
          await fetchSituationUnits(situationId);
        }
      }
    } catch (error) {
      console.error("Error removing unit from situation:", error);
    }
  };

  const setLeadUnit = async (situationId: string, unitId: string) => {
    try {
      const response = await fetch(`/api/situations/${situationId}/lead-unit`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-API-Key": "changeme-key"
        },
        body: JSON.stringify({ unitId })
      });

      if (response.ok) {
        await fetchSituations();
        if (selectedSituation?.id === situationId) {
          await fetchSituationUnits(situationId);
        }
      }
    } catch (error) {
      console.error("Error setting lead unit:", error);
    }
  };

  const openSituationDetails = async (situation: SituationDto) => {
    setSelectedSituation(situation);
    await fetchSituationUnits(situation.id);
  };

  const getSituationTypeInfo = (type: string) => {
    return SITUATION_TYPES.find(t => t.value === type) || { 
      value: type, 
      label: type, 
      color: "bg-muted/30 text-muted-foreground border-border/50" 
    };
  };

  const getActiveSituationsCount = () => situations.filter(s => s.isActive).length;
  const getTotalUnitsOnSituations = () => {
    return situations.reduce((total, situation) => total + situation.units.length, 0);
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Управление ситуациями</CardTitle>
              <CardDescription>
                Активных: {getActiveSituationsCount()} | Всего: {situations.length} | Юнитов задействовано: {getTotalUnitsOnSituations()}
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Создать ситуацию
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Создать новую ситуацию</DialogTitle>
                  <DialogDescription>
                    Создание новой критической ситуации
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="type" className="text-right">Тип</Label>
                    <Select value={newSituation.type} onValueChange={(value) => setNewSituation({...newSituation, type: value})}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Выберите тип ситуации" />
                      </SelectTrigger>
                      <SelectContent>
                        {SITUATION_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={createSituation} disabled={!newSituation.type}>
                    Создать ситуацию
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Статистика */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-red-500/10 rounded-lg">
              <div className="text-2xl font-bold">{getActiveSituationsCount()}</div>
              <div className="text-sm text-muted-foreground">Активных ситуаций</div>
            </div>
            <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
              <div className="text-2xl font-bold">
                {situations.filter(s => s.leadUnitId).length}
              </div>
              <div className="text-sm text-muted-foreground">С ведущими юнитами</div>
            </div>
            <div className="text-center p-3 bg-blue-500/10 rounded-lg">
              <div className="text-2xl font-bold">{getTotalUnitsOnSituations()}</div>
              <div className="text-sm text-muted-foreground">Юнитов задействовано</div>
            </div>
            <div className="text-center p-3 bg-green-500/10 rounded-lg">
              <div className="text-2xl font-bold">{availableUnits.length}</div>
              <div className="text-sm text-muted-foreground">Доступных юнитов</div>
            </div>
          </div>

          {/* Фильтры и поиск */}
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Поиск по типу или ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Фильтр по типу" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                {SITUATION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Фильтр по статусу" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="active">Активные</SelectItem>
                <SelectItem value="closed">Закрытые</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Таблица ситуаций */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Юнитов</TableHead>
                  <TableHead>Ведущий юнит</TableHead>
                  <TableHead>Создана</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">Загрузка...</TableCell>
                  </TableRow>
                ) : filteredSituations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">Ситуации не найдены</TableCell>
                  </TableRow>
                ) : (
                  filteredSituations.map((situation) => {
                    const typeInfo = getSituationTypeInfo(situation.type);
                    return (
                      <TableRow key={situation.id}>
                        <TableCell className="font-mono text-sm">
                          {situation.id.substring(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <Badge className={typeInfo.color}>
                            {typeInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={situation.isActive ? "destructive" : "secondary"}>
                            {situation.isActive ? "Активна" : "Закрыта"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            {situation.units.length}
                          </div>
                        </TableCell>
                        <TableCell>
                          {situation.leadUnitId ? (
                            <Badge className="bg-yellow-500/15 text-yellow-200 border-yellow-500/50">
                              <Crown className="w-3 h-3 mr-1" />
                              Назначен
                            </Badge>
                          ) : (
                            <Badge variant="outline">Не назначен</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(situation.createdAt).toLocaleString("ru-RU")}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openSituationDetails(situation)}
                            >
                              <Target className="w-4 h-4" />
                            </Button>
                            {situation.isActive && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => closeSituation(situation.id)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Диалог детали ситуации */}
      <Dialog open={!!selectedSituation} onOpenChange={() => setSelectedSituation(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Ситуация: {selectedSituation ? getSituationTypeInfo(selectedSituation.type).label : ""}
            </DialogTitle>
            <DialogDescription>
              ID: {selectedSituation?.id} | Создана: {selectedSituation ? new Date(selectedSituation.createdAt).toLocaleString("ru-RU") : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold">Юниты на ситуации ({situationUnits.length})</h4>
              <Dialog open={showAddUnitDialog} onOpenChange={setShowAddUnitDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить юнит
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Добавить юнит на ситуацию</DialogTitle>
                  </DialogHeader>
                  <div className="py-4 max-h-60 overflow-y-auto">
                    {availableUnits.length === 0 ? (
                      <p className="text-muted-foreground">Нет доступных юнитов</p>
                    ) : (
                      availableUnits.map((unit) => (
                        <div key={unit.id} className="flex items-center justify-between py-2 border-b">
                          <div>
                            <span className="font-medium">{unit.name}</span>
                            <span className="text-muted-foreground ml-2">({unit.marking})</span>
                            <Badge className="ml-2" variant="outline">
                              {unit.playerCount} игроков
                            </Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (selectedSituation) {
                                  addUnitToSituation(selectedSituation.id, unit.id, false);
                                  setShowAddUnitDialog(false);
                                }
                              }}
                            >
                              Green Unit
                            </Button>
                            <Button
                              size="sm"
                              className="bg-yellow-600 hover:bg-yellow-700"
                              onClick={() => {
                                if (selectedSituation) {
                                  addUnitToSituation(selectedSituation.id, unit.id, true);
                                  setShowAddUnitDialog(false);
                                }
                              }}
                            >
                              <Crown className="w-3 h-3 mr-1" />
                              Lead Unit
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-2">
              {situationUnits.length === 0 ? (
                <p className="text-muted-foreground">На ситуации нет юнитов</p>
              ) : (
                <div className="space-y-4">
                  {/* Lead Unit */}
                  {selectedSituation?.leadUnitId && (
                    <div>
                      <h5 className="font-medium text-yellow-400 mb-2 flex items-center">
                        <Crown className="w-4 h-4 mr-2" />
                        Ведущий юнит (Red Unit)
                      </h5>
                      {situationUnits
                        .filter(unit => unit.id === selectedSituation.leadUnitId)
                        .map((unit) => (
                          <div key={unit.id} className="flex items-center justify-between p-3 border border-yellow-500/50 bg-yellow-500/10 rounded">
                            <div>
                              <span className="font-medium">{unit.name}</span>
                              <span className="text-muted-foreground ml-2">({unit.marking})</span>
                              <Badge className="ml-2" variant="outline">
                                {unit.playerCount} игроков
                              </Badge>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                if (selectedSituation) {
                                  removeUnitFromSituation(selectedSituation.id, unit.id);
                                }
                              }}
                            >
                              Убрать
                            </Button>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Green Units */}
                  {selectedSituation?.greenUnits && selectedSituation.greenUnits.length > 0 && (
                    <div>
                      <h5 className="font-medium text-green-400 mb-2 flex items-center">
                        <Users className="w-4 h-4 mr-2" />
                        Обычные юниты (Green Units)
                      </h5>
                      {situationUnits
                        .filter(unit => selectedSituation.greenUnits.includes(unit.id))
                        .map((unit) => (
                          <div key={unit.id} className="flex items-center justify-between p-3 border border-green-500/50 bg-green-500/10 rounded">
                            <div>
                              <span className="font-medium">{unit.name}</span>
                              <span className="text-muted-foreground ml-2">({unit.marking})</span>
                              <Badge className="ml-2" variant="outline">
                                {unit.playerCount} игроков
                              </Badge>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="bg-yellow-600 hover:bg-yellow-700"
                                onClick={() => {
                                  if (selectedSituation) {
                                    setLeadUnit(selectedSituation.id, unit.id);
                                  }
                                }}
                              >
                                <Crown className="w-3 h-3 mr-1" />
                                Сделать ведущим
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  if (selectedSituation) {
                                    removeUnitFromSituation(selectedSituation.id, unit.id);
                                  }
                                }}
                              >
                                Убрать
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
