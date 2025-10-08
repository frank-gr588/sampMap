using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using SaMapViewer.Models;

namespace SaMapViewer.Services
{
    public class SituationsService
    {
        private readonly ConcurrentDictionary<Guid, Situation> _situations = new();
        private readonly ConcurrentDictionary<string, HashSet<string>> _nickToTags = new(StringComparer.OrdinalIgnoreCase);
        private readonly ConcurrentDictionary<string, string> _nickToBaseStatus = new(StringComparer.OrdinalIgnoreCase);
        private readonly PlayerTrackerService _tracker;
        private readonly UnitsService _unitsService;

        public SituationsService(PlayerTrackerService tracker, UnitsService unitsService)
        {
            _tracker = tracker;
            _unitsService = unitsService;
        }

        public Situation Create(string type, Dictionary<string, string>? metadata = null)
        {
            var sit = new Situation
            {
                Id = Guid.NewGuid(),
                Type = type ?? string.Empty,
                Metadata = metadata ?? new Dictionary<string, string>()
            };
            _situations[sit.Id] = sit;
            return sit;
        }

        public Situation? GetSituation(Guid id)
        {
            _situations.TryGetValue(id, out var situation);
            return situation;
        }

        public bool TryGet(Guid id, out Situation? situation) => _situations.TryGetValue(id, out situation);

        public List<Situation> GetAll() => _situations.Values.OrderBy(s => s.CreatedAt).ToList();

        public List<Situation> GetActiveSituations() => _situations.Values.Where(s => s.IsActive).OrderBy(s => s.CreatedAt).ToList();

        public void RemoveSituation(Guid id)
        {
            if (_situations.TryGetValue(id, out var situation))
            {
                // Освобождаем все юниты от ситуации
                foreach (var unitId in situation.Units.ToList())
                {
                    RemoveUnitFromSituation(id, unitId);
                }
                
                _situations.TryRemove(id, out _);
            }
        }

        public void CloseSituation(Guid id)
        {
            if (_situations.TryGetValue(id, out var situation))
            {
                situation.IsActive = false;
                
                // Освобождаем все юниты от ситуации
                foreach (var unitId in situation.Units.ToList())
                {
                    RemoveUnitFromSituation(id, unitId);
                }
            }
        }

        public void AddUnitToSituation(Guid situationId, Guid unitId, bool asLeadUnit = false)
        {
            if (!_situations.TryGetValue(situationId, out var situation))
                throw new ArgumentException($"Situation {situationId} not found");

            var unit = _unitsService.GetUnit(unitId);
            if (unit == null)
                throw new ArgumentException($"Unit {unitId} not found");

            // Если юнит уже на другой ситуации, снимаем его с неё
            if (unit.SituationId.HasValue && unit.SituationId != situationId)
            {
                RemoveUnitFromSituation(unit.SituationId.Value, unitId);
            }

            // Проверяем, нужно ли автоматически сделать supervisor lead unit
            var leadPlayerNick = _unitsService.GetLeadPlayerNick(unitId);
            var player = !string.IsNullOrEmpty(leadPlayerNick) ? _tracker.GetPlayer(leadPlayerNick) : null;
            bool shouldBeLead = asLeadUnit || 
                               (player?.Role == PlayerRole.Supervisor || player?.Role == PlayerRole.SuperSupervisor);

            situation.AddUnit(unitId, shouldBeLead);
            _unitsService.AttachToSituation(unitId, situationId);

            if (shouldBeLead)
            {
                _unitsService.SetLeadUnit(unitId, true);
            }
        }

        public void RemoveUnitFromSituation(Guid situationId, Guid unitId)
        {
            if (_situations.TryGetValue(situationId, out var situation))
            {
                situation.RemoveUnit(unitId);
                _unitsService.AttachToSituation(unitId, null);
                _unitsService.SetLeadUnit(unitId, false);

                // Если ситуация стала пустой, может быть её стоит закрыть (но не удалять автоматически)
                if (situation.Units.Count == 0)
                {
                    // Логика на усмотрение - можно добавить автозакрытие
                }
            }
        }

        public void SetLeadUnit(Guid situationId, Guid unitId)
        {
            if (_situations.TryGetValue(situationId, out var situation))
            {
                situation.SetLeadUnit(unitId);
                _unitsService.SetLeadUnit(unitId, true);
                
                // Убираем lead статус у других юнитов в этой ситуации
                foreach (var otherUnitId in situation.GreenUnits)
                {
                    _unitsService.SetLeadUnit(otherUnitId, false);
                }
            }
        }

