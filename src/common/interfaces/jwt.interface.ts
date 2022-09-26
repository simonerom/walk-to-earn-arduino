export interface JwtSignPayload {
  [key: string]: any;
}

export interface JwtSignOpts {
  issuer: string;
  expiresIn?: string;
  audience: string;
}
