export interface JwtPayload {
  sub: string;
  email: string;
  role: 'CLIENT' | 'MEDIATOR' | 'ADMIN';
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: 'CLIENT' | 'MEDIATOR' | 'ADMIN';
}