using System;
using System.Collections.Generic;

namespace SaMapViewer.Models
{
    public class Situation
    {
        public Guid Id { get; set; }
        public string Type { get; set; } = string.Empty; // Code7, Pursuit, TrafficStop, Code6, 911
        public Dictionary<string, string> Metadata { get; set; } = new();
        public HashSet<string> Participants { get; set; } = new(StringComparer.OrdinalIgnoreCase);
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}

