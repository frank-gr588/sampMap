using System;
using System.Collections.Generic;

namespace SaMapViewer.Models
{
    public class Situation
    {
        public Guid Id { get; set; }
        public string Type { get; set; } = string.Empty; // Code7, Pursuit, TrafficStop, Code6, 911
        public Dictionary<string, string> Metadata { get; set; } = new();
        public HashSet<Guid> Units { get; set; } = new(); // ID юнитов на ситуации
        public Guid? LeadUnitId { get; set; } // Red unit (ведущий юнит)
        public HashSet<Guid> GreenUnits { get; set; } = new(); // Green units (обычные юниты)
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsActive { get; set; } = true;

        // Добавить юнит на ситуацию
        public void AddUnit(Guid unitId, bool isLead = false)
        {
            Units.Add(unitId);
            
            if (isLead)
            {
                LeadUnitId = unitId;
            }
            else
            {
                GreenUnits.Add(unitId);
            }
        }

        // Удалить юнит с ситуации
        public void RemoveUnit(Guid unitId)
        {
            Units.Remove(unitId);
            GreenUnits.Remove(unitId);
            
            if (LeadUnitId == unitId)
            {
                LeadUnitId = null;
            }
        }

        // Сделать юнит ведущим
        public void SetLeadUnit(Guid unitId)
        {
            if (Units.Contains(unitId))
            {
                // Убираем старый lead unit в green units
                if (LeadUnitId.HasValue)
                {
                    GreenUnits.Add(LeadUnitId.Value);
                }
                
                // Устанавливаем новый lead unit
                LeadUnitId = unitId;
                GreenUnits.Remove(unitId);
            }
        }
    }
}

