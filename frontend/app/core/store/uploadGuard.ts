import { create } from "zustand";

/**
 * Глобальный счётчик активных загрузок файлов в S3 (LMS-редактор и др.).
 *
 * Пока счётчик > 0 — на странице есть незавершённая заливка медиа, и уход со
 * страницы (reload/close) грозит потерей файла. CourseEditorPage вешает
 * beforeunload-предупреждение, когда `activeUploads > 0`.
 */
interface UploadGuardState {
  activeUploads: number;
  begin: () => void;
  end: () => void;
}

export const useUploadGuard = create<UploadGuardState>((set) => ({
  activeUploads: 0,
  begin: () => set((s) => ({ activeUploads: s.activeUploads + 1 })),
  end: () => set((s) => ({ activeUploads: Math.max(0, s.activeUploads - 1) })),
}));

/** Снаружи React (например, в beforeunload-обработчике). */
export function hasActiveUploads(): boolean {
  return useUploadGuard.getState().activeUploads > 0;
}
