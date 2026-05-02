import { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
export declare class AuthGuard implements CanActivate {
    private configService;
    private jwtService;
    private reflector;
    private jwtSecret;
    constructor(configService: ConfigService, jwtService: JwtService, reflector: Reflector);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private extractTokenFromHeader;
}
