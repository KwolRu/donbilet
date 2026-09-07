export const convertDurationToDate = (duration: string): Date => {
  const match = duration.match(/^(\d+)([dhms])$/); // Регулярка для числа + единицы
  if (!match) {
    throw new Error(
      `Неправильный формат длительности: ${duration}. Используйте, например, '7d', '1h', '30m', '45s'.`,
    );
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  let milliseconds = 0;
  switch (unit) {
    case 'd':
      milliseconds = value * 24 * 60 * 60 * 1000; // Дни в ms
      break;
    case 'h':
      milliseconds = value * 60 * 60 * 1000; // Часы в ms
      break;
    case 'm':
      milliseconds = value * 60 * 1000; // Минуты в ms
      break;
    case 's':
      milliseconds = value * 1000; // Секунды в ms
      break;
    default:
      throw new Error(`Неизвестная единица времени: ${unit}`);
  }

  return new Date(Date.now() + milliseconds);
};
