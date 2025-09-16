//==========================================
/// @file       account.ts
/// @brief      account based functions
//==========================================

import * as jose from "jose";
import { assert, sha256 } from "../utils/utils";
import { get_file_with_lock, save_file_and_unlock } from "./data";
import { proxy_manager } from "./manager";

// kinda ahh class
export class JWTManager {
    private secret: Uint8Array | undefined = undefined;

    private static instance: JWTManager = new JWTManager();

    public static get_instance(): JWTManager {
        return this.instance;
    }
    
    public get_secret() {
        return this.secret;
    }

    public set_secret(secret: string) {
        this.secret = new TextEncoder().encode(secret);
    }

    public async check_token(token: string | null | undefined): Promise<boolean> {
        assert(this.secret != undefined && this.secret != null, "secret was not yet set");

        if (!token)
            return false;
        
        try {
            await jose.jwtVerify(token, this.secret);
            return true;
        } catch (_) {
            return false;
        }
    }

    public async get_payload<T>(token: string | null | undefined): Promise<T | undefined> {
        assert(this.secret != undefined && this.secret != null, "secret was not yet set");

        if (!token)
            return undefined;

        try {
            const { payload } = await jose.jwtVerify<T>(token, this.secret);
            return payload;
        } catch (_) {
            return undefined;
        }
    }

    public async create_token(user: user_t): Promise<string> {
        assert(this.secret != undefined && this.secret != null, "secret was not yet set");

        const iat = Math.floor(Date.now() / 1000);
        const exp = iat + 60 * 60 * 24; // 24 hours
      
        const token = await new jose.SignJWT({ uuid: user.uuid })
                                    .setProtectedHeader({ alg: "HS256" })
                                    .setIssuedAt(iat)
                                    .setExpirationTime(exp)
                                    .sign(this.secret);
    
        return token;
    }
};

export function get_next_uuid(users: user_t[]): number {
    return users[users.length - 1]!.uuid + 1
}

export function check_permissions(permissions: number, required: number) {
    return (permissions & required) == required;
}

export async function get_user_from_token(token: string | null): Promise<user_t | undefined> {
    const payload = await JWTManager.get_instance().get_payload<{ uuid: number }>(token);

    if (!payload)
        return undefined;

    const [users, release] = await get_file_with_lock<user_t[]>("users"); release();

    return users.find(v => v.uuid == payload.uuid);
}

export async function login_user(username: string, password: string): Promise<string | undefined> {
    const [ users, release ] = await get_file_with_lock<user_t[]>("users"); release();

    const user = users.find(v => v.username == username);

    if (!user || user.password != sha256(password + "salt"))
        return undefined;

    return await JWTManager.get_instance().create_token(user);
}

export async function register_user(username: string, password: string, key: string): Promise<string | undefined> {
    const [ users, release_users ] = await get_file_with_lock<user_t[]>("users");
    if (users.find(v => v.username == username))
        return undefined;

    const [ keys, release_keys ] = await get_file_with_lock<key_t[]>("keys");

    const found_key = keys.find(k => k.key == key && k.used_by == -1);
    if (!found_key)
        return undefined;
    
    const yuno_instance = await proxy_manager.make_remote_request<{ message: string, success: boolean, data: { instance: string } }>("GET", "yuno", "/instance/create");
    
    if (!yuno_instance || !yuno_instance.success)
        return undefined;

    const user = {
        permissions: 0,
        uuid: get_next_uuid(users),
        username: username,
        password: sha256(password + "salt"),
        servers: [
            {
                "server": "yuno",
                "id": yuno_instance.data!.instance
            }
        ]
    };

    users.push(user);
    found_key.used_by = user.uuid;

    save_file_and_unlock("users", release_users, users);
    save_file_and_unlock("keys", release_keys, keys);

    return await JWTManager.get_instance().create_token(user);
}