using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using SaMapViewer.Hubs;
using SaMapViewer.Models;
using SaMapViewer.Services;
using System;
using System.Collections.Generic;

namespace SaMapViewer.Controllers
{
    public class RenameDto
    {
        public string? Marking { get; set; }
    }

    public class PlayerDto
    {
        public string? Nick { get; set; }
    }
}

namespace SaMapViewer.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UnitsController : ControllerBase
    {
        private readonly UnitsService _units;
        private readonly PlayerTrackerService _playerTracker;
        private readonly IHubContext<CoordsHub> _hub;
        private readonly HistoryService _history;
        private readonly Microsoft.Extensions.Options.IOptions<SaMapViewer.Services.SaOptions> _options;

        public UnitsController(
            UnitsService units, 
            PlayerTrackerService playerTracker,
            IHubContext<CoordsHub> hub, 
            HistoryService history, 
            Microsoft.Extensions.Options.IOptions<SaMapViewer.Services.SaOptions> options)
        {
            _units = units;
            _playerTracker = playerTracker;
            _hub = hub;
            _history = history;
            _options = options;
        }

        public class CreateUnitDto 
        { 
            public string Marking { get; set; } = string.Empty; 
            public string PlayerNick { get; set; } = string.Empty;
            public bool IsLeadUnit { get; set; } 
        }
        
        public class UpdateUnitDto 
        { 
            public string? Marking { get; set; } 
        }
        
        public class StatusDto { public string Status { get; set; } = string.Empty; }
        public class AttachSituationDto { public Guid? SituationId { get; set; } }
        public class LeadUnitDto { public bool IsLeadUnit { get; set; } }
        public class ChannelDto { public Guid? ChannelId { get; set; } }

        [HttpPost]
        public ActionResult<Unit> CreateUnit([FromBody] CreateUnitDto dto)
        {
            if (!CheckApiKey(Request, _options.Value.ApiKey)) return Unauthorized();
            
            if (string.IsNullOrWhiteSpace(dto.PlayerNick))
                return BadRequest("PlayerNick is required");

            try
            {
                var unit = _units.CreateUnitFromSinglePlayer(dto.Marking, dto.PlayerNick, dto.IsLeadUnit);
                _hub.Clients.All.SendAsync("UnitCreated", unit);
                _ = _history.AppendAsync(new { type = "unit_create", id = unit.Id, unit.Marking, playerNick = dto.PlayerNick, unit.IsLeadUnit });
                return unit;
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(ex.Message);
            }
        }

        [HttpGet]
        public ActionResult<List<Unit>> GetAllUnits() => _units.GetAll();

        [HttpGet("{id}")]
        public ActionResult<Unit> GetUnit(Guid id)
        {
            var unit = _units.GetUnit(id);
            if (unit == null)
                return NotFound($"Unit with ID {id} not found");
            return unit;
        }

        [HttpDelete("{id}")]
        public IActionResult DeleteUnit(Guid id)
        {
            if (!CheckApiKey(Request, _options.Value.ApiKey)) return Unauthorized();
            _units.RemoveUnit(id);
            _hub.Clients.All.SendAsync("UnitDeleted", new { id });
            _ = _history.AppendAsync(new { type = "unit_delete", id });
            return Ok();
        }

        [HttpPost("{id}/rename")]
        public IActionResult Rename(Guid id, [FromBody] RenameDto dto)
        {
            if (!CheckApiKey(Request, _options.Value.ApiKey)) return Unauthorized();
            _units.UpdateUnit(id, dto?.Marking ?? string.Empty);
            if (_units.TryGet(id, out var u) && u != null)
            {
                _hub.Clients.All.SendAsync("UnitUpdated", u);
                _ = _history.AppendAsync(new { type = "unit_rename", id = u.Id, u.Marking });
            }
            return Ok();
        }

        [HttpPost("{id}/status")]
        public IActionResult SetStatus(Guid id, [FromBody] StatusDto dto)
        {
            if (!CheckApiKey(Request, _options.Value.ApiKey)) return Unauthorized();
            _units.SetUnitStatus(id, dto?.Status ?? string.Empty);
            if (_units.TryGet(id, out var u) && u != null)
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
            if (_units.TryGet(id, out var u) && u != null)
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
            _units.SetLeadUnit(id, value);
            if (_units.TryGet(id, out var u) && u != null)
            {
                _hub.Clients.All.SendAsync("UnitUpdated", u);
                _ = _history.AppendAsync(new { type = "unit_set_red", id = u.Id, u.IsLeadUnit });
            }
            return Ok();
        }

        [HttpPost("{id}/players/add")]
        public IActionResult AddPlayer(Guid id, [FromBody] PlayerDto dto)
        {
            if (!CheckApiKey(Request, _options.Value.ApiKey)) return Unauthorized();
            if (string.IsNullOrWhiteSpace(dto?.Nick)) return BadRequest();
            _units.AddPlayerToUnit(id, dto.Nick);
            if (_units.TryGet(id, out var u) && u != null)
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
            _units.RemovePlayerFromUnit(id, dto.Nick);
            if (_units.TryGet(id, out var u) && u != null)
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
            if (_units.TryGet(id, out var u) && u != null)
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


