using Microsoft.AspNetCore.Mvc;
using SaMapViewer.Models;
using SaMapViewer.Services;

namespace SaMapViewer.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PlayersController : ControllerBase
    {
        private readonly PlayerTrackerService _playerTracker;
        private readonly UnitsService _unitsService;

        public PlayersController(PlayerTrackerService playerTracker, UnitsService unitsService)
        {
            _playerTracker = playerTracker;
            _unitsService = unitsService;
        }

        [HttpGet]
        public ActionResult<IEnumerable<PlayerPoint>> GetAllPlayers()
        {
            return Ok(_playerTracker.GetAllPlayers());
        }

        [HttpGet("{nick}")]
        public ActionResult<PlayerPoint> GetPlayer(string nick)
        {
            var player = _playerTracker.GetPlayer(nick);
            if (player == null)
                return NotFound($"Player '{nick}' not found");
            
            return Ok(player);
        }

        [HttpPost]
        public ActionResult<PlayerPoint> CreatePlayer([FromBody] CreatePlayerRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Nick))
                return BadRequest("Nick is required");

            var existingPlayer = _playerTracker.GetPlayer(request.Nick);
            if (existingPlayer != null)
                return Conflict($"Player '{request.Nick}' already exists");

            var player = new PlayerPoint(request.Nick, request.X ?? 0, request.Y ?? 0);
            if (request.Role.HasValue)
                player.SetRole(request.Role.Value);
            if (request.Status.HasValue)
                player.SetStatus(request.Status.Value);

            _playerTracker.UpdatePlayer(player.Nick, player.X, player.Y);
            return CreatedAtAction(nameof(GetPlayer), new { nick = player.Nick }, player);
        }

        [HttpPut("{nick}/status")]
        public ActionResult UpdatePlayerStatus(string nick, [FromBody] UpdateStatusRequest request)
        {
            var player = _playerTracker.GetPlayer(nick);
            if (player == null)
                return NotFound($"Player '{nick}' not found");

            player.SetStatus(request.Status);
            return Ok(player);
        }

        [HttpPut("{nick}/role")]
        public ActionResult UpdatePlayerRole(string nick, [FromBody] UpdateRoleRequest request)
        {
            var player = _playerTracker.GetPlayer(nick);
            if (player == null)
                return NotFound($"Player '{nick}' not found");

            player.SetRole(request.Role);
            return Ok(player);
        }

        [HttpDelete("{nick}")]
        public ActionResult DeletePlayer(string nick)
        {
            var player = _playerTracker.GetPlayer(nick);
            if (player == null)
                return NotFound($"Player '{nick}' not found");

            // Если игрок в юните, освобождаем его
            if (player.UnitId.HasValue)
            {
                var unit = _unitsService.GetUnit(player.UnitId.Value);
                if (unit != null)
                {
                    _unitsService.RemoveUnit(unit.Id);
                }
            }

            _playerTracker.RemovePlayer(nick);
            return NoContent();
        }

        [HttpGet("by-status/{status}")]
        public ActionResult<IEnumerable<PlayerPoint>> GetPlayersByStatus(PlayerStatus status)
        {
            var players = _playerTracker.GetAllPlayers()
                .Where(p => p.Status == status);
            return Ok(players);
        }

        [HttpGet("by-role/{role}")]
        public ActionResult<IEnumerable<PlayerPoint>> GetPlayersByRole(PlayerRole role)
        {
            var players = _playerTracker.GetAllPlayers()
                .Where(p => p.Role == role);
            return Ok(players);
        }

        [HttpGet("available-for-unit")]
        public ActionResult<IEnumerable<PlayerPoint>> GetAvailablePlayersForUnit()
        {
            var players = _playerTracker.GetAllPlayers()
                .Where(p => p.Status == PlayerStatus.OnDutyOutOfUnit || p.Status == PlayerStatus.OnDuty)
                .Where(p => !p.UnitId.HasValue);
            return Ok(players);
        }
    }

    public class CreatePlayerRequest
    {
        public string Nick { get; set; } = string.Empty;
        public float? X { get; set; }
        public float? Y { get; set; }
        public PlayerRole? Role { get; set; }
        public PlayerStatus? Status { get; set; }
    }

    public class UpdateStatusRequest
    {
        public PlayerStatus Status { get; set; }
    }

    public class UpdateRoleRequest
    {
        public PlayerRole Role { get; set; }
    }
}