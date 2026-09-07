// @ts-check
import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Линт бэкенда. Намеренно БЕЗ `recommendedTypeChecked`: правила с проверкой
 * типов требуют полной программы TypeScript на каждый запуск и заметно
 * замедляют линт монорепы. Типы проверяет `npm run build:all` — это и есть
 * основная проверка корректности.
 */
export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'dist/**', 'node_modules/**', 'coverage/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['microservices/**/*.ts', 'prisma/**/*.ts', 'scripts/**/*.ts', 'test/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'module',
    },
    rules: {
      // Неиспользуемые аргументы с префиксом `_` — осознанная сигнатура
      // (например, `use(req, _res, next)` в middleware), а не забытый код.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      // `any` в Nest-инфраструктуре (request/response из express) неизбежен,
      // но в доменном коде это запах — поэтому предупреждение, а не ошибка.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
);
