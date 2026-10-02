import { Inject, Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import { AuthService } from '../auth.service';
import { JwtUser } from '../types/jwt-payload.type';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authService: AuthService,
  ) {
    super();
  }

  serializeUser(
    user: JwtUser,
    done: (err: Error | null, user?: JwtUser) => void,
  ) {
    console.log('Serializer User');
    done(null, user);
  }

  async deserializeUser(
    payload: JwtUser,
    done: (err: Error | null, user?: JwtUser | null) => void,
  ) {
    const user = await this.authService.findUser(payload.id);
    console.log('Deserialize User');
    console.log(user);
    return user ? done(null, user) : done(null, null);
  }
}
