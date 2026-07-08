//==========================================
/// @file       account.ts
/// @brief      account based functions
//==========================================

import * as jose from "jose";
import { get_file_with_lock, save_file_and_unlock } from "./data_manager";
import { sha256 } from "@backend/hash";
import { make_remote_request } from "./proxy_manager";

export enum permissions_t {
    ANIME_LISTS = 1 << 0,
    PASSWORD_MANAGER = 1 << 1,
    STREAMING = 1 << 2,
    SERVICE_LIST = 1 << 3,
};

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
        if (this.secret == undefined || this.secret == null)
            return false;

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
        if (this.secret == undefined || this.secret == null)
            return undefined;

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
        if (this.secret == undefined || this.secret == null)
            return "";

        const iat = Math.floor(Date.now() / 1000);
        const exp = iat + 60 * 60 * 24; // 24 hours
      
        return await new jose.SignJWT({ uuid: user.uuid })
                                .setProtectedHeader({ alg: "HS256" })
                                .setIssuedAt(iat)
                                .setExpirationTime(exp)
                                .sign(this.secret);
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

export async function get_user_from_uuid(uuid: number): Promise<user_t | undefined> {
    const [users, release] = await get_file_with_lock<user_t[]>("users"); release();

    return users.find(v => v.uuid == uuid);
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
    if (users.find(v => v.username == username)) {
        release_users();
        return undefined;
    }

    const [ keys, release_keys ] = await get_file_with_lock<key_t[]>("keys");

    const found_key = keys.find(k => k.key == key && k.used_by == -1);
    if (!found_key) {
        release_users();
        release_keys();
        return undefined;
    }
    
    const yuno_instance = await make_remote_request<{ message: string, success: boolean, data: { instance: string } }>("GET", "yuno", "/instance/create");
    
    if (!yuno_instance || !yuno_instance.success) {
        release_users();
        release_keys();
        return undefined;
    }

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