require 'lib.sampfuncs'
require 'lib.moonloader'

local http = require('socket.http')
local ltn12 = require('ltn12')

-- CONFIG
local API_BASE = 'http://127.0.0.1:5000' -- адрес бэкенда
local API_KEY = '' -- при необходимости укажи ключ
local SEND_INTERVAL_MS = 2000 -- отправка координат
local STATUS_INTERVAL_MS = 5000 -- проверка/отправка статуса
local AUTO_START = true -- автозапуск отслеживания при входе

-- RUNTIME
local enabled = false
local lastStatus = 'ничего'

-- json helpers (простой энкодер для строк/чисел/булевых/таблиц-объектов)
local function json_escape(s)
	return s:gsub('\\','\\\\'):gsub('"','\\"'):gsub('\n','\\n'):gsub('\r','\\r'):gsub('\t','\\t')
end

local function json_encode(v)
	local t = type(v)
	if t == 'string' then
		return '"' .. json_escape(v) .. '"'
	elseif t == 'number' or t == 'boolean' then
		return tostring(v)
	elseif t == 'table' then
		local parts = {}
		for k,val in pairs(v) do
			parts[#parts+1] = '"' .. json_escape(tostring(k)) .. '":' .. json_encode(val)
		end
		return '{' .. table.concat(parts, ',') .. '}'
	else
		return 'null'
	end
end

local function http_post_json(path, tbl)
	local body = json_encode(tbl)
	local headers = { ['Content-Type'] = 'application/json', ['Content-Length'] = tostring(#body) }
	if API_KEY ~= nil and API_KEY ~= '' then headers['x-api-key'] = API_KEY end
	local response_body = {}
	local _, code = http.request{
		url = API_BASE .. path,
		method = 'POST',
		headers = headers,
		source = ltn12.source.string(body),
		sink = ltn12.sink.table(response_body)
	}
	return code or 0
end

local function get_nickname()
	local ok, id = sampGetPlayerIdByCharHandle(PLAYER_PED)
	if ok then return sampGetPlayerNickname(id) end
	return 'unknown'
end

local function send_coords()
	if not doesCharExist(PLAYER_PED) then return end
	local x, y, z = getCharCoordinates(PLAYER_PED)
	http_post_json('/api/coords', { Nick = get_nickname(), X = x + 0.0, Y = y + 0.0 })
end

-- Простейшая логика статуса - скорректируй под свой мод
local function compute_status()
	if isCharInAnyCar(PLAYER_PED) then return 'On Patrol' end
	return 'ничего'
end

local function send_status_if_changed()
	local s = compute_status()
	if s ~= lastStatus then
		lastStatus = s
		http_post_json('/api/coords/status', { Nick = get_nickname(), Status = lastStatus })
	end
end

function main()
	while not isSampAvailable() do wait(100) end

	sampRegisterChatCommand('trackon', function()
		enabled = true
		sampAddChatMessage('[TRACK] started', 0x1E90FF)
	end)

	sampRegisterChatCommand('trackoff', function()
		enabled = false
		sampAddChatMessage('[TRACK] stopped', 0x1E90FF)
	end)

	sampRegisterChatCommand('status', function(arg)
		if arg == nil or arg == '' then
			sampAddChatMessage('[TRACK] Usage: /status <text>', 0xFFCC66)
			return
		end
		lastStatus = arg
		http_post_json('/api/coords/status', { Nick = get_nickname(), Status = lastStatus })
		sampAddChatMessage('[TRACK] Status sent: ' .. arg, 0x99FF99)
	end)

	if AUTO_START then enabled = true end

	local t1 = 0
	local t2 = 0
	while true do
		local now = os.clock() * 1000
		if enabled and (now - t1) >= SEND_INTERVAL_MS then
			local before = os.clock()
			send_coords()
			local after = os.clock()
			t1 = now
		end
		if enabled and (now - t2) >= STATUS_INTERVAL_MS then
			local code = 200
			-- we can optionally inspect status by forcing a send here
			send_status_if_changed()
			t2 = now
		end
		wait(50)
	end
end
