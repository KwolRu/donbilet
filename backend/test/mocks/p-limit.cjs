// CJS-заглушка ESM-пакета p-limit для jest: конкуррентность в unit-тестах не
// важна, поэтому просто выполняем переданную функцию сразу.
module.exports = function pLimit() {
  const run = (fn, ...args) => fn(...args);
  run.activeCount = 0;
  run.pendingCount = 0;
  run.clearQueue = () => {};
  return run;
};
