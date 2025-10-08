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

        // Устаревший метод для совместимости с Lua скриптом
        public void Update(string nick, float x, float y)
        {
            UpdatePlayer(nick, x, y);
        }

        public void UpdatePlayer(string nick, float x, float y)
        {
            _players.AddOrUpdate(nick,
                _ => new PlayerPoint(nick, x, y),
                (_, existing) =>
                {
                    existing.Update(x, y);
                    return existing;
                });
        }

        // Устаревший метод для совместимости с Lua скриптом
        public void SetStatus(string nick, string status)
        {
            // Конвертация старых строковых статусов в новые enum
            var playerStatus = status.ToLower() switch
            {
                "ничего" => PlayerStatus.OutOfDuty,
                "patrol" => PlayerStatus.OnDuty,
                "lead" => PlayerStatus.OnDutyLeadUnit,
                _ => PlayerStatus.OnDuty
            };

            SetPlayerStatus(nick, playerStatus);
        }

        public void SetPlayerStatus(string nick, PlayerStatus status)
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

        public PlayerPoint? GetPlayer(string nick)
        {
            _players.TryGetValue(nick, out var player);
            return player;
        }

        public List<PlayerPoint> GetAllPlayers()
        {
            return _players.Values.ToList();
        }

        public List<PlayerPoint> GetAlivePlayers()
        {
            var now = DateTime.UtcNow;
            return _players.Values
                .Where(p => now - p.LastUpdate < _timeout)
                .ToList();
        }

        public void RemovePlayer(string nick)
        {
            _players.TryRemove(nick, out _);
        }

        public List<PlayerPoint> GetPlayersByStatus(PlayerStatus status)
        {
            return _players.Values
                .Where(p => p.Status == status)
                .ToList();
        }

        public List<PlayerPoint> GetPlayersByRole(PlayerRole role)
        {
            return _players.Values
                .Where(p => p.Role == role)
                .ToList();
        }

        public List<PlayerPoint> GetAvailablePlayersForUnit()
        {
            return _players.Values
                .Where(p => p.Status == PlayerStatus.OnDutyOutOfUnit || p.Status == PlayerStatus.OnDuty)
                .Where(p => !p.UnitId.HasValue)
                .ToList();
        }

        public void AssignPlayerToUnit(string nick, Guid unitId)
        {
            if (_players.TryGetValue(nick, out var player))
            {
                player.AssignToUnit(unitId);
            }
        }

        public void RemovePlayerFromUnit(string nick)
        {
            if (_players.TryGetValue(nick, out var player))
            {
                player.RemoveFromUnit();
            }
        }
    }
}