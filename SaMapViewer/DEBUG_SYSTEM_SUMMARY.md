# 🎉 Debug System Added - Final Summary

## ✨ Что добавлено

### 1. **Система логирования с 4 уровнями** ✅

```lua
LOG_LEVELS = {
    DEBUG = 1,   -- Детальная информация
    INFO = 2,    -- Обычная информация (по умолчанию)
    WARN = 3,    -- Предупреждения
    ERROR = 4,   -- Только ошибки
}
```

**Функции:**
- `logDebug(message, data)` - Детальная отладка
- `log(message, data)` - Обычная информация
- `logWarn(message, data)` - Предупреждения
- `logError(message, data)` - Ошибки

---

### 2. **Команда /debug** ✅

#### Все возможности:
```
/debug                     → Помощь по командам
/debug on                  → Включить DEBUG режим
/debug off                 → Выключить DEBUG режим
/debug state               → Показать текущее состояние
/debug config              → Показать конфигурацию
/debug api                 → Проверить API соединение
/debug level [1-4]         → Установить уровень логирования
```

---

### 3. **Детальное логирование** ✅

#### API запросы:
```
[DEBUG] API Request: POST /coords
[DEBUG] Request Data: {"nick":"YourNick",...}
[DEBUG] API Response: POST /coords - Status: 200 (42ms)
[DEBUG] Response Body: {"success":true}
```

#### Отправка координат:
```
[DEBUG] Sending coords: 1544.2, -1353.5, 13.5 (Commerce, Los Santos) AFK=false
```

#### Проверка движения:
```
[DEBUG] Player moved: 12.3m
[DEBUG] AFK status cleared (player moved)
```

#### Проверка AFK:
```
[DEBUG] AFK Check: inactive for 245 sec (threshold: 300 sec)
[WARN] Player marked as AFK
```

#### Обновление локации:
```
[DEBUG] Updating PANIC location: Temple, Los Santos
[DEBUG] Updating PURSUIT target location: Ganton, Los Santos
```

---

### 4. **Функции диагностики** ✅

#### debugShowState()
Показывает:
- Ник игрока
- AFK статус
- Активная паника
- Текущий юнит (marking, статус, участники)
- Текущая ситуация
- Цель погони
- Координаты и локация

#### debugShowConfig()
Показывает:
- API URL
- API Key
- Все интервалы
- Порог AFK
- Статус DEBUG режима
- Статус ImGui

#### debugTestAPI()
Проверяет:
- Подключение к API
- Статус код ответа
- Время отклика

---

## 🎯 Как использовать

### Базовая отладка
```
1. /debug on               → Включить DEBUG
2. Смотрите логи в чате
3. /debug off              → Выключить когда найдёте проблему
```

---

### Проверка состояния
```
/debug state
```

**Вывод:**
```
=== DEBUG: Current State ===
Player: YourNick
AFK: false
In Panic: false
Current Unit: 1-A-12
Unit Members: YourNick, Partner
Unit Status: Code 3
Position: 1544.2, -1353.5, 13.5
Location: Commerce, Los Santos
```

---

### Проверка API
```
/debug api
```

**Вывод (успех):**
```
Testing API connection...
API connection OK (status: 200)
```

**Вывод (ошибка):**
```
Testing API connection...
API connection FAILED - no response
```

---

### Тонкая настройка логирования
```
/debug level 1             → Всё (DEBUG)
/debug level 2             → INFO и выше
/debug level 3             → WARN и ERROR
/debug level 4             → Только ERROR
```

---

## 📊 Что логируется

### В режиме DEBUG (level 1)
✅ Каждый API запрос и ответ  
✅ Отправка координат каждые 5 секунд  
✅ Проверка движения  
✅ Проверка AFK  
✅ Обновление локации (Panic/Pursuit)  
✅ Загрузка модулей  
✅ Все операции

### В режиме INFO (level 2) - По умолчанию
✅ Инициализация  
✅ Создание юнитов  
✅ Создание ситуаций  
✅ Важные события

