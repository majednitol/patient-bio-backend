import { AuthService } from './auth.service';
import { LoginUserDto } from 'src/dtos/login-user';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    nonce(wallet: string): Promise<{
        nonce: any;
    }>;
    signIn(loginDto: LoginUserDto): Promise<any>;
}
