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
import { Search, Plus, Edit, Trash2, Filter } from "lucide-react";
import { PlayerStatus, PlayerRole, PlayerPointDto } from "@shared/api";

interface PlayersManagementProps {
  className?: string;
  players: PlayerPointDto[];
  setPlayers: React.Dispatch<React.SetStateAction<PlayerPointDto[]>>;
}

export function PlayersManagement({ className, players, setPlayers }: PlayersManagementProps) {
  const [filteredPlayers, setFilteredPlayers] = useState<PlayerPointDto[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | "all">("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<PlayerPointDto | null>(null);
  const [newPlayer, setNewPlayer] = useState({
    nick: "",
    role: PlayerRole.Officer,
    status: PlayerStatus.OnDutyOutOfUnit, // Изменено с OutOfDuty на OnDutyOutOfUnit для доступности в юнитах
    x: -10000, // Костыль-маркер для созданных вручную
    y: -10000, // Костыль-маркер для созданных вручную
  });

  // Функции для перевода enum'ов
  const getStatusText = (status: PlayerStatus) => {
    switch (status) {
      case PlayerStatus.OutOfDuty: return "Вне службы";
      case PlayerStatus.OnDuty: return "На службе";
      case PlayerStatus.OnDutyLeadUnit: return "На службе (ведущий)";
      case PlayerStatus.OnDutyOutOfUnit: return "На службе (вне юнита)";
      default: return "Неизвестно";
    }
  };

  const getRoleText = (role: PlayerRole) => {
    switch (role) {
      case PlayerRole.Officer: return "Офицер";
      case PlayerRole.Supervisor: return "Супервайзер";
      case PlayerRole.SuperSupervisor: return "Суперсупервайзер";
      default: return "Неизвестно";
    }
  };

  const formatLastUpdate = (lastUpdate: string) => {
    try {
      const date = new Date(lastUpdate);
      return date.toLocaleString('ru-RU');
    } catch {
      return lastUpdate;
    }
  };

  // Фильтрация
  const filterPlayers = () => {
    let filtered = players;
    if (searchTerm.trim()) {
      filtered = filtered.filter(player =>
        player.nick.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter(player => player.status.toString() === statusFilter);
    }
    setFilteredPlayers(filtered);
  };
  
  // вызывать фильтрацию при изменении зависимостей
  useEffect(() => { 
    filterPlayers(); 
  }, [players, searchTerm, statusFilter]);

  const createPlayer = async () => {
    if (!newPlayer.nick) {
      alert("Введите никнейм игрока");
      return;
    }
    
    try {
      const requestData = {
        nick: newPlayer.nick,
        x: newPlayer.x || -10000, // Костыль-маркер: -10000 означает создан вручную
        y: newPlayer.y || -10000, // Костыль-маркер: -10000 означает создан вручную
        role: newPlayer.role,
        status: newPlayer.status
      };
      
      // Отправляем запрос на создание игрока через API
      const response = await fetch("/api/players", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-API-Key": "changeme-key"
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create player: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const createdPlayer = await response.json();
      
      // Успешно создан - добавляем к списку напрямую как PlayerPointDto
      setPlayers(prev => [...prev, createdPlayer]);
      setIsCreateDialogOpen(false);
      setNewPlayer({
        nick: "",
        role: PlayerRole.Officer,
        status: PlayerStatus.OnDutyOutOfUnit, // Изменено с OutOfDuty на OnDutyOutOfUnit для доступности в юнитах
        x: -10000, // Костыль-маркер для созданных вручную
        y: -10000, // Костыль-маркер для созданных вручную
      });
      
      alert("Игрок успешно создан!");
    } catch (error) {
      console.error("Error creating player:", error);
      alert(`Ошибка создания игрока: ${error.message}`);
    }
  };

  const deletePlayer = async (nick: string) => {
    const player = players.find(p => p.nick === nick);
    if (!player) {
      alert("Игрок не найден");
      return;
    }

    if (!confirm(`Удалить игрока "${player.nick}"?`)) return;
    
    try {
      console.log(`Deleting player: ${player.nick}`);
      
      // Удаляем игрока с сервера
      const response = await fetch(`/api/players/${encodeURIComponent(player.nick)}`, {
        method: "DELETE",
        headers: { 
          "X-API-Key": "changeme-key"
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete player: ${response.status} ${response.statusText} - ${errorText}`);
      }

      console.log(`Player ${player.nick} deleted from server`);
      
      // Удаляем из локального состояния
      setPlayers(prev => prev.filter(p => p.nick !== nick));
      
      alert("Игрок успешно удален!");
    } catch (error) {
      console.error("Error deleting player:", error);
      alert(`Ошибка удаления игрока: ${error.message}`);
    }
  };

  // Можно реализовать простую статистику по статусу, если нужно
  const statusCounts = {};

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Управление игроками</CardTitle>
              <CardDescription>
                Всего игроков: {players.length} | Отображается: {filteredPlayers.length}
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить игрока
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Добавить нового игрока</DialogTitle>
                  <DialogDescription>
                    Создание нового игрока в системе. Поля отмеченные * являются обязательными.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="nick" className="text-right">Ник *</Label>
                    <Input
                      id="nick"
                      value={newPlayer.nick}
                      onChange={(e) => setNewPlayer({...newPlayer, nick: e.target.value})}
                      className="col-span-3"
                      placeholder="Введите никнейм игрока"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="role" className="text-right">Роль</Label>
                    <Select value={newPlayer.role?.toString()} onValueChange={(value) => setNewPlayer({ ...newPlayer, role: parseInt(value) as PlayerRole })}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Выберите роль" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Офицер</SelectItem>
                        <SelectItem value="1">Супервайзер</SelectItem>
                        <SelectItem value="2">Суперсупервайзер</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="status" className="text-right">Статус</Label>
                    <Select value={newPlayer.status?.toString()} onValueChange={(value) => setNewPlayer({ ...newPlayer, status: parseInt(value) as PlayerStatus })}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Выберите статус" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Вне службы</SelectItem>
                        <SelectItem value="1">На службе</SelectItem>
                        <SelectItem value="2">На службе (ведущий)</SelectItem>
                        <SelectItem value="3">На службе (вне юнита)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Координаты</Label>
                    <div className="col-span-3 grid grid-cols-2 gap-2">
                      <Input
                        placeholder="X координата (-10000 = создан вручную)"
                        type="number"
                        value={newPlayer.x || ''}
                        onChange={(e) => setNewPlayer({
                          ...newPlayer, 
                          x: parseFloat(e.target.value) || -10000
                        })}
                      />
                      <Input
                        placeholder="Y координата (-10000 = создан вручную)"
                        type="number"
                        value={newPlayer.y || ''}
                        onChange={(e) => setNewPlayer({
                          ...newPlayer, 
                          y: parseFloat(e.target.value) || -10000
                        })}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={createPlayer}
                    disabled={!newPlayer.nick}
                  >
                    Создать игрока
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Статистика по статусам убрана. */}

          {/* Фильтр и поиск */}
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Поиск по нику..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Таблица игроков */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ник</TableHead>
                  <TableHead>Роль</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Юнит</TableHead>
                  <TableHead>Координаты</TableHead>
                  <TableHead>Последнее обновление</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlayers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">Игроки не найдены</TableCell>
                  </TableRow>
                ) : (
                  filteredPlayers.map((player) => (
                    <TableRow key={player.nick}>
                      <TableCell className="font-medium">{player.nick}</TableCell>
                      <TableCell>{getRoleText(player.role)}</TableCell>
                      <TableCell>
                        <Badge variant={player.status === PlayerStatus.OnDuty || player.status === PlayerStatus.OnDutyLeadUnit || player.status === PlayerStatus.OnDutyOutOfUnit ? "default" : "secondary"}>
                          {getStatusText(player.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{player.unitId || "Не назначен"}</TableCell>
                      <TableCell>
                        {player.x === -10000 && player.y === -10000 
                          ? "Создан вручную" 
                          : `${player.x}, ${player.y}`}
                      </TableCell>
                      <TableCell>{formatLastUpdate(player.lastUpdate || "Не указано")}</TableCell>
                      <TableCell>
                        <Button variant="destructive" onClick={() => deletePlayer(player.nick)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}