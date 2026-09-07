# ШАБЛОН: гейт исходящих действий (отправка сообщений, звонки, публикации).
#
# ПРИНЦИПЫ:
#  - default deny: нет явного allow → запрет.
#  - ВСЕ факты подставляет СЕРВЕР из БД/кэша. Клиент не сообщает, сколько он отправил
#    сегодня, — иначе политика проверяет то, что ей сказали.
#  - Решение содержит ПРИЧИНУ: без неё разбор «почему не отправилось» невозможен.
#
# Тесты: см. outbound_send_test.rego (opa test policies/).

package ai.outbound.send

import rego.v1

default allow := false

decision := {
	"allow": allow,
	"reason": reason,
	"rule": rule_name,
}

allow if count(denials) == 0

# ── Причины отказа. Каждое правило добавляет свой ключ. ─────────────────────────

denials contains "not_approved" if not input.approved

denials contains "blacklisted" if input.contact.blacklisted

denials contains "unsubscribed" if input.contact.unsubscribed

denials contains "suppressed" if input.contact.suppressed

denials contains "daily_limit_exceeded" if input.counters.sent_today >= input.limits.daily_max

denials contains "duplicate_recent" if input.counters.duplicate_recent

# Глобальный СТОП воркспейса — сильнее любых расписаний и лимитов.
# Проверяется в МОМЕНТ действия, а не при постановке в очередь: между постановкой и
# исполнением проходит время, ради которого стоп и нужен.
denials contains "workspace_stopped" if input.workspace.stop_flag

denials contains "outside_working_hours" if not within_working_window

# ── РАБОЧЕЕ ОКНО: три случая. ──────────────────────────────────────────────────
#
# ДЕФЕКТ, который ловится только тестом границ: условие `h >= start && h < end` верно
# ТОЛЬКО для окна внутри суток. Настройка «ночная пауза 00:00–06:00» даёт рабочее окно
# 6→0 (start > end) — условие не выполняется НИКОГДА, и правдоподобная пользовательская
# настройка МОЛЧА блокирует всю отправку. Обнаруживается через дни тишины.

# 1) Границы совпали — пауза не настроена ⇒ круглосуточно.
within_working_window if input.time.window_start == input.time.window_end

# 2) Окно внутри суток (09:00–21:00).
within_working_window if {
	input.time.window_start < input.time.window_end
	input.time.hour >= input.time.window_start
	input.time.hour < input.time.window_end
}

# 3) Окно через полночь (06:00–00:00 как 6→0, или 22:00–06:00) — ДВА правила,
#    потому что это дизъюнкция: час либо после начала окна, либо до его конца.
#    (Встроенные `any`/`all` в Rego v1 удалены — дизъюнкция выражается отдельными правилами.)
within_working_window if {
	input.time.window_start > input.time.window_end
	input.time.hour >= input.time.window_start
}

within_working_window if {
	input.time.window_start > input.time.window_end
	input.time.hour < input.time.window_end
}

# ── Формирование ответа ────────────────────────────────────────────────────────

reason := "ok" if allow

reason := concat(", ", sort(denials_arr)) if not allow

denials_arr := [d | some d in denials]

rule_name := "allow" if allow

rule_name := first_denial if not allow

first_denial := sort(denials_arr)[0]

# ── ОЖИДАЕМЫЙ ВХОД ─────────────────────────────────────────────────────────────
# {
#   "approved": true,
#   "workspace": { "id": "…", "stop_flag": false },
#   "contact":   { "blacklisted": false, "unsubscribed": false, "suppressed": false },
#   "counters":  { "sent_today": 12, "duplicate_recent": false },
#   "limits":    { "daily_max": 50 },
#   "time":      { "hour": 14, "window_start": 9, "window_end": 21 }   # локальный час получателя!
# }
#
# ВАЖНО: hour — час в часовом поясе ПОЛУЧАТЕЛЯ, а не сервера. Иначе «не писать ночью»
# соблюдается по времени дата-центра.