### В режиме WARN (level 3)
✅ AFK установлен  
✅ ImGui не загружен  
✅ Цель погони потеряна  
✅ Проблемные ситуации

### В режиме ERROR (level 4)
✅ API не отвечает  
✅ Неверный статус код  
✅ Критичные ошибки

---

## 🐛 Примеры отладки

### Проблема: Координаты не отправляются

```
/debug on
```

**Смотрите в чате каждые 5 секунд:**
```
[DEBUG] Sending coords: 1544.2, -1353.5, 13.5 (Commerce, Los Santos) AFK=false
[DEBUG] API Request: POST /coords
[DEBUG] API Response: POST /coords - Status: 200 (42ms)
```

**Если нет "Sending coords":**
- playerNick не установлен
- Игрок не в SA-MP

**Если нет "API Response":**
- Бэкенд не запущен
- Неверный URL

---

### Проблема: AFK не определяется

```
/debug on
(Не двигайтесь 5 минут)
```

**Смотрите:**
```
[DEBUG] Player stationary: 0.5m
[DEBUG] AFK Check: inactive for 310 sec (threshold: 300 sec)
[WARN] Player marked as AFK
```

---

### Проблема: Panic не работает

```
/debug on
/panic
```

**Смотрите каждые 3 секунды:**
```
[DEBUG] Updating PANIC location: Commerce, Los Santos
[DEBUG] API Request: PUT /situations/{id}/location
[DEBUG] API Response: PUT /situations/{id}/location - Status: 200
```

---

## 📁 Файлы логов

### В чате (если DEBUG режим)
```
[SAPD Tracker] [DEBUG] ...
[SAPD Tracker] [INFO] ...
[SAPD Tracker] [WARN] ...
[SAPD Tracker] [ERROR] ...
```

### В moonloader.log (всегда)
```
GTA San Andreas/moonloader/moonloader.log

[SAPD Tracker] [12:34:56] [DEBUG] API Request: POST /coords
[SAPD Tracker] [12:34:56] [DEBUG] API Response: POST /coords - Status: 200 (42ms)
```

---

## 💡 Рекомендации

### Для разработки
```
/debug on
/debug level 1
```
Видно всё что происходит

---

### Для обычного использования
```
/debug off
/debug level 2
```
Только важная информация

---

### Для production
```
/debug off
/debug level 3
```
Только предупреждения и ошибки

---

### Для поиска проблемы
```
1. /debug on
2. Воспроизведите проблему
3. Смотрите логи
4. /debug state (для проверки состояния)
5. /debug api (для проверки API)
6. /debug off (когда нашли)
```

---

## 📚 Документация

### LUA_DEBUG_GUIDE.md
Полный гайд по системе отладки:
- Все команды /debug
- Примеры использования
- Что логируется
- Анализ логов
- Быстрая диагностика

### LUA_QUICK_REFERENCE.md
Добавлена секция "Отладка" с быстрыми командами

### UPDATE_SUMMARY.md
Обновлён с информацией о системе отладки

---

## ✅ Результат

Теперь у вас есть:

1. ✅ **4 уровня логирования** (DEBUG, INFO, WARN, ERROR)
2. ✅ **Команда /debug** с 6 функциями
3. ✅ **Детальное логирование** всех операций
4. ✅ **Диагностические функции** (state, config, api test)
5. ✅ **Временные метки** во всех логах
6. ✅ **Цветные сообщения** в чате
7. ✅ **Полная документация** в LUA_DEBUG_GUIDE.md

---

## 🚀 Быстрый старт

### 1. Включить отладку
```
/debug on
```

### 2. Проверить что всё работает
```
/debug state
/debug config
/debug api
```

### 3. Использовать скрипт
```
/unit create 1-A-12
/sit 911
/situations
```

### 4. Смотреть логи в чате
Все DEBUG сообщения появятся в чате

### 5. Выключить отладку
```
/debug off
```

---

## 🎉 Готово!

**Система отладки полностью готова и документирована!**

Используйте `/debug on` когда что-то не работает - вы сразу увидите что происходит под капотом! 🔍
