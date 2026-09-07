import {
  getServerErrorAction,
  getServerErrorUrl,
  SERVER_ERROR_EVENT,
} from "@/lib/routing/server-error-policy";

type ApiFailureLike = {
  config?: { url?: string };
  response?: {
    status?: number;
    data?: { message?: unknown };
  };
};

export function applyBrowserServerErrorPolicy(
  error: unknown,
  fallbackRequestUrl = "",
) {
  const failure = error as ApiFailureLike;
  const action = getServerErrorAction({
    requestUrl: failure.config?.url ?? fallbackRequestUrl,
    status: failure.response?.status,
    responseMessage: failure.response?.data?.message,
  });

  if (typeof window === "undefined") return;

  if (action === "redirect-to-500") {
    if (window.location.pathname !== "/500") {
      const currentPath = `${window.location.pathname}${window.location.search}`;
      window.location.replace(getServerErrorUrl(currentPath));
    }
    return;
  }

  if (action === "show-page-fallback") {
    window.dispatchEvent(new CustomEvent(SERVER_ERROR_EVENT));
  }
}
