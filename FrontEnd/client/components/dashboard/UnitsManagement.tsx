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
import { Search, Plus, Users, UserPlus, UserMinus, Trash2, Crown } from "lucide-react";
import { 
  UnitDto, 
  PlayerPointDto,
  PlayerStatus,
  CreateUnitRequest,
  AddPlayerToUnitRequest,
  RemovePlayerFromUnitRequest,
  getPlayerStatusText,
  getPlayerStatusColor
} from "@shared/api";
import type { PlayerRecord } from "./PlayersTable";

interface UnitsManagementProps {
  className?: string;
  players: PlayerRecord[];
  setPlayers: React.Dispatch<React.SetStateAction<PlayerRecord[]>>;
  assignments: Record<number, number | null>;
  setAssignments: React.Dispatch<React.SetStateAction<Record<number, number | null>>>;
}

export function UnitsManagement({ className }: UnitsManagementProps) {
  const [units, setUnits] = useState<UnitDto[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<PlayerPointDto[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<UnitDto[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<UnitDto | null>(null);
  const [unitPlayers, setUnitPlayers] = useState<PlayerPointDto[]>([]);
  const [showAddPlayerDialog, setShowAddPlayerDialog] = useState(false);

  // Form states
  const [newUnit, setNewUnit] = useState<CreateUnitRequest>({
    name: "",
    marking: "",
    playerNicks: [],
    isLeadUnit: false
  });
  const [selectedPlayerNicks, setSelectedPlayerNicks] = useState<string[]>([]);

  // Загрузка данных
  useEffect(() => {
    fetchUnits();
    fetchAvailablePlayers();
  }, []);

  // Фильтрация
  useEffect(() => {
    let filtered = units;

    if (searchTerm) {
      filtered = filtered.filter(unit => 
        unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.marking.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredUnits(filtered);
  }, [units, searchTerm]);

  const fetchUnits = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/unitscontrollernew");
      if (response.ok) {
        const data = await response.json();
        setUnits(data);
      }
    } catch (error) {
      console.error("Error fetching units:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailablePlayers = async () => {
    try {
      const response = await fetch("/api/players/available-for-unit");
      if (response.ok) {
        const data = await response.json();
        setAvailablePlayers(data);
      }
    } catch (error) {
      console.error("Error fetching available players:", error);
    }
  };

  const fetchUnitPlayers = async (unitId: string) => {
    try {
      const response = await fetch(`/api/unitscontrollernew/${unitId}/players`);
      if (response.ok) {
        const data = await response.json();
        setUnitPlayers(data);
      }
    } catch (error) {
      console.error("Error fetching unit players:", error);
    }
  };

  const createUnit = async () => {
    try {
      if (selectedPlayerNicks.length === 0) {
        console.error("At least one player must be selected");
        return;
      }

      // Создаем юнит с первым игроком
      const unitToCreate = {
        Name: newUnit.name,
        Marking: newUnit.marking,
        PlayerNick: selectedPlayerNicks[0],
        IsLeadUnit: newUnit.isLeadUnit
      };

      const response = await fetch("/api/units", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-API-Key": "changeme-key"
        },
        body: JSON.stringify(unitToCreate)
      });

      if (response.ok) {
        const unit = await response.json();
        
        // Добавляем остальных игроков к юниту
        for (let i = 1; i < selectedPlayerNicks.length; i++) {
          await fetch(`/api/units/${unit.id}/players/add`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "X-API-Key": "changeme-key"
            },
            body: JSON.stringify({ Nick: selectedPlayerNicks[i] })
          });
        }

        await fetchUnits();
        await fetchAvailablePlayers();
        setIsCreateDialogOpen(false);
        setNewUnit({
          name: "",
          marking: "",
          playerNicks: [],
          isLeadUnit: false
        });
        setSelectedPlayerNicks([]);
      }
    } catch (error) {
      console.error("Error creating unit:", error);
    }
  };

  const deleteUnit = async (unitId: string) => {
    if (!confirm("Удалить юнит? Все игроки будут освобождены.")) return;

    try {
      const response = await fetch(`/api/unitscontrollernew/${unitId}`, {
        method: "DELETE",
        headers: { "X-API-Key": "your-api-key" }
      });

      if (response.ok) {
        await fetchUnits();
        await fetchAvailablePlayers();
      }
    } catch (error) {
      console.error("Error deleting unit:", error);
    }
  };

  const addPlayerToUnit = async (unitId: string, playerNick: string) => {
    try {
      const request: AddPlayerToUnitRequest = { playerNick };
      const response = await fetch(`/api/unitscontrollernew/${unitId}/players/add`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-API-Key": "your-api-key"
        },
        body: JSON.stringify(request)
      });

      if (response.ok) {
        await fetchUnits();
        await fetchAvailablePlayers();
        if (selectedUnit?.id === unitId) {
          await fetchUnitPlayers(unitId);
        }
      }
    } catch (error) {
      console.error("Error adding player to unit:", error);
    }
  };

  const removePlayerFromUnit = async (unitId: string, playerNick: string) => {
    if (!confirm(`Удалить игрока ${playerNick} из юнита?`)) return;

    try {
      const request: RemovePlayerFromUnitRequest = { playerNick };
      const response = await fetch(`/api/unitscontrollernew/${unitId}/players/remove`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-API-Key": "your-api-key"
        },
        body: JSON.stringify(request)
      });

      if (response.ok) {
        await fetchUnits();
        await fetchAvailablePlayers();
        if (selectedUnit?.id === unitId) {
          await fetchUnitPlayers(unitId);
        }
      }
    } catch (error) {
      console.error("Error removing player from unit:", error);
    }
  };

  const togglePlayerSelection = (playerNick: string) => {
    setSelectedPlayerNicks(prev => 
      prev.includes(playerNick)
        ? prev.filter(nick => nick !== playerNick)
        : [...prev, playerNick]
    );
  };

  const openUnitDetails = async (unit: UnitDto) => {
    setSelectedUnit(unit);
    await fetchUnitPlayers(unit.id);
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Управление юнитами</CardTitle>
              <CardDescription>
                Всего юнитов: {units.length} | Активных: {units.filter(u => u.playerCount > 0).length}
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Создать юнит
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Создать новый юнит</DialogTitle>
                  <DialogDescription>
                    Создание юнита и назначение игроков
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Название</Label>
                    <Input
                      id="name"
                      value={newUnit.name}
                      onChange={(e) => setNewUnit({...newUnit, name: e.target.value})}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="marking" className="text-right">Маркировка</Label>
                    <Input
                      id="marking"
                      value={newUnit.marking}
                      onChange={(e) => setNewUnit({...newUnit, marking: e.target.value})}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Ведущий юнит</Label>
                    <div className="col-span-3">
                      <Checkbox
                        checked={newUnit.isLeadUnit}
                        onCheckedChange={(checked) => setNewUnit({...newUnit, isLeadUnit: !!checked})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label className="text-right mt-2">Игроки</Label>
                    <div className="col-span-3 max-h-40 overflow-y-auto border rounded p-2">
                      {availablePlayers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Нет доступных игроков</p>
                      ) : (
                        availablePlayers.map((player) => (
                          <div key={player.nick} className="flex items-center space-x-2 py-1">
                            <Checkbox
                              checked={selectedPlayerNicks.includes(player.nick)}
                              onCheckedChange={() => togglePlayerSelection(player.nick)}
                            />
                            <span className="flex-1">{player.nick}</span>
                            <Badge className={getPlayerStatusColor(player.status)}>
                              {getPlayerStatusText(player.status)}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={createUnit} disabled={selectedPlayerNicks.length === 0}>
                    Создать юнит
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Поиск */}
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Поиск по названию или маркировке..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Таблица юнитов */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Маркировка</TableHead>
                  <TableHead>Игроков</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Ситуация</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">Загрузка...</TableCell>
                  </TableRow>
                ) : filteredUnits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">Юниты не найдены</TableCell>
                  </TableRow>
                ) : (
                  filteredUnits.map((unit) => (
                    <TableRow key={unit.id}>
                      <TableCell className="font-medium">{unit.name}</TableCell>
                      <TableCell>{unit.marking}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {unit.playerCount}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={unit.status ? "default" : "secondary"}>
                          {unit.status || "Готов"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {unit.situationId ? (
                          <Badge variant="destructive">На ситуации</Badge>
                        ) : (
                          <Badge variant="outline">Свободен</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {unit.isLeadUnit ? (
                          <Badge className="bg-yellow-500/15 text-yellow-200 border-yellow-500/50">
                            <Crown className="w-3 h-3 mr-1" />
                            Ведущий
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Обычный</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openUnitDetails(unit)}
                          >
                            <Users className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteUnit(unit.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Диалог детали юнита */}
      <Dialog open={!!selectedUnit} onOpenChange={() => setSelectedUnit(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedUnit?.name} ({selectedUnit?.marking})
            </DialogTitle>
            <DialogDescription>
              Управление игроками в юните
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold">Игроки в юните ({unitPlayers.length})</h4>
              <Dialog open={showAddPlayerDialog} onOpenChange={setShowAddPlayerDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Добавить игрока
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Добавить игрока в юнит</DialogTitle>
                  </DialogHeader>
                  <div className="py-4 max-h-60 overflow-y-auto">
                    {availablePlayers.length === 0 ? (
                      <p className="text-muted-foreground">Нет доступных игроков</p>
                    ) : (
                      availablePlayers.map((player) => (
                        <div key={player.nick} className="flex items-center justify-between py-2 border-b">
                          <div>
                            <span className="font-medium">{player.nick}</span>
                            <Badge className={`ml-2 ${getPlayerStatusColor(player.status)}`}>
                              {getPlayerStatusText(player.status)}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              if (selectedUnit) {
                                addPlayerToUnit(selectedUnit.id, player.nick);
                                setShowAddPlayerDialog(false);
                              }
                            }}
                          >
                            Добавить
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-2">
              {unitPlayers.length === 0 ? (
                <p className="text-muted-foreground">Юнит пуст</p>
              ) : (
                unitPlayers.map((player) => (
                  <div key={player.nick} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <span className="font-medium">{player.nick}</span>
                      <Badge className={`ml-2 ${getPlayerStatusColor(player.status)}`}>
                        {getPlayerStatusText(player.status)}
                      </Badge>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (selectedUnit) {
                          removePlayerFromUnit(selectedUnit.id, player.nick);
                        }
                      }}
                    >
                      <UserMinus className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}