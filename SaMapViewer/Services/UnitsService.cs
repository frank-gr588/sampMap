using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using SaMapViewer.Models;

namespace SaMapViewer.Services
{
    public class UnitsService
    {
        private readonly ConcurrentDictionary<Guid, Unit> _units = new();

        public Unit Create(string name, string marking, bool isRed = false)
        {
            var u = new Unit { Name = name ?? string.Empty, Marking = marking ?? string.Empty, IsRed = isRed };
            _units[u.Id] = u;
            return u;
        }

        public bool TryGet(Guid id, out Unit unit) => _units.TryGetValue(id, out unit);

        public List<Unit> GetAll() => _units.Values.OrderBy(u => u.Name).ToList();

        public void Delete(Guid id) => _units.TryRemove(id, out _);

        public void Rename(Guid id, string name, string marking)
        {
            if (_units.TryGetValue(id, out var u))
            {
                u.Name = name ?? u.Name;
                u.Marking = marking ?? u.Marking;
            }
        }

        public void SetStatus(Guid id, string status)
        {
            if (_units.TryGetValue(id, out var u))
            {
                u.Status = status ?? string.Empty;
            }
        }

        public void AttachToSituation(Guid id, Guid? situationId)
        {
            if (_units.TryGetValue(id, out var u))
            {
                u.SituationId = situationId;
            }
        }

        public void SetRed(Guid id, bool isRed)
        {
            if (_units.TryGetValue(id, out var u))
            {
                u.IsRed = isRed;
            }
        }

        public void AddPlayer(Guid id, string nick)
        {
            if (_units.TryGetValue(id, out var u) && !string.IsNullOrWhiteSpace(nick))
            {
                u.Players.Add(nick);
                u.PlayerCount = Math.Max(1, u.Players.Count);
            }
        }

        public void RemovePlayer(Guid id, string nick)
        {
            if (_units.TryGetValue(id, out var u) && !string.IsNullOrWhiteSpace(nick))
            {
                u.Players.Remove(nick);
                u.PlayerCount = Math.Max(1, u.Players.Count);
            }
        }

        public void AssignTacticalChannel(Guid id, Guid? channelId)
        {
            if (_units.TryGetValue(id, out var u))
            {
                u.TacticalChannelId = channelId;
            }
        }
    }
}


