export const parseDurationToSeconds = (duration: string): number => {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(
      `Invalid duration format: ${duration}. Use '15m', '1h', '7d', etc.`,
    );
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 24 * 60 * 60;
    default:
      throw new Error(`Unknown unit: ${unit}`);
  }
};