        public List<Unit> GetUnitsInSituation(Guid situationId)
        {
            if (!_situations.TryGetValue(situationId, out var situation))
                return new List<Unit>();

            return situation.Units
                .Select(unitId => _unitsService.GetUnit(unitId))
                .Where(unit => unit != null)
                .ToList()!;
        }

        public Unit? GetLeadUnit(Guid situationId)
        {
            if (_situations.TryGetValue(situationId, out var situation) && situation.LeadUnitId.HasValue)
            {
                return _unitsService.GetUnit(situation.LeadUnitId.Value);
            }
            return null;
        }

        public List<Unit> GetGreenUnits(Guid situationId)
        {
            if (!_situations.TryGetValue(situationId, out var situation))
                return new List<Unit>();

            return situation.GreenUnits
                .Select(unitId => _unitsService.GetUnit(unitId))
                .Where(unit => unit != null)
                .ToList()!;
        }

        // Оставляем старые методы для обратной совместимости с Players
        public void SetBaseStatus(string nick, string baseStatus)
        {
            _nickToBaseStatus[nick] = baseStatus ?? "ничего";
            RecomputeStatus(nick);
        }

        public void SetPanic(string nick, bool panic)
        {
            if (panic) AddTag(nick, "PANIC");
            else RemoveTag(nick, "PANIC");
        }

        [Obsolete("Use AddUnitToSituation instead")]
        public void Join(Guid id, string nick)
        {
            // Оставлено для совместимости, но рекомендуется использовать Units
            if (!_situations.TryGetValue(id, out var s)) return;
            var tag = GetTagForSituation(s);
            if (!string.IsNullOrEmpty(tag)) AddTag(nick, tag);
        }

        [Obsolete("Use RemoveUnitFromSituation instead")]
        public void Leave(Guid id, string nick)
        {
            // Оставлено для совместимости, но рекомендуется использовать Units
            if (!_situations.TryGetValue(id, out var s)) return;
            var tag = GetTagForSituation(s);
            if (!string.IsNullOrEmpty(tag)) RemoveTag(nick, tag);
        }

        private void AddTag(string nick, string tag)
        {
            var set = _nickToTags.GetOrAdd(nick, _ => new HashSet<string>(StringComparer.OrdinalIgnoreCase));
            set.Add(tag);
            RecomputeStatus(nick);
        }

        private void RemoveTag(string nick, string tag)
        {
            if (_nickToTags.TryGetValue(nick, out var set))
            {
                set.Remove(tag);
                if (set.Count == 0) _nickToTags.TryRemove(nick, out _);
            }
            RecomputeStatus(nick);
        }

        private string GetTagForSituation(Situation s)
        {
            switch ((s.Type ?? string.Empty).ToLowerInvariant())
            {
                case "code7":
                    return "Code 7";
                case "pursuit":
                    var mode = s.Metadata.TryGetValue("mode", out var m) ? m : ""; // passive|active|foot
                    var tac = s.Metadata.TryGetValue("tac", out var t) ? t : null;   // 1|2|3
                    var label = mode switch
                    {
                        "passive" => "Погоня (пас.)",
                        "active" => "Погоня (акт.)",
                        "foot" => "Пешая погоня",
                        _ => "Погоня"
                    };
                    if (!string.IsNullOrWhiteSpace(tac)) label += $" TAC-{tac}";
                    return label;
                case "trafficstop":
                    var risk = s.Metadata.TryGetValue("risk", out var r) ? r : ""; // high|low
                    return risk == "high" ? "Трафик-стоп (выс.)" : risk == "low" ? "Трафик-стоп (низ.)" : "Трафик-стоп";
                case "code6":
                    return "Code 6";
                case "911":
                    return "911";
                default:
                    return string.Empty;
            }
        }

        public string GetStatus(string nick)
        {
            var baseStatus = _nickToBaseStatus.TryGetValue(nick, out var b) ? b : "ничего";
            var tags = _nickToTags.TryGetValue(nick, out var set) ? set.OrderBy(x => x).ToArray() : Array.Empty<string>();
            var final = tags.Length > 0 ? baseStatus + " | " + string.Join(" | ", tags) : baseStatus;
            return final;
        }

        private void RecomputeStatus(string nick)
        {
            var final = GetStatus(nick);
            _tracker.SetStatus(nick, final);
        }
    }
}

