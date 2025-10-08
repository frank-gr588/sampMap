using System;

namespace SaMapViewer.Models
{
    public enum PlayerStatus
    {
        OutOfDuty,      // вне службы
        OnDuty,         // на службе (без юнита)
        OnDutyLeadUnit, // на службе (ведущий юнита)
        OnDutyOutOfUnit // на службе (вне юнита)
    }

    public enum PlayerRole
    {
        Officer,          // офицер
        Supervisor,       // супервайзер
        SuperSupervisor   // суперсупервайзер
    }

    public class PlayerPoint
    {
        public string Nick { get; set; }
        public float X { get; set; }
        public float Y { get; set; }
        public PlayerStatus Status { get; set; }
        public PlayerRole Role { get; set; }
        public Guid? UnitId { get; set; }  // ID юнита, в котором находится игрок
        public DateTime LastUpdate { get; set; }

        public PlayerPoint(string nick, float x, float y)
        {
            Nick = nick;
            X = x;
            Y = y;
            Status = PlayerStatus.OutOfDuty;
            Role = PlayerRole.Officer;
            LastUpdate = DateTime.UtcNow;
        }

        public void Update(float x, float y)
        {
            X = x;
            Y = y;
            LastUpdate = DateTime.UtcNow;
        }

        public void SetStatus(PlayerStatus status)
        {
            Status = status;
            LastUpdate = DateTime.UtcNow;
        }

        public void SetRole(PlayerRole role)
        {
            Role = role;
            LastUpdate = DateTime.UtcNow;
        }

        public void AssignToUnit(Guid unitId)
        {
            UnitId = unitId;
            Status = PlayerStatus.OnDuty;
            LastUpdate = DateTime.UtcNow;
        }

        public void RemoveFromUnit()
        {
            UnitId = null;
            Status = PlayerStatus.OnDutyOutOfUnit;
            LastUpdate = DateTime.UtcNow;
        }
    }
}