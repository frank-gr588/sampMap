using System;
using System.Collections.Generic;

namespace SaMapViewer.Models
{
    public class Unit
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Name { get; set; } = string.Empty; // Название юнита
        public string Marking { get; set; } = string.Empty; // Маркировка
        public int PlayerCount { get; set; } = 1; // Кол-во игроков
        public string Status { get; set; } = string.Empty; // Статус (с фронта)
        public Guid? SituationId { get; set; } // Прикреплённость к ситуации
        public bool IsRed { get; set; } // Главный юнит
        public HashSet<string> Players { get; set; } = new(StringComparer.OrdinalIgnoreCase); // Никнеймы игроков
        public Guid? TacticalChannelId { get; set; } // Какой тактический канал закреплён
    }
}


