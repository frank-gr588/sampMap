import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Trash2, Edit } from "lucide-react";

export type SituationPriority = "Low" | "Moderate" | "High" | "Critical";

export interface SituationRecord {
  id: number;
  code: string;
  title: string;
  status: string;
  location: string;
  leadUnit: string;
  unitsAssigned: number;
  channel: string;
  priority: SituationPriority;
  updated: string;
}

const STATUS_STYLES: Record<string, string> = {
  Active: "bg-emerald-500/15 text-emerald-200 border-emerald-500/45",
  Stabilizing: "bg-sky-500/15 text-sky-200 border-sky-500/40",
  Escalated: "bg-rose-500/18 text-rose-200 border-rose-500/50",
  Monitoring: "bg-muted/30 text-muted-foreground border-border/40",
};

const PRIORITY_STYLES: Record<SituationPriority, string> = {
  Low: "bg-emerald-500/12 text-emerald-200 border-emerald-500/30",
  Moderate: "bg-amber-500/12 text-amber-200 border-amber-500/30",
  High: "bg-orange-500/15 text-orange-200 border-orange-500/35",
  Critical: "bg-rose-500/18 text-rose-200 border-rose-500/45",
};

export const SITUATION_STATUS_OPTIONS = Object.keys(STATUS_STYLES);

interface SituationsPanelProps {
  situations: SituationRecord[];
  onStatusChange?: (situationId: number, status: string) => void;
  onDeleteSituation?: (situationId: number) => void;
  onEditSituation?: (situationId: number, updates: Partial<SituationRecord>) => void;
}

export function SituationsPanel({ situations, onStatusChange, onDeleteSituation, onEditSituation }: SituationsPanelProps) {
  const [editingSituation, setEditingSituation] = useState<SituationRecord | null>(null);
  const [editForm, setEditForm] = useState<Partial<SituationRecord>>({});

  const handleEditClick = (situation: SituationRecord) => {
    setEditingSituation(situation);
    setEditForm({
      code: situation.code,
      title: situation.title,
      location: situation.location,
      leadUnit: situation.leadUnit,
      channel: situation.channel,
      priority: situation.priority,
    });
  };

  const handleSaveEdit = () => {
    if (editingSituation && onEditSituation) {
      onEditSituation(editingSituation.id, editForm);
      setEditingSituation(null);
      setEditForm({});
    }
  };

  return (
    <>
    <div className="rounded-[28px] border border-border/40 bg-card/80 shadow-panel backdrop-blur">
      <div className="flex items-center justify-between gap-3 border-b border-border/40 px-6 py-6">
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.28em] text-muted-foreground">
            Ситуации
          </p>
          <h2 className="text-xl font-semibold text-foreground">Тактический обзор</h2>
        </div>
        <Badge
          variant="outline"
          className="border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-primary"
        >
          {situations.length} активных
        </Badge>
      </div>
      <div className="space-y-4 px-6 py-5">
        {situations.map((situation) => (
          <div
            key={situation.id}
            className="relative flex flex-col gap-4 rounded-2xl border border-border/40 bg-secondary/20 px-5 py-5 transition hover:border-primary/40 hover:bg-secondary/25"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[0.58rem] uppercase tracking-[0.3em] text-muted-foreground">
                  {situation.code}
                </p>
                <h3 className="text-base font-semibold text-foreground">
                  {situation.title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={situation.status}
                  onValueChange={(value) => onStatusChange?.(situation.id, value)}
                >
                  <SelectTrigger className="h-10 w-[150px] border-border/40 bg-background/70 text-xs uppercase tracking-[0.22em]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card/95 text-foreground">
                    {SITUATION_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge
                  variant="outline"
                  className={cn(
                    "border-transparent px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]",
                    PRIORITY_STYLES[situation.priority] ?? "bg-muted/30 text-muted-foreground border-border/40",
                  )}
                >
                  {situation.priority}
                </Badge>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => handleEditClick(situation)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid gap-4 text-xs text-muted-foreground sm:grid-cols-2">
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
              <div>
                <span className="block text-[0.58rem] uppercase tracking-[0.24em] text-muted-foreground/70">
                  Channel
                </span>
                <span className="text-foreground/90">{situation.channel}</span>
              </div>
              <div>
                <span className="block text-[0.58rem] uppercase tracking-[0.24em] text-muted-foreground/70">
                  Units nearby
                </span>
                <span className="text-foreground/90">{situation.unitsAssigned}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-[0.65rem] text-muted-foreground">
              <span className="font-mono uppercase tracking-[0.24em]">
                {situation.updated}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteSituation?.(situation.id)}
                className="gap-2 text-muted-foreground/80 hover:text-rose-200"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        ))}
        {situations.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border/40 bg-background/60 px-4 py-8 text-center text-sm text-muted-foreground">
            No active situations. Stay ready.
          </div>
        )}
      </div>

      {/* Edit Situation Dialog */}
      <Dialog open={!!editingSituation} onOpenChange={(open) => !open && setEditingSituation(null)}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Редактировать детали ситуации</DialogTitle>
            <DialogDescription>
              Обновите информацию о ситуации. Нажмите сохранить, когда закончите.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="code">Код</Label>
              <Input
                id="code"
                value={editForm.code || ""}
                onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">Название</Label>
              <Input
                id="title"
                value={editForm.title || ""}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Местоположение</Label>
              <Input
                id="location"
                value={editForm.location || ""}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="leadUnit">Главный юнит</Label>
              <Input
                id="leadUnit"
                value={editForm.leadUnit || ""}
                onChange={(e) => setEditForm({ ...editForm, leadUnit: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="channel">Канал</Label>
              <Input
                id="channel"
                value={editForm.channel || ""}
                onChange={(e) => setEditForm({ ...editForm, channel: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="priority">Приоритет</Label>
              <Select
                value={editForm.priority || "Moderate"}
                onValueChange={(value) => setEditForm({ ...editForm, priority: value as SituationPriority })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Moderate">Moderate</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSituation(null)}>
              Отмена
            </Button>
            <Button onClick={handleSaveEdit}>Сохранить изменения</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
