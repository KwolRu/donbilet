# ШАБЛОН: право сервиса вызвать инструмент/внешний источник (PEP на шлюзе инструментов).
#
# ЗАЧЕМ: единая точка ответа на вопрос «этот ли сервис имеет право звать этот инструмент
# у этого источника, с этими лимитами и для этой цели». В коде это расползается по `if`,
# которые невозможно ни проаудировать, ни изменить без релиза.
#
# ИНВАРИАНТ: default deny. Клиент PEP при любом сбое связи тоже возвращает deny — политика
# и транспорт fail-closed ОБА.

package mcp.authz

import rego.v1

default allow := false

decision := {
	"allow": allow,
	"reason": reason,
	"rule": rule_name,
}

# ── Матрица прав: какой сервис какие инструменты может звать ───────────────────
# Держать данными, а не правилами: так матрицу можно вынести в data.json и менять
# без правки политики.
service_tools := {
	"collector-service": {"search_organizations", "get_organization_details", "discover_website_candidates", "inspect_website"},
	"ai-service": {"get_organization", "get_organization_reviews"},
	"channels-service": {"send_email", "send_telegram", "send_vk", "poll_inbox"},
}

# Платные источники требуют явного разрешения в контексте вызова.
paid_sources := {"tavily", "brave", "geoapify_premium"}

# Дневные лимиты вызовов на источник (0 = без лимита).
source_daily_limit := {
	"geoapify": 5000,
	"tavily": 1000,
	"brave": 2000,
}

# ── Разрешение ─────────────────────────────────────────────────────────────────

allow if {
	count(denials) == 0
	tool_allowed
}

tool_allowed if {
	some tool in service_tools[input.actor.service]
	tool == input.tool
}

# ── Отказы ─────────────────────────────────────────────────────────────────────

denials contains "unknown_service" if not service_tools[input.actor.service]

denials contains "tool_not_allowed_for_service" if {
	service_tools[input.actor.service]
	not tool_allowed
}

denials contains "tenant_required" if {
	# Тенантные цели требуют указания тенанта: без него нельзя ни ограничить, ни списать.
	input.purpose in {"collection", "enrichment", "outbound"}
	not input.actor.tenant
}

denials contains "paid_source_not_allowed" if {
	input.source in paid_sources
	not input.context.allow_paid
}

denials contains "daily_limit_exceeded" if {
	limit := source_daily_limit[input.source]
	limit > 0
	input.context.requests_today >= limit
}

# ── Ответ ──────────────────────────────────────────────────────────────────────

reason := "ok" if allow

reason := concat(", ", sort([d | some d in denials])) if {
	not allow
	count(denials) > 0
}

# Явное решение для случая «правил не нашлось»: default deny должен быть ОБЪЯСНИМЫМ,
# иначе на шлюзе видно только «forbidden» без причины.
reason := "no matching rule (default deny)" if {
	not allow
	count(denials) == 0
}

rule_name := "allow" if allow

rule_name := sort([d | some d in denials])[0] if {
	not allow
	count(denials) > 0
}

rule_name := "default_deny" if {
	not allow
	count(denials) == 0
}

# ── ОЖИДАЕМЫЙ ВХОД ─────────────────────────────────────────────────────────────
# {
#   "action": "call",
#   "actor":   { "service": "ai-service", "tenant": "ws_123" },
#   "tool":    "get_organization",
#   "source":  "internal",
#   "purpose": "enrichment",
#   "context": { "allow_paid": false, "requests_today": 412 }
# }
