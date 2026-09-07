export interface JwtPayload {
  id: string;
  workspaceId: string;
  // Шаблон стартует с одной ролью 'owner'. Появились роли — заводите union/enum
  // и константы, а не сравнивайте со строковыми литералами по коду.
  role: string;
  email?: string;
  jti?: string;
  iat?: number;
  exp?: number;
}

export interface VerifiedActor {
  id: string;
  workspaceId: string;
  role: string;
  raw: JwtPayload;
}
