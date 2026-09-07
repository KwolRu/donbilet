const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

export const METHOD_COLORS: Record<string, string> = {
  GET: '\x1b[32m',     // зелёный
  POST: '\x1b[33m',    // жёлтый
  PUT: '\x1b[34m',     // синий
  PATCH: '\x1b[36m',   // циан
  DELETE: '\x1b[31m',  // красный
  OPTIONS: '\x1b[35m', // магента
  HEAD: '\x1b[37m',    // белый
};

export function getMethodColor(method: string): string {
  return METHOD_COLORS[method.toUpperCase()] || '\x1b[37m';
}

export function getStatusColor(status: number): string {
  if (status >= 500) return '\x1b[31m';  // красный
  if (status >= 400) return '\x1b[33m';  // жёлтый
  if (status >= 300) return '\x1b[36m';  // циан
  if (status >= 200) return '\x1b[32m';  // зелёный
  return '\x1b[37m';                      // белый
}

export function formatLogMessage(
  method: string,
  url: string,
  status: number,
  duration: number,
): string {
  const mc = getMethodColor(method);
  const sc = getStatusColor(status);
  const paddedMethod = method.padEnd(7);
  return `${mc}${BOLD}${paddedMethod}${RESET} | ${url} | ${sc}${status}${RESET} | ${duration}ms`;
}

const SENSITIVE_FIELDS = ['password', 'currentPassword', 'newPassword'];

export function maskSensitiveFields(body: Record<string, any>): Record<string, any> {
  if (!body || typeof body !== 'object') return body;

  const masked = { ...body };
  for (const field of SENSITIVE_FIELDS) {
    if (field in masked) {
      masked[field] = '***';
    }
  }
  return masked;
}
