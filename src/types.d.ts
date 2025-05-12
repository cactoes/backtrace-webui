//==========================================
/// @file       types.d.ts
/// @brief      contains all types for all files
//==========================================

type MakeFieldsOptional<T> = {
    [K in keyof T]?: T[K] | undefined;
};

//==========================================
/// @file       utils/mutex.ts
//==========================================
type ReleaseFunction = () => void;

//==========================================
/// @file       manager/account.ts
//==========================================
enum permissions_t {
    ADMIN = 1 << 0
};

interface user_t {
    permissions: number;
    uuid: number;
    username: string;
    password: string;
    servers: { server: string, id: string }[]
};

//==========================================
/// @file       manager/proxy.ts
//==========================================
interface server_t {
    server: string;
};

type server_list_t = { [key: string]: server_t };