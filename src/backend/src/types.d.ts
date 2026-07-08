//==========================================
/// @file       types.d.ts
/// @brief      contains all types for all files
//==========================================

type MakeFieldsOptional<T> = {
    [K in keyof T]?: T[K] | undefined;
};

interface config_file_t {
    version: {
        ui: string;
        api: string;
    }
}

type ReleaseFunction = () => void;

interface user_t {
    permissions: number;
    uuid: number;
    username: string;
    password: string;
    description?: string;
    website?: string;
    location?: string;
    company?: string;
    created_at: number;
    servers: { server: string, id: string }[]
};

interface key_t {
    key: string
    used_by: number
}

interface server_t {
    server: string;
};

type server_list_t = { [key: string]: server_t };

interface video_meta_entry_t {
    episodes: {
        name: string,
        hash: string
    }[]
};