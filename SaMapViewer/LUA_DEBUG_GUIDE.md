# 🐛 Debug System Guide - Lua Tracker

## 🎯 Система отладки

В скрипт добавлена мощная система отладки с несколькими уровнями логирования и инструментами диагностики.

---

## 📊 Уровни логирования

### 1. **DEBUG** (Level 1)
Детальная информация для глубокой отладки:
- Каждый API запрос (метод, URL, данные)
- Каждый API ответ (статус, время, тело)
- Движение игрока (расстояние)
- Обновление локации (Panic/Pursuit)
- Координаты каждую отправку
- Загрузка модулей

**Когда использовать:** При поиске причин ошибок

---

### 2. **INFO** (Level 2) - По умолчанию
Обычная информация о работе:
- Инициализация скрипта
- Создание юнитов
- Создание ситуаций
- Подключение к API

**Когда использовать:** Обычная работа

---

### 3. **WARN** (Level 3)
Предупреждения:
- AFK статус установлен
- ImGui не загружен
- Цель погони потеряна

**Когда использовать:** Для отслеживания проблемных ситуаций

---

### 4. **ERROR** (Level 4)
Только ошибки:
- API не отвечает
- Неверный статус код
- Не удалось создать юнит/ситуацию

**Когда использовать:** Только критичные проблемы

---

## ⌨️ Команда /debug

### Базовое использование
```
/debug                    → Показать все доступные команды
```

---

### Включение/выключение режима отладки

#### Включить DEBUG режим
```
/debug on
```

**Что происходит:**
- ✅ DEBUG_MODE = true
- ✅ Уровень логирования = DEBUG (1)
- ✅ Все сообщения DEBUG выводятся в чат
- ✅ Дополнительные данные в логах

**Вывод:**
```
[SAPD Tracker] Debug mode ENABLED
```

---

#### Выключить DEBUG режим
```
/debug off
```

**Что происходит:**
- ✅ DEBUG_MODE = false
- ✅ Уровень логирования = INFO (2)
- ✅ DEBUG сообщения только в moonloader.log

**Вывод:**
```
[SAPD Tracker] Debug mode DISABLED
```

---

### Просмотр текущего состояния

```
/debug state
```

**Показывает:**
- Ник игрока
- AFK статус
- Активна ли паника
- Текущий юнит (marking, статус, участники)
- Текущая ситуация (тип)
- Цель погони (ID игрока)
- Текущие координаты
- Текущая локация

**Пример вывода:**
```
=== DEBUG: Current State ===
Player: YourNick
AFK: false
In Panic: false
Current Unit: 1-A-12
Unit Members: YourNick, PartnerNick
Unit Status: Code 3
Position: 1544.2, -1353.5, 13.5
Location: Commerce, Los Santos
```

---

### Просмотр конфигурации

```
/debug config
```

**Показывает:**
- API URL
- API Key
- Интервал обновления координат
- Интервал проверки AFK
- Порог AFK (секунды)
- Интервал обновления локации
- Статус DEBUG режима
- Статус загрузки ImGui

**Пример вывода:**
```
=== DEBUG: Configuration ===
API URL: http://localhost:5000/api
API Key: changeme-key
Update Interval: 5000 ms
AFK Check: 30000 ms
AFK Threshold: 300 sec
Location Update: 3000 ms
Debug Mode: true
ImGui Loaded: false
```

---

### Тест API соединения

```
/debug api
```

**Что делает:**
- Отправляет GET запрос к /health endpoint
- Проверяет статус код
- Измеряет время ответа

**Пример вывода (успех):**
```
Testing API connection...
[DEBUG] Testing API: http://localhost:5000/api
[DEBUG] API Response: 200
API connection OK (status: 200)
```

**Пример вывода (ошибка):**
```
Testing API connection...
[DEBUG] Testing API: http://localhost:5000/api
API connection FAILED - no response
[ERROR] API Test Failed: No response from server
```

---

### Изменение уровня логирования

```
/debug level [1-4]
```

**Уровни:**
- `1` = DEBUG (всё)
- `2` = INFO (обычно)
- `3` = WARN (предупреждения)
- `4` = ERROR (только ошибки)

**Примеры:**
```
/debug level 1            → Включить все логи
/debug level 3            → Только предупреждения и ошибки
/debug level 4            → Только ошибки
```

**Вывод:**
```
Log level set to: DEBUG
```

---

## 📝 Что логируется в DEBUG режиме

### API Запросы
```
[DEBUG] API Request: POST /coords
[DEBUG] Request Data: {"nick":"YourNick","x":1544.2,"y":-1353.5,"z":13.5,"isAFK":false}
[DEBUG] API Response: POST /coords - Status: 200 (45ms)
[DEBUG] Response Body: {"success":true}
```

### Отправка координат
```
[DEBUG] Sending coords: 1544.2, -1353.5, 13.5 (Commerce, Los Santos) AFK=false
```

### Проверка движения
```
[DEBUG] Player moved: 12.3m
[DEBUG] AFK status cleared (player moved)
```

**или**

```
[DEBUG] Player stationary: 2.1m
```

### Проверка AFK
```
[DEBUG] AFK Check: inactive for 245 sec (threshold: 300 sec)
```

**или**

```
[WARN] Player marked as AFK
```

### Обновление локации (Panic)
```
[DEBUG] Updating PANIC location: Temple, Los Santos
```

### Обновление локации (Pursuit)
```
[DEBUG] Updating PURSUIT target location: Ganton, Los Santos
```

**или**

```
[WARN] PURSUIT: Target handle not found (ID=25)
```

---

## 🔍 Примеры использования

### Сценарий 1: Координаты не отправляются

