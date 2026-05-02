import { UserService } from './user.service';
import { CreateUserDto } from 'src/dtos/create-user';
import { UpdateUserDto } from 'src/dtos/update-user';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    getAllUsers(): Promise<import("../schemas/user").User[]>;
    getById(id: string): Promise<import("../schemas/user").User>;
    createUser(createUserDto: CreateUserDto): Promise<import("../schemas/user").User>;
    updateUser(updateUserDto: UpdateUserDto): Promise<import("../schemas/user").User>;
}
