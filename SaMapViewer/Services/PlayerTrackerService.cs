using SaMapViewer.Models;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;

namespace SaMapViewer.Services
{
    public class PlayerTrackerService
    {
        private readonly ConcurrentDictionary<string, PlayerPoint> _players = new();
        private readonly TimeSpan _timeout;

        public PlayerTrackerService(Microsoft.Extensions.Options.IOptions<SaMapViewer.Services.SaOptions> options)
        {
            var seconds = Math.Max(1, options.Value.PlayerTtlSeconds);
            _timeout = TimeSpan.FromSeconds(seconds);
        }

        public void Update(string nick, float x, float y)
        {
            _players.AddOrUpdate(nick,
                _ => new PlayerPoint(nick, x, y),
                (_, existing) =>
                {
                    existing.Update(x, y);
                    return existing;
                });
        }

        public void SetStatus(string nick, string status)
        {
            _players.AddOrUpdate(nick,
                _ =>
                {
                    var p = new PlayerPoint(nick, 0, 0);
                    p.SetStatus(status);
                    return p;
                },
                (_, existing) =>
                {
                    existing.SetStatus(status);
                    return existing;
                });
        }

        public List<PlayerPoint> GetAlivePlayers()
        {
            var now = DateTime.UtcNow;
            return _players.Values
                .Where(p => now - p.LastUpdate < _timeout)
                .ToList();
        }
    }
}