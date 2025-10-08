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

        public SituationsService(PlayerTrackerService tracker)
        {
            _tracker = tracker;
        }

        public Situation Create(string type, Dictionary<string, string> metadata)
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

        public bool TryGet(Guid id, out Situation situation) => _situations.TryGetValue(id, out situation);

        public List<Situation> GetAll() => _situations.Values.OrderBy(s => s.CreatedAt).ToList();

        public void RemoveIfEmpty(Guid id)
        {
            if (_situations.TryGetValue(id, out var s) && s.Participants.Count == 0)
            {
                _situations.TryRemove(id, out _);
            }
        }

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

        public void Join(Guid id, string nick)
        {
            if (!_situations.TryGetValue(id, out var s)) return;
            s.Participants.Add(nick);
            var tag = GetTagForSituation(s);
            if (!string.IsNullOrEmpty(tag)) AddTag(nick, tag);
        }

        public void Leave(Guid id, string nick)
        {
            if (!_situations.TryGetValue(id, out var s)) return;
            s.Participants.Remove(nick);
            var tag = GetTagForSituation(s);
            if (!string.IsNullOrEmpty(tag)) RemoveTag(nick, tag);
            RemoveIfEmpty(id);
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

