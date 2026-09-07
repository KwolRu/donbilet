# Тесты гейта отправки. Запуск: opa test policies/
#
# ЗАЧЕМ ЭТОТ ФАЙЛ В ШАБЛОНАХ: политика без тестов границ — это `if`, переехавший в другой
# язык. Ниже — тесты, которые ловят реальный дефект окна через полночь (см. §«Рабочее окно»
# в outbound_send.rego). Без них дефект живёт до первой жалобы «ничего не отправляется».

package ai.outbound.send

import rego.v1

base := {
	"approved": true,
	"workspace": {"id": "ws1", "stop_flag": false},
	"contact": {"blacklisted": false, "unsubscribed": false, "suppressed": false},
	"counters": {"sent_today": 0, "duplicate_recent": false},
	"limits": {"daily_max": 50},
	"time": {"hour": 14, "window_start": 9, "window_end": 21},
}

# ── Базовый разрешающий случай ────────────────────────────────────────────────

test_allow_default if {
	decision.allow with input as base
}

# ── Отказы ────────────────────────────────────────────────────────────────────

test_deny_not_approved if {
	not decision.allow with input as object.union(base, {"approved": false})
}

test_deny_blacklisted if {
	d := decision with input as object.union(base, {"contact": {"blacklisted": true, "unsubscribed": false, "suppressed": false}})
	not d.allow
	d.rule == "blacklisted"
}

test_deny_daily_limit if {
	not decision.allow with input as object.union(base, {"counters": {"sent_today": 50, "duplicate_recent": false}})
}

test_deny_duplicate if {
	not decision.allow with input as object.union(base, {"counters": {"sent_today": 1, "duplicate_recent": true}})
}

# Стоп-флаг сильнее всего остального: даже при полностью валидном запросе.
test_deny_stop_flag if {
	d := decision with input as object.union(base, {"workspace": {"id": "ws1", "stop_flag": true}})
	not d.allow
	d.rule == "workspace_stopped"
}

# ── РАБОЧЕЕ ОКНО: границы. Именно эти тесты ловят дефект. ─────────────────────

# 1) Окно внутри суток 9–21.
test_window_inside_day_ok if {
	decision.allow with input as with_time(base, 9, 9, 21)
}

test_window_inside_day_edge_end_excluded if {
	# Верхняя граница НЕ включена: 21:00 — уже пауза.
	not decision.allow with input as with_time(base, 21, 9, 21)
}

test_window_inside_day_before_start if {
	not decision.allow with input as with_time(base, 8, 9, 21)
}

# 2) Окно ЧЕРЕЗ ПОЛНОЧЬ: «ночная пауза 00:00–06:00» ⇒ рабочее окно 6→0.
#    При наивном условии (h >= start && h < end) ЭТИ ТЕСТЫ КРАСНЫЕ, а отправка
#    заблокирована круглосуточно.
test_window_over_midnight_daytime_ok if {
	decision.allow with input as with_time(base, 14, 6, 0)
}

test_window_over_midnight_evening_ok if {
	decision.allow with input as with_time(base, 23, 6, 0)
}

test_window_over_midnight_night_denied if {
	not decision.allow with input as with_time(base, 3, 6, 0)
}

test_window_over_midnight_start_edge_ok if {
	decision.allow with input as with_time(base, 6, 6, 0)
}

# Второй вариант окна через полночь: 22:00–06:00 (ночная смена).
test_window_night_shift_ok if {
	decision.allow with input as with_time(base, 2, 22, 6)
}

test_window_night_shift_denied_midday if {
	not decision.allow with input as with_time(base, 12, 22, 6)
}

# 3) Границы совпали — пауза не настроена ⇒ круглосуточно.
test_window_disabled_allows_any_hour if {
	decision.allow with input as with_time(base, 3, 0, 0)
}

# ── Хелпер ────────────────────────────────────────────────────────────────────

with_time(b, h, start, end) := object.union(b, {"time": {"hour": h, "window_start": start, "window_end": end}})
