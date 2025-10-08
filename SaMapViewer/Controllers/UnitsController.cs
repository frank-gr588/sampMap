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
    public class UnitsController : ControllerBase
    {
        private readonly UnitsService _units;
        private readonly IHubContext<CoordsHub> _hub;
        private readonly HistoryService _history;
        private readonly Microsoft.Extensions.Options.IOptions<SaMapViewer.Services.SaOptions> _options;

        public UnitsController(UnitsService units, IHubContext<CoordsHub> hub, HistoryService history, Microsoft.Extensions.Options.IOptions<SaMapViewer.Services.SaOptions> options)
        {
            _units = units;
            _hub = hub;
            _history = history;
            _options = options;
        }

        public class CreateDto { public string Name { get; set; } = string.Empty; public string Marking { get; set; } = string.Empty; public bool IsRed { get; set; } }
        public class RenameDto { public string Name { get; set; } = string.Empty; public string Marking { get; set; } = string.Empty; }
        public class StatusDto { public string Status { get; set; } = string.Empty; }
        public class AttachSituationDto { public Guid? SituationId { get; set; } }
        public class PlayerDto { public string Nick { get; set; } = string.Empty; }
        public class ChannelDto { public Guid? ChannelId { get; set; } }

        [HttpPost]
        public ActionResult<Unit> Create([FromBody] CreateDto dto)
        {
            if (!CheckApiKey(Request, _options.Value.ApiKey)) return Unauthorized();
            var u = _units.Create(dto?.Name ?? string.Empty, dto?.Marking ?? string.Empty, dto?.IsRed == true);
            _hub.Clients.All.SendAsync("UnitCreated", u);
            _ = _history.AppendAsync(new { type = "unit_create", id = u.Id, u.Name, u.Marking, u.IsRed });
            return u;
        }

        [HttpGet("all")]
        public ActionResult<List<Unit>> GetAll() => _units.GetAll();

        [HttpDelete("{id}")]
        public IActionResult Delete(Guid id)
        {
            if (!CheckApiKey(Request, _options.Value.ApiKey)) return Unauthorized();
            _units.Delete(id);
            _hub.Clients.All.SendAsync("UnitDeleted", new { id });
            _ = _history.AppendAsync(new { type = "unit_delete", id });
            return Ok();
        }

        [HttpPost("{id}/rename")]
        public IActionResult Rename(Guid id, [FromBody] RenameDto dto)
        {
            if (!CheckApiKey(Request, _options.Value.ApiKey)) return Unauthorized();
            _units.Rename(id, dto?.Name ?? string.Empty, dto?.Marking ?? string.Empty);
            if (_units.TryGet(id, out var u))
            {
                _hub.Clients.All.SendAsync("UnitUpdated", u);
                _ = _history.AppendAsync(new { type = "unit_rename", id = u.Id, u.Name, u.Marking });
            }
            return Ok();
        }

        [HttpPost("{id}/status")]
        public IActionResult SetStatus(Guid id, [FromBody] StatusDto dto)
        {
            if (!CheckApiKey(Request, _options.Value.ApiKey)) return Unauthorized();
            _units.SetStatus(id, dto?.Status ?? string.Empty);
            if (_units.TryGet(id, out var u))
            {
                _hub.Clients.All.SendAsync("UnitUpdated", u);
                _ = _history.AppendAsync(new { type = "unit_status", id = u.Id, u.Status });
            }
            return Ok();
        }

        [HttpPost("{id}/attach-situation")]
        public IActionResult AttachSituation(Guid id, [FromBody] AttachSituationDto dto)
        {
            if (!CheckApiKey(Request, _options.Value.ApiKey)) return Unauthorized();
            _units.AttachToSituation(id, dto?.SituationId);
            if (_units.TryGet(id, out var u))
            {
                _hub.Clients.All.SendAsync("UnitUpdated", u);
                _ = _history.AppendAsync(new { type = "unit_attach_situation", id = u.Id, u.SituationId });
            }
            return Ok();
        }

        [HttpPost("{id}/set-red/{value}")]
        public IActionResult SetRed(Guid id, bool value)
        {
            if (!CheckApiKey(Request, _options.Value.ApiKey)) return Unauthorized();
            _units.SetRed(id, value);
            if (_units.TryGet(id, out var u))
            {
                _hub.Clients.All.SendAsync("UnitUpdated", u);
                _ = _history.AppendAsync(new { type = "unit_set_red", id = u.Id, u.IsRed });
            }
            return Ok();
        }

        [HttpPost("{id}/players/add")]
        public IActionResult AddPlayer(Guid id, [FromBody] PlayerDto dto)
        {
            if (!CheckApiKey(Request, _options.Value.ApiKey)) return Unauthorized();
            if (string.IsNullOrWhiteSpace(dto?.Nick)) return BadRequest();
            _units.AddPlayer(id, dto.Nick);
            if (_units.TryGet(id, out var u))
            {
                _hub.Clients.All.SendAsync("UnitUpdated", u);
                _ = _history.AppendAsync(new { type = "unit_add_player", id = u.Id, nick = dto.Nick });
            }
            return Ok();
        }

        [HttpPost("{id}/players/remove")]
        public IActionResult RemovePlayer(Guid id, [FromBody] PlayerDto dto)
        {
            if (!CheckApiKey(Request, _options.Value.ApiKey)) return Unauthorized();
            if (string.IsNullOrWhiteSpace(dto?.Nick)) return BadRequest();
            _units.RemovePlayer(id, dto.Nick);
            if (_units.TryGet(id, out var u))
            {
                _hub.Clients.All.SendAsync("UnitUpdated", u);
                _ = _history.AppendAsync(new { type = "unit_remove_player", id = u.Id, nick = dto.Nick });
            }
            return Ok();
        }

        [HttpPost("{id}/channel")]
        public IActionResult AssignTacticalChannel(Guid id, [FromBody] ChannelDto dto)
        {
            if (!CheckApiKey(Request, _options.Value.ApiKey)) return Unauthorized();
            _units.AssignTacticalChannel(id, dto?.ChannelId);
            if (_units.TryGet(id, out var u))
            {
                _hub.Clients.All.SendAsync("UnitUpdated", u);
                _ = _history.AppendAsync(new { type = "unit_assign_channel", id = u.Id, u.TacticalChannelId });
            }
            return Ok();
        }

        private static bool CheckApiKey(Microsoft.AspNetCore.Http.HttpRequest req, string expected)
        {
            if (string.IsNullOrEmpty(expected)) return true;
            if (!req.Headers.TryGetValue("x-api-key", out var k)) return false;
            return string.Equals(k.ToString(), expected, System.StringComparison.Ordinal);
        }
    }
}


