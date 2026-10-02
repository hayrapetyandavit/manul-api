export interface JwtPayload {
  sub: number;
  email: string;
}

export interface JwtUser {
  id: number;
  email: string;
}
