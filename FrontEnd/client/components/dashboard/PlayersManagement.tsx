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
// import { getPlayerStatusText, getPlayerRoleText, getPlayerStatusColor, getPlayerRoleColor } from "@shared/api";
import type { PlayerRecord } from "./PlayersTable";

interface PlayersManagementProps {
  className?: string;
  players: PlayerRecord[];
  setPlayers: React.Dispatch<React.SetStateAction<PlayerRecord[]>>;
}

export function PlayersManagement({ className, players, setPlayers }: PlayersManagementProps) {
  const [filteredPlayers, setFilteredPlayers] = useState<PlayerRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | "all">("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<PlayerRecord | null>(null);
  const [newPlayer, setNewPlayer] = useState<Partial<PlayerRecord>>({
    nickname: "",
    callSign: "",
    status: "",
    comment: "",
    channel: "",
    lastUpdate: "",
    priority: "Routine",
    location: { x: 0, y: 0 },
  });

  // Фильтрация
  const filterPlayers = () => {
    let filtered = players;
    if (searchTerm) {
      filtered = filtered.filter(player =>
        player.nickname.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter(player => player.status === statusFilter);
    }
    setFilteredPlayers(filtered);
  };
  // вызывать фильтрацию при изменении зависимостей
  useEffect(() => { filterPlayers(); }, [players, searchTerm, statusFilter]);

  const createPlayer = () => {
    if (!newPlayer.nickname) return;
    setPlayers(prev => [
      ...prev,
      {
        ...newPlayer,
        id: Math.max(0, ...prev.map(p => p.id)) + 1,
        lastUpdate: "только что",
      } as PlayerRecord,
    ]);
    setIsCreateDialogOpen(false);
    setNewPlayer({
      nickname: "",
      callSign: "",
      status: "",
      comment: "",
      channel: "",
      lastUpdate: "",
      priority: "Routine",
      location: { x: 0, y: 0 },
    });
  };

  const deletePlayer = (id: number) => {
    if (!confirm(`Удалить игрока #${id}?`)) return;
    setPlayers(prev => prev.filter(p => p.id !== id));
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
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Добавить нового игрока</DialogTitle>
                  <DialogDescription>
                    Создание нового игрока в системе
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="nick" className="text-right">Ник</Label>
                    <Input
                      id="nick"
                      value={newPlayer.nickname}
                      onChange={(e) => setNewPlayer({...newPlayer, nickname: e.target.value})}
                      className="col-span-3"
                    />
                  </div>
                  {/* Роль убрана, если потребуется — добавить строковое поле */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="status" className="text-right">Статус</Label>
                    <Input
                      id="status"
                      value={newPlayer.status}
                      onChange={(e) => setNewPlayer({ ...newPlayer, status: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={createPlayer}>Создать</Button>
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
                  <TableHead>Статус</TableHead>
                  <TableHead>Комментарий</TableHead>
                  <TableHead>Координаты</TableHead>
                  <TableHead>Канал</TableHead>
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
                    <TableRow key={player.nickname}>
                      <TableCell className="font-medium">{player.nickname}</TableCell>
                      <TableCell>{player.status}</TableCell>
                      <TableCell>{player.comment}</TableCell>
                      <TableCell>{player.location?.x}, {player.location?.y}</TableCell>
                      <TableCell>{player.channel}</TableCell>
                      <TableCell>{player.lastUpdate}</TableCell>
                      <TableCell>
                        <Button variant="destructive" onClick={() => deletePlayer(player.id)}>
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