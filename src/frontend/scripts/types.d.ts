interface password_field_t {
    name: string
    value: string
};

interface password_t {
    _id: string
    name: string
    fields: password_field_t[]
};

interface video_meta_entry_t {
    episodes: {
        name: string,
        hash: string
    }[]
};

type state = 0 | 1 | 2 | 3

interface instance_object_t {
    _id: string,
    name: string,
    current: string,
    state: state
};

interface link_t {
    value: string;
    display: boolean;
}

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
    servers: { server: string, id: string }[];
    links?: {
        egg_inc?: link_t;
    }
};