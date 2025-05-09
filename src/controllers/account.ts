import { sha, SHA256 } from "bun";
import * as jose from "jose";
import * as data_controller from "controllers/data";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function check_token(token: string | null): Promise<boolean> {
    if (!token)
        return false;
  
    try {
        await jose.jwtVerify(token, JWT_SECRET);
        return true;
    } catch (_) {
        return false;
    }
}

export async function get_user_from_token(token: string | null): Promise<user_t | undefined> {
    if (!token)
        return undefined;

    try {
        const { payload } = await jose.jwtVerify<{ uuid: number }>(token, JWT_SECRET); payload;
        
        const [users, release] = await data_controller.get_file_with_lock<user_t[]>("users");

        release();

        return users.find(v => v.uuid == payload.uuid);
    } catch (_) {
        return undefined;
    }
}

export async function create_token(user: user_t): Promise<string> {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 60 * 60 * 24; // 24 hours
  
    const token = await new jose.SignJWT({ uuid: user.uuid })
                                .setProtectedHeader({ alg: "HS256" })
                                .setIssuedAt(iat)
                                .setExpirationTime(exp)
                                .sign(JWT_SECRET);

    return token;
}

export const PERMISSIONS = {
    ADMIN: 1 << 0
};

export function check_permissions(permissions: number, required: number) {
    return (permissions & required) == required;
}

type schema_function_t = (user_token: string | null, permissions: number) => Promise<boolean>;

interface schema_t {
    PUBLIC: schema_function_t;
    PROTECTED: schema_function_t;
    PRIVATE: schema_function_t;
};

export const authenticate: schema_t = {
    // anyone can access (no login required)
    PUBLIC: async (_, _1: number) => true,
    
    // only loged in users can access
    PROTECTED: async (token: string | null, _: number) => {
        return await check_token(token);
    },
    
    // only specific user can access with right permissions can access
    PRIVATE: async (token: string | null, permissions: number) => {
        if (!check_token(token))
            return false;

        const user = await get_user_from_token(token);

        if (!user)
            return false;

        return check_permissions(user.permissions, permissions);
    },
};

export interface user_t {
    permissions: number;
    uuid: number;
    username: string;
    password: string;
    servers: { server: string, id: string }[]
};

function sha256(input: string): string {
    return new SHA256().update(input).digest('hex');
  }

export async function login_user(username: string, password: string): Promise<string | undefined> {
    const [users, release] = await data_controller.get_file_with_lock<user_t[]>("users");

    release();

    const user = users.find(v => v.username == username);

    if (!user || user.password != sha256(password))
        return undefined;

    return await create_token(user);
}