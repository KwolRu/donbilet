export interface JwtPayload {
  id: string;
  workspaceId: string;
  role: string;
  email?: string;
  jti?: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
