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
interface user_t {
    permissions: number;
    uuid: number;
    username: string;
    password: string;
    servers: { server: string, id: string }[]
};

interface key_t {
    key: string
    used_by: number
}

//==========================================
/// @file       manager/proxy.ts
//==========================================
interface server_t {
    server: string;
};

type server_list_t = { [key: string]: server_t };

//==========================================
/// @file       controler/api.ts
//==========================================
interface video_meta_entry_t {
    episodes: {
        name: string,
        hash: string
    }[]
};