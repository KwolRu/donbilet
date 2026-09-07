-- Расширения PostgreSQL. Создаются ПЕРВОЙ миграцией — от них зависят индексы поиска.
-- Оба входят в стандартный contrib (образ postgres:*), ставить ничего не нужно.
--
-- pg_trgm     — триграммный поиск / fuzzy-матчинг (ILIKE, similarity), GIN/GiST-индексы.
-- btree_gist  — комбинированные GiST-индексы (например, workspace_id + tstzrange).
--
-- Если проекту нужны PostGIS (гео) или pgvector (эмбеддинги/RAG) — соберите свой
-- образ Postgres и добавьте их отдельной миграцией. См. docs/adr/ADR-0004-search-in-postgres.md.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;
