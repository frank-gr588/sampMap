# NYD v12.1 - Изменения системы юнитов и ситуаций

## Три типа юнитов на ситуации

### 1. Green Unit (Инициатор)
- **Автоматически назначается**: Первый юнит, который присоединяется к ситуации
- **Хранится в**: `Situation.GreenUnitId`
- **Роль**: Юнит который инициировал ситуацию (создал или первым присоединился)

### 2. Red Unit (Командир)
- **Автоматически назначается**: Когда в юните появляется игрок с рангом сержант или выше
- **Хранится в**: `Situation.RedUnitId`
- **Роль**: Командующий юнит на ситуации
- **Логика**:
  - По умолчанию равен Green Unit
  - Автоматически обновляется при добавлении юнита с сержантом на ситуацию
  - Проверка ранга: `PlayerRank <= PlayerRank.PoliceSergeant` (численно меньше = выше ранг)
  - Если Red Unit покидает ситуацию, Red Unit возвращается к Green Unit

### 3. Regular Units (Обычные юниты)
- **Все остальные**: Юниты которые не являются Green или Red
- **Получение списка**: `SituationsService.GetRegularUnits(situationId)`

## Изменения в Backend

### Models/Situation.cs
```csharp
public Guid? GreenUnitId { get; set; }  // Инициатор
public Guid? RedUnitId { get; set; }     // Командир (сержант+)

// Методы:
void AddUnit(Guid unitId, bool isInitiator = false)
void RemoveUnit(Guid unitId)
void SetRedUnit(Guid unitId)
void ResetRedUnitToGreen()
```

### Services/SituationsService.cs
```csharp
// Обновлённые методы:
void AddUnitToSituation(Guid situationId, Guid unitId, bool asInitiator = false)
- Автоматически устанавливает первый юнит как Green
- Вызывает CheckAndAssignRedUnit() для проверки сержантов

// Новые методы:
void CheckAndAssignRedUnit(Guid situationId, Guid unitId)
- Проверяет всех игроков в юните
- Если ранг <= PoliceSergeant, назначает Red Unit

Unit? GetGreenUnit(Guid situationId)
Unit? GetRedUnit(Guid situationId)
List<Unit> GetRegularUnits(Guid situationId)
void SetRedUnit(Guid situationId, Guid unitId)
```

### Controllers/UnitsControllerNew.cs
```csharp
// AddPlayerToUnitDto - без изменений
public class AddPlayerToUnitDto
{
    public string PlayerNick { get; set; } = string.Empty;
}

// POST /api/units/{id}/players/add
// Body: { "playerNick": "Nick_Name" }
```

## Изменения в Lua Script

### track_samp_Version3.lua

#### Новая функция:
```lua
local function add_player_to_unit_by_id(unitId, playerId)
    -- Проверяет подключен ли игрок
    -- Получает ник через sampGetPlayerNickname(playerId)
    -- Отправляет POST /api/units/{unitId}/players/add с { PlayerNick = nickname }
end
```

#### Обновлённый UI (окно Units):
- Добавлено поле ввода для SA-MP ID игрока
- Кнопка "Add Player" для добавления игрока по ID
- ID автоматически сбрасывается после добавления

#### Новая команда:
```
/addplayer <unitId> <playerId>
```
**Пример**: `/addplayer abc123-def4-5678-90ab-cdef12345678 5`

## Порядок приоритетов на ситуации

1. **Chief of Police** (0) - Начальник полиции
2. **Assistant Chief** (1) - Помощник начальника  
3. **Deputy Chief** (2) - Заместитель начальника
4. **Commander** (3) - Командир
5. **Captain** (4) - Капитан
6. **Lieutenant** (5) - Лейтенант
7. **Sergeant** (6) - Сержант ⬅️ **ПОРОГ для Red Unit**
8. **Inspector** (7) - Инспектор
9. **Officer** (8) - Офицер

**Важно**: Ранги хранятся как enum с численными значениями. Меньше число = выше ранг.
Red Unit назначается при `PlayerRank <= 6` (Sergeant или выше).

## Примеры использования

### Создание ситуации и добавление юнитов

```csharp
// 1. Создаём ситуацию
var situation = situationsService.Create("Code7", metadata);

// 2. Первый юнит становится Green и Red
situationsService.AddUnitToSituation(situation.Id, unit1.Id, asInitiator: true);
// → GreenUnitId = unit1.Id
// → RedUnitId = unit1.Id (по умолчанию)

// 3. Добавляем юнит с сержантом
var sergeantUnit = unitsService.CreateUnit("2-A-1", new List<string> { "Sergeant_Nick" });
situationsService.AddUnitToSituation(situation.Id, sergeantUnit.Id);
// → CheckAndAssignRedUnit() автоматически обновляет
// → RedUnitId = sergeantUnit.Id (сержант обнаружен!)

// 4. Добавляем обычный юнит
situationsService.AddUnitToSituation(situation.Id, unit3.Id);
// → unit3 становится regular unit
```

### Lua Script - Добавление игрока в юнит

```lua
-- Через UI:
1. Открыть /units
2. Найти нужный юнит
3. Ввести ID игрока в поле "Add player by ID"
4. Нажать "Add Player"

-- Через команду:
/addplayer <unitId> <playerId>
```

### API запросы

```bash
# Добавить игрока по нику (Lua скрипт автоматически конвертирует ID в ник)
POST http://localhost:5000/api/units/{unitId}/players/add
Content-Type: application/json
{
  "playerNick": "John_Doe"
}
```

## TODO для фронтенда

### SituationsPanel.tsx нужно обновить:

```typescript
interface SituationDisplay {
  id: string;
  type: string;
  greenUnitId?: string;    // Инициатор
  redUnitId?: string;      // Командир
  units: string[];         // Все юниты
}

// Отображение:
// 🟢 Green Unit: 2-A-5 (Инициатор)
// 🔴 Red Unit: 2-A-1 (Командир - Sergeant+)
// ⚪ Regular Units: 2-A-3, 2-A-7, 2-B-2
```

## Тестирование

### Сценарий 1: Инициатор становится командиром
1. Создать юнит с офицером
2. Создать ситуацию и добавить этот юнит
3. ✅ Green Unit = этот юнит
4. ✅ Red Unit = этот юнит (по умолчанию)

### Сценарий 2: Приходит сержант
1. Создать юнит с сержантом
2. Добавить к существующей ситуации
3. ✅ Red Unit автоматически меняется на юнит сержанта
4. ✅ Green Unit остаётся прежним

### Сценарий 3: Сержант уходит
1. Удалить Red Unit с ситуации
2. ✅ Red Unit возвращается к Green Unit

### Сценарий 4: Добавление игрока по ID
1. Запустить игру SA-MP
2. Узнать ID игрока (например, TAB menu показывает ID 5)
3. `/addplayer <unitId> 5`
4. ✅ Система получает ник через sampGetPlayerNickname(5)
5. ✅ Отправляет ник на сервер
6. ✅ Игрок добавляется в юнит

## Обратная совместимость

- Старый код с `LeadUnitId` и `GreenUnits` удалён
- API endpoint для добавления игроков остался прежним `/api/units/{id}/players/add`
- Поддерживается как `PlayerNick` так и `CharacterId` в теле запроса
- Lua скрипт обратно совместим - можно использовать ник напрямую

## Известные ограничения

1. Lua скрипт требует активную SA-MP сессию для получения ников по ID через `sampGetPlayerNickname()`
2. Если игрок не подключен к серверу, его ID невозможно конвертировать в ник
3. Фронтенд ещё не обновлён для отображения Green/Red юнитов
