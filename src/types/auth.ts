export interface JWTPayload {
  id: number;
  username: string;
  email: string;
  zoneId: number | null;
  role: string;
}