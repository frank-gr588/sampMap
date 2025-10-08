using System;

namespace SaMapViewer.Models
{
    public class PlayerPoint
    {
        public string Nick { get; set; }
        public float X { get; set; }
        public float Y { get; set; }
        public string Status { get; set; }
        public DateTime LastUpdate { get; set; }

        public PlayerPoint(string nick, float x, float y)
        {
            Nick = nick;
            X = x;
            Y = y;
            Status = "ничего";
            LastUpdate = DateTime.UtcNow;
        }

        public void Update(float x, float y)
        {
            X = x;
            Y = y;
            LastUpdate = DateTime.UtcNow;
        }

        public void SetStatus(string status)
        {
            Status = status;
            LastUpdate = DateTime.UtcNow;
        }
    }
}