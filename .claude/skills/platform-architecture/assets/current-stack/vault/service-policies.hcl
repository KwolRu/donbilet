# ШАБЛОН: политики доступа к секретам (Vault). Изоляция по ДОМЕНАМ, а не «одна политика на всех».
#
# ПРИНЦИП: компрометация одного сервиса не должна давать доступ к ключам остальных.
# Сервис каналов не видит ключи LLM; AI-сервис не видит ключи платежей.
#
# Применение:
#   vault policy write ai-secrets       ai-secrets.hcl
#   vault policy write channels-secrets channels-secrets.hcl
#   vault write auth/approle/role/ai-service       token_policies="ai-secrets"       token_ttl=1h
#   vault write auth/approle/role/channels-service token_policies="channels-secrets" token_ttl=1h

# ─────────────────────────── ai-secrets.hcl ───────────────────────────
# Ключ шлюза моделей и всё, что относится к AI-контуру.

path "secret/data/ai/*" {
  capabilities = ["read"]
}

path "secret/metadata/ai/*" {
  capabilities = ["read", "list"]
}

# ЯВНЫЙ запрет на чужие домены. Формально избыточен (нет allow → нет доступа), но
# защищает от случайного расширения политики «звёздочкой» при рефакторинге.
path "secret/data/channels/*" {
  capabilities = ["deny"]
}

path "secret/data/billing/*" {
  capabilities = ["deny"]
}

# ─────────────────────────── channels-secrets.hcl ───────────────────────────
# Токены каналов связи: email, telegram, vk, whatsapp.
#
# path "secret/data/channels/*" { capabilities = ["read"] }
# path "secret/metadata/channels/*" { capabilities = ["read", "list"] }
# path "secret/data/ai/*"      { capabilities = ["deny"] }
# path "secret/data/billing/*" { capabilities = ["deny"] }

# ─────────────────────────── СТРУКТУРА ПУТЕЙ ───────────────────────────
#
#   secret/ai/gateway            → { base_url, master_key }
#   secret/ai/providers/<slug>   → { api_key }              # если ключи не только в шлюзе
#   secret/channels/email        → { host, user, password }
#   secret/channels/telegram     → { bot_token }
#   secret/channels/vk           → { access_token }
#   secret/billing/<provider>    → { api_key, webhook_secret }
#
# Тенантные секреты (если клиент приносит свой ключ):
#   secret/tenants/<workspace_id>/channels/email
# Политика тогда параметризуется по шаблону, а токен сервиса ограничивается тенантом
# через entity alias / templated policy — иначе один сервис читает ключи всех клиентов.

# ─────────────────────────── ТРЕБОВАНИЯ К КОДУ ───────────────────────────
#
# 1. Единый загрузчик `loadSecrets()`: одна точка, где известно, откуда берутся ключи.
#    Backend выбирается переменной (SECRETS_BACKEND=vault|env), fallback на env — ТОЛЬКО в dev.
#
# 2. Приложение ПАДАЕТ при старте, если обязательный секрет отсутствует. «Работает
#    как-нибудь без секрета» — источник самых дорогих инцидентов.
#
# 3. Загрузчик отдаёт РЕЕСТР ЗНАЧЕНИЙ известных секретов для output-фильтра утечек.
#    Если фильтр читает process.env, а ключи переехали в Vault и удалены из .env, он
#    молча перестаёт что-либо покрывать.
#
# 4. Кэш с TTL: не ходить в Vault на каждый запрос, но и не кэшировать навечно —
#    иначе ротация ключа потребует рестарта, а значит перестанет быть операцией конфигурации.
#
# 5. Проверять периодически: «сможем ли сменить ключ провайдера за 5 минут без деплоя».
#    Если нет — секреты живут неправильно, независимо от того, где они лежат.
