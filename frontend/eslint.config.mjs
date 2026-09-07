import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Node-скрипт dev-сервера: CommonJS здесь осознан, правила для клиентского
    // кода к нему неприменимы.
    "server.js",
  ]),
  {
    // Слияние ref'ов физически требует записи в `.current` объекта из пропсов —
    // это контракт callback-ref, а не мутация состояния. Правило отключено
    // ровно для одного файла, чтобы такого исключения больше нигде не было.
    files: ["app/core/hooks/useMergedRef.ts"],
    rules: {
      "react-hooks/immutability": "off",
    },
  },
]);

export default eslintConfig;