```
1. /debug on
2. Подождите 5 секунд
3. Смотрите логи в чате
```

**Что искать:**
```
[DEBUG] Sending coords: ...
[DEBUG] API Request: POST /coords
[DEBUG] API Response: ...
```

**Если нет "Sending coords":**
- Проблема в определении ника игрока

**Если нет "API Response":**
- Бэкенд не отвечает
- Неверный URL

---

### Сценарий 2: AFK не определяется

```
1. /debug on
2. Не двигайтесь 5+ минут
3. Смотрите логи
```

**Что искать:**
```
[DEBUG] Player stationary: 0.5m
[DEBUG] AFK Check: inactive for 310 sec (threshold: 300 sec)
[WARN] Player marked as AFK
```

**Если нет "Player stationary":**
- Игрок всё-таки двигается (камера, анимации)

---

### Сценарий 3: Panic не транслирует локацию

```
1. /debug on
2. /panic
3. Подвигайтесь
4. Смотрите логи каждые 3 секунды
```

**Что искать:**
```
[DEBUG] Updating PANIC location: Commerce, Los Santos
[DEBUG] API Request: PUT /situations/{id}/location
[DEBUG] API Response: ...
```

**Если нет "Updating PANIC location":**
- `state.isInPanic` не установлен
- `state.currentSituation` пуст

---

### Сценарий 4: API не отвечает

```
1. /debug api
```

**Успех:**
```
API connection OK (status: 200)
```

**Ошибка:**
```
API connection FAILED - no response
```

**Решение:**
- Запустите бэкенд: `dotnet run`
- Проверьте порт 5000
- Проверьте CONFIG.API_URL

---

## 📊 Анализ логов moonloader.log

### Где найти
```
GTA San Andreas/moonloader/moonloader.log
```

### Что искать

#### При загрузке скрипта
```
[SAPD Tracker] [INFO] Initializing for player: YourNick
[SAPD Tracker] [DEBUG] ImGui loaded successfully
[SAPD Tracker] [INFO] Debug mode: Use /debug on to enable detailed logging
[SAPD Tracker] [DEBUG] Configuration loaded: API=http://localhost:5000/api
[SAPD Tracker] [INFO] Tracker started! Use /unit to open menu
```

---

#### При отправке координат (каждые 5 секунд)
```
[SAPD Tracker] [DEBUG] Sending coords: 1544.2, -1353.5, 13.5 (Commerce, Los Santos) AFK=false
[SAPD Tracker] [DEBUG] API Request: POST /coords
[SAPD Tracker] [DEBUG] Request Data: {"nick":"YourNick",...}
[SAPD Tracker] [DEBUG] API Response: POST /coords - Status: 200 (42ms)
```

---

#### При проверке AFK (каждые 30 секунд)
```
[SAPD Tracker] [DEBUG] Player moved: 15.2m
[SAPD Tracker] [DEBUG] AFK Check: inactive for 32 sec (threshold: 300 sec)
```

---

#### При ошибках API
```
[SAPD Tracker] [ERROR] API No Response: POST /coords (5023ms)
```

---

## 🎯 Быстрая диагностика

### Проблема: Скрипт не загружается

**Команды:**
```
Проверьте moonloader.log на наличие:
[SAPD Tracker] [INFO] Initializing for player: ...
```

**Если нет:**
- Скрипт не в папке moonloader/
- Ошибка в скрипте (читайте начало лога)

---

### Проблема: API не работает

**Команды:**
```
/debug on
/debug api
```

**Смотрите:**
- API connection OK → Всё ок
- API connection FAILED → Бэкенд не запущен

---

### Проблема: Координаты не обновляются

**Команды:**
```
/debug on
(Подождите 5 секунд)
```

**Смотрите в чате:**
```
[DEBUG] Sending coords: ...
[DEBUG] API Response: POST /coords - Status: 200
```

**Если нет:**
- Проблема с бэкендом
- Неверный API_KEY

---

### Проблема: Не знаю что происходит

**Команды:**
```
/debug on
/debug state
/debug config
```

**Покажет:**
- Всё текущее состояние
- Всю конфигурацию
- Вы поймёте что не так

---

## 💡 Советы по отладке

### 1. Всегда начинайте с `/debug on`
Включите DEBUG режим и смотрите что происходит

### 2. Используйте `/debug state`
Покажет текущее состояние скрипта

### 3. Проверьте `/debug api`
Убедитесь что бэкенд отвечает

### 4. Читайте moonloader.log
Все детали логируются в файл

### 5. Выключайте DEBUG после отладки
```
/debug off
```
DEBUG режим создаёт много сообщений в чате

---

## 🔧 Настройка уровня логирования

### Для разработки
```
/debug level 1            → Все логи (DEBUG)
```

### Для обычного использования
```
/debug level 2            → Только INFO и выше
```

### Для production
```
/debug level 3            → Только WARN и ERROR
```

### Только критичные ошибки
```
/debug level 4            → Только ERROR
```

---

## 📋 Чек-лист отладки

```
☐ /debug on               → Включить DEBUG
☐ /debug state            → Проверить состояние
☐ /debug config           → Проверить конфигурацию
☐ /debug api              → Проверить API
☐ Подождать 5 секунд      → Проверить отправку координат
☐ Проверить moonloader.log→ Найти ошибки
☐ /debug off              → Выключить DEBUG
```

---

## 🎉 Готово!

Теперь у вас есть мощная система отладки:
- ✅ 4 уровня логирования
- ✅ Команда /debug с 6 функциями
- ✅ Детальное логирование всех операций
- ✅ Легко найти причину любой проблемы

**Используйте `/debug on` когда что-то не работает!** 🚀
