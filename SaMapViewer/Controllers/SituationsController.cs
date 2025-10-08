using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using SaMapViewer.Hubs;
using SaMapViewer.Models;
using SaMapViewer.Services;
using System;
using System.Collections.Generic;

namespace SaMapViewer.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SituationsController : ControllerBase
    {
        private readonly SituationsService _situations;
        private readonly IHubContext<CoordsHub> _hub;
        private readonly HistoryService _history;
        private readonly Microsoft.Extensions.Options.IOptions<SaMapViewer.Services.SaOptions> _options;

        public SituationsController(SituationsService situations, IHubContext<CoordsHub> hub, HistoryService history, Microsoft.Extensions.Options.IOptions<SaMapViewer.Services.SaOptions> options)
        {
            _situations = situations;
            _hub = hub;
            _history = history;
            _options = options;
        }

        public class CreateDto
        {
            public string Type { get; set; } = string.Empty; // code7, pursuit, trafficstop, code6, 911
            public Dictionary<string, string> Metadata { get; set; } = new();
        }

        public class NickDto { public string Nick { get; set; } = string.Empty; }

        [HttpPost("create")]
        public ActionResult<Situation> Create([FromBody] CreateDto dto)
        {
            if (!CheckApiKey(Request, _options.Value.ApiKey)) return Unauthorized();
            if (string.IsNullOrWhiteSpace(dto?.Type)) return BadRequest();
            var sit = _situations.Create(dto.Type, dto.Metadata ?? new Dictionary<string, string>());
            _hub.Clients.All.SendAsync("SituationCreated", sit);
            _ = _history.AppendAsync(new { type = "situation_create", id = sit.Id, sit.Type, sit.Metadata });
            return sit;
        }

        [HttpPost("{id}/join")]
        public IActionResult Join(Guid id, [FromBody] NickDto dto)
        {
            if (!CheckApiKey(Request, _options.Value.ApiKey)) return Unauthorized();
            if (string.IsNullOrWhiteSpace(dto?.Nick)) return BadRequest();
            _situations.Join(id, dto.Nick);
            if (_situations.TryGet(id, out var s))
            {
                _hub.Clients.All.SendAsync("SituationUpdated", s);
                _hub.Clients.All.SendAsync("UpdatePlayerStatus", new { nick = dto.Nick, status = "" });
                _ = _history.AppendAsync(new { type = "situation_join", id = id, nick = dto.Nick });
            }
            return Ok();
        }

        [HttpPost("{id}/leave")]
        public IActionResult Leave(Guid id, [FromBody] NickDto dto)
        {
            if (!CheckApiKey(Request, _options.Value.ApiKey)) return Unauthorized();
            if (string.IsNullOrWhiteSpace(dto?.Nick)) return BadRequest();
            _situations.Leave(id, dto.Nick);
            if (_situations.TryGet(id, out var s))
            {
                _hub.Clients.All.SendAsync("SituationUpdated", s);
                _hub.Clients.All.SendAsync("UpdatePlayerStatus", new { nick = dto.Nick, status = "" });
                _ = _history.AppendAsync(new { type = "situation_leave", id = id, nick = dto.Nick });
            }
            return Ok();
        }

        [HttpGet("all")]
        public ActionResult<List<Situation>> GetAll()
        {
            return _situations.GetAll();
        }

        public class PanicDto { public string Nick { get; set; } = string.Empty; public int Value { get; set; } } // 0 or 1

        [HttpPost("panic")]
        public IActionResult Panic([FromBody] PanicDto dto)
        {
            if (!CheckApiKey(Request, _options.Value.ApiKey)) return Unauthorized();
            if (string.IsNullOrWhiteSpace(dto?.Nick)) return BadRequest();
            _situations.SetPanic(dto.Nick, dto.Value == 1);
            _hub.Clients.All.SendAsync("PanicUpdated", new { nick = dto.Nick, value = dto.Value });
            _hub.Clients.All.SendAsync("UpdatePlayerStatus", new { nick = dto.Nick, status = "" });
            _ = _history.AppendAsync(new { type = "panic", nick = dto.Nick, value = dto.Value });
            return Ok();
        }

        [HttpGet("history")]
        public IActionResult History()
        {
            // Историю отдаём как сырой файл для простоты (JSONL)
            var path = _options.Value.HistoryPath ?? "history.jsonl";
            if (!System.IO.File.Exists(path)) return Ok(new object[0]);
            var lines = System.IO.File.ReadAllLines(path);
            return File(System.Text.Encoding.UTF8.GetBytes(string.Join("\n", lines)), "application/jsonl");
        }

        static bool CheckApiKey(Microsoft.AspNetCore.Http.HttpRequest req, string expected)
        {
            if (string.IsNullOrEmpty(expected)) return true;
            if (!req.Headers.TryGetValue("x-api-key", out var k)) return false;
            return string.Equals(k.ToString(), expected, System.StringComparison.Ordinal);
        }
    }
}

