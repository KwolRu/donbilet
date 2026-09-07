/** Тенант. Резолвится из claim `workspace_id` проверенного JWT, не из поддомена. */
export interface WorkspaceInfo {
  id: string;
  slug: string;
  name: string;
}
