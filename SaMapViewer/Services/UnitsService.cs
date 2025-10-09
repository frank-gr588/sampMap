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
        private readonly PlayerTrackerService _playerTracker;

        public UnitsService(PlayerTrackerService playerTracker)
        {
            _playerTracker = playerTracker;
        }

        public Unit CreateUnit(string marking, List<string> playerNicks, bool isLeadUnit = false)
        {
            // Валидация маркировки
            if (string.IsNullOrWhiteSpace(marking) || marking.Length > 8)
                throw new ArgumentException("Marking must be 1-8 characters");

            // Проверяем, что все игроки доступны для создания юнита
            foreach (var nick in playerNicks)
            {
                var player = _playerTracker.GetPlayer(nick);
                if (player == null)
                    throw new ArgumentException($"Player '{nick}' not found");

                if (player.UnitId.HasValue)
                    throw new InvalidOperationException($"Player '{nick}' is already in a unit");
            }

            var unit = new Unit 
            { 
                Marking = marking, 
                PlayerNicks = new HashSet<string>(playerNicks, StringComparer.OrdinalIgnoreCase),
                IsLeadUnit = isLeadUnit
            };

            _units[unit.Id] = unit;

            // Назначаем игроков в юнит
            foreach (var nick in playerNicks)
            {
                var player = _playerTracker.GetPlayer(nick);
                if (player != null)
                {
                    // Определяем статус игрока в юните
                    bool shouldBeLead = isLeadUnit || player.Role == PlayerRole.Supervisor || player.Role == PlayerRole.SuperSupervisor;
                    
                    if (shouldBeLead)
                    {
                        _playerTracker.SetPlayerStatus(nick, PlayerStatus.OnDutyLeadUnit);
                        unit.IsLeadUnit = true;
                    }
                    else
                    {
                        _playerTracker.SetPlayerStatus(nick, PlayerStatus.OnDuty);
                    }

                    _playerTracker.AssignPlayerToUnit(nick, unit.Id);
                }
            }

            return unit;
        }

        public Unit CreateUnitFromSinglePlayer(string marking, string playerNick, bool isLeadUnit = false)
        {
            return CreateUnit(marking, new List<string> { playerNick }, isLeadUnit);
        }

        public Unit? GetUnit(Guid id)
        {
            _units.TryGetValue(id, out var unit);
            return unit;
        }

        public bool TryGet(Guid id, out Unit? unit) => _units.TryGetValue(id, out unit);

        public List<Unit> GetAll() => _units.Values.OrderBy(u => u.Marking).ToList();

        public void RemoveUnit(Guid id)
        {
            if (_units.TryGetValue(id, out var unit))
            {
                // Освобождаем всех игроков из юнита
                foreach (var nick in unit.PlayerNicks.ToList())
                {
                    _playerTracker.RemovePlayerFromUnit(nick);
                }

                _units.TryRemove(id, out _);
            }
        }

        public void AddPlayerToUnit(Guid unitId, string playerNick)
        {
            var unit = GetUnit(unitId);
            if (unit == null)
                throw new ArgumentException($"Unit {unitId} not found");

            var player = _playerTracker.GetPlayer(playerNick);
            if (player == null)
                throw new ArgumentException($"Player '{playerNick}' not found");

            if (player.UnitId.HasValue)
                throw new InvalidOperationException($"Player '{playerNick}' is already in a unit");

            // Добавляем игрока в юнит
            unit.PlayerNicks.Add(playerNick);

            // Определяем статус игрока в юните
            // Если игрок - супервайзер, юнит автоматически становится ведущим
            bool shouldBeLead = unit.IsLeadUnit || player.Role == PlayerRole.Supervisor || player.Role == PlayerRole.SuperSupervisor;
            
            if (shouldBeLead)
            {
                _playerTracker.SetPlayerStatus(playerNick, PlayerStatus.OnDutyLeadUnit);
                unit.IsLeadUnit = true; // Обновляем флаг юнита
            }
            else
            {
                _playerTracker.SetPlayerStatus(playerNick, PlayerStatus.OnDuty);
            }

            _playerTracker.AssignPlayerToUnit(playerNick, unitId);
        }

        public void RemovePlayerFromUnit(Guid unitId, string playerNick)
        {
            var unit = GetUnit(unitId);
            if (unit == null)
                return;

            if (unit.PlayerNicks.Remove(playerNick))
            {
                _playerTracker.RemovePlayerFromUnit(playerNick);

                // Если юнит стал пустым, удаляем его
                if (unit.PlayerNicks.Count == 0)
                {
                    RemoveUnit(unitId);
                }
                else
                {
                    // Проверяем, остались ли супервайзеры в юните
                    bool hasSupervisors = unit.PlayerNicks.Any(nick =>
                    {
                        var player = _playerTracker.GetPlayer(nick);
                        return player != null && (player.Role == PlayerRole.Supervisor || player.Role == PlayerRole.SuperSupervisor);
                    });

                    // Если супервайзеров не осталось, юнит больше не ведущий
                    if (!hasSupervisors && unit.IsLeadUnit)
                    {
                        unit.IsLeadUnit = false;
                        
                        // Обновляем статус всех оставшихся игроков
                        foreach (var nick in unit.PlayerNicks)
                        {
                            _playerTracker.SetPlayerStatus(nick, PlayerStatus.OnDuty);
                        }
                    }
                }
            }
        }

        public void UpdateUnit(Guid id, string? marking = null)
        {
            if (_units.TryGetValue(id, out var unit))
            {
                if (marking != null)
                {
                    if (marking.Length > 8)
                        throw new ArgumentException("Marking must be max 8 characters");
                    unit.Marking = marking;
                }
            }
        }

        public void SetUnitStatus(Guid id, string status)
        {
            if (_units.TryGetValue(id, out var unit))
            {
                unit.Status = status ?? string.Empty;
            }
        }

        public void AttachToSituation(Guid id, Guid? situationId)
        {
            if (_units.TryGetValue(id, out var unit))
            {
                unit.SituationId = situationId;
            }
        }

        public void SetLeadUnit(Guid id, bool isLeadUnit)
        {
            if (_units.TryGetValue(id, out var unit))
            {
                unit.IsLeadUnit = isLeadUnit;

                // Обновляем статус всех игроков в юните
                foreach (var nick in unit.PlayerNicks)
                {
                    var player = _playerTracker.GetPlayer(nick);
                    if (player != null)
                    {
                        bool shouldBeLead = isLeadUnit && (player.Role == PlayerRole.Supervisor || player.Role == PlayerRole.SuperSupervisor);
                        var newStatus = shouldBeLead ? PlayerStatus.OnDutyLeadUnit : PlayerStatus.OnDuty;
                        _playerTracker.SetPlayerStatus(nick, newStatus);
                    }
                }
            }
        }

        public void AssignTacticalChannel(Guid id, Guid? channelId)
        {
            if (_units.TryGetValue(id, out var unit))
            {
                unit.TacticalChannelId = channelId;
            }
        }

        public List<Unit> GetUnitsBySituation(Guid situationId)
        {
            return _units.Values
                .Where(u => u.SituationId == situationId)
                .ToList();
        }

        public List<Unit> GetAvailableUnits()
        {
            return _units.Values
                .Where(u => !u.SituationId.HasValue)
                .ToList();
        }

        public string? GetLeadPlayerNick(Guid unitId)
        {
            var unit = GetUnit(unitId);
            if (unit == null) return null;

            // Ищем supervisor или supersupervisor
            foreach (var nick in unit.PlayerNicks)
            {
                var player = _playerTracker.GetPlayer(nick);
                if (player?.Role == PlayerRole.SuperSupervisor)
                    return nick;
            }
            
            foreach (var nick in unit.PlayerNicks)
            {
                var player = _playerTracker.GetPlayer(nick);
                if (player?.Role == PlayerRole.Supervisor)
                    return nick;
            }
            
            // Если нет supervisor'ов, возвращаем первого игрока
            return unit.PlayerNicks.FirstOrDefault();
        }

        public List<PlayerPoint> GetPlayersInUnit(Guid unitId)
        {
            var unit = GetUnit(unitId);
            if (unit == null) return new List<PlayerPoint>();

            var players = new List<PlayerPoint>();
            foreach (var nick in unit.PlayerNicks)
            {
                var player = _playerTracker.GetPlayer(nick);
                if (player != null)
                {
                    players.Add(player);
                }
            }
            return players;
        }

        // Устаревшие методы для обратной совместимости
        [Obsolete("Use CreateUnit with List<string> playerNicks instead")]
        public Unit CreateUnit(string marking, string playerNick, bool isLeadUnit = false)
        {
            return CreateUnitFromSinglePlayer(marking, playerNick, isLeadUnit);
        }

        [Obsolete("Use RemoveUnit instead")]
        public void Delete(Guid id) => RemoveUnit(id);

        [Obsolete("Use UpdateUnit instead")]
        public void Rename(Guid id, string marking) => UpdateUnit(id, marking);

        [Obsolete("Use SetUnitStatus instead")]
        public void SetStatus(Guid id, string status) => SetUnitStatus(id, status);

        [Obsolete("Use SetLeadUnit instead")]
        public void SetRed(Guid id, bool isRed) => SetLeadUnit(id, isRed);

        [Obsolete("Use AddPlayerToUnit instead")]
        public void AddPlayer(Guid id, string nick) => AddPlayerToUnit(id, nick);

        [Obsolete("Use RemovePlayerFromUnit instead")]
        public void RemovePlayer(Guid id, string nick) => RemovePlayerFromUnit(id, nick);
    }
}


