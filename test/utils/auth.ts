import { JwtService } from '@nestjs/jwt';

export function bearer(user: { id: number; email: string }, secret?: string) {
  const token = new JwtService({
    secret: secret ?? process.env.JWT_SECRET ?? 'default',
  }).sign({
    sub: user.id,
    email: user.email,
  });

  return { Authorization: `Bearer ${token}` };
}
