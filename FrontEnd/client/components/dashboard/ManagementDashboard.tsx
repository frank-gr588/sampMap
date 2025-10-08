import { useState } from "react";
import type { SituationRecord } from "./SituationsPanel";
import type { PlayerPointDto } from "@shared/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, AlertTriangle, MapPin } from "lucide-react";
import { PlayersManagement } from "./PlayersManagement";
import { UnitsManagement } from "./UnitsManagement";
import { SituationsManagement } from "./SituationsManagement";

interface ManagementDashboardProps {
  className?: string;
  players: PlayerPointDto[];
  setPlayers: React.Dispatch<React.SetStateAction<PlayerPointDto[]>>;
  situations: SituationRecord[];
  setSituations: React.Dispatch<React.SetStateAction<SituationRecord[]>>;
  assignments: Record<string, string | null>;
  setAssignments: React.Dispatch<React.SetStateAction<Record<string, string | null>>>;
}

export function ManagementDashboard({ className, players, setPlayers, situations, setSituations, assignments, setAssignments }: ManagementDashboardProps) {
  const [activeTab, setActiveTab] = useState("players");

  return (
    <div className={className}>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Центр управления операциями
          </CardTitle>
          <CardDescription>
            Единая панель управления игроками, юнитами и ситуациями
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="players" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Игроки
          </TabsTrigger>
          <TabsTrigger value="units" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Юниты
          </TabsTrigger>
          <TabsTrigger value="situations" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Ситуации
          </TabsTrigger>
          <TabsTrigger value="map" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Карта
          </TabsTrigger>
        </TabsList>

        <TabsContent value="players" className="mt-6">
          <PlayersManagement
            players={players}
            setPlayers={setPlayers}
          />
        </TabsContent>

        <TabsContent value="units" className="mt-6">
          <UnitsManagement
            players={players}
            setPlayers={setPlayers}
            assignments={assignments}
            setAssignments={setAssignments}
          />
        </TabsContent>

        <TabsContent value="situations" className="mt-6">
          <SituationsManagement
            situations={situations}
            setSituations={setSituations}
            assignments={assignments}
            setAssignments={setAssignments}
          />
        </TabsContent>

        <TabsContent value="map" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Карта операций</CardTitle>
              <CardDescription>
                Интерактивная карта с позициями игроков и юнитов
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 bg-muted/20 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Здесь будет интерактивная карта с позициями игроков и юнитов
                  </p>
                  <Badge variant="outline" className="mt-2">
                    В разработке
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}