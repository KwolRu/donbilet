/**
 * Слаги, зарезервированные инфраструктурой. Тенант с таким slug сломает
 * маршрутизацию (wildcard-DNS, SNI, nginx) и/или перекроет служебные пути.
 * Проверять при создании и переименовании workspace.
 */
export const RESERVED_WORKSPACE_SLUGS = new Set([
  'api',
  'www',
  'app',
  'admin',
  'auth',
  'gateway',
  'static',
  'cdn',
  'assets',
  'monitoring',
  'status',
]);
