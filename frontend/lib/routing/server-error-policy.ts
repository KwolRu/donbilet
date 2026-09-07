export const SERVER_ERROR_EVENT = "app:server-error";

export type ServerErrorAction = "redirect-to-500" | "show-page-fallback" | "reject";

type ServerErrorInput = {
  requestUrl?: string;
  status?: number;
  responseMessage?: unknown;
};

export function isServerFailureStatus(status: number | undefined): boolean {
  return typeof status === "number" && status >= 500 && status <= 599;
}

export function getServerErrorUrl(currentPath: string): string {
  const returnPath =
    currentPath.startsWith("/") && !currentPath.startsWith("//") && !currentPath.startsWith("/500")
      ? currentPath
      : "/";

  return `/500?returnUrl=${encodeURIComponent(returnPath)}`;
}

export function getServerErrorReturnPath(search: string): string {
  const returnPath = new URLSearchParams(search).get("returnUrl");
  if (
    !returnPath ||
    !returnPath.startsWith("/") ||
    returnPath.startsWith("//") ||
    returnPath === "/500" ||
    returnPath.startsWith("/500?")
  ) {
    return "/";
  }

  return returnPath;
}

function normalizeRequestPath(requestUrl: string | undefined): string {
  if (!requestUrl) return "";

  try {
    return new URL(requestUrl, "http://localhost").pathname.replace(/^\/api(?=\/)/, "");
  } catch {
    return requestUrl.split(/[?#]/, 1)[0].replace(/^\/api(?=\/)/, "");
  }
}

function isAuthServicePath(requestUrl: string | undefined): boolean {
  const path = normalizeRequestPath(requestUrl);
  return (
    path === "/auth" ||
    path.startsWith("/auth/") ||
    path === "/auth-owner" ||
    path.startsWith("/auth-owner/") ||
    path === "/superadmin" ||
    path.startsWith("/superadmin/")
  );
}

function isAuthGatewayFailureMessage(message: unknown): boolean {
  const value = Array.isArray(message) ? message.join(" ") : String(message ?? "");
  return /bad gateway\s*-\s*auth\b|auth service unavailable/i.test(value);
}

export function getServerErrorAction({
  requestUrl,
  status,
  responseMessage,
}: ServerErrorInput): ServerErrorAction {
  if (!isServerFailureStatus(status)) return "reject";

  if (isAuthServicePath(requestUrl) || isAuthGatewayFailureMessage(responseMessage)) {
    return "redirect-to-500";
  }

  return "show-page-fallback";
}
