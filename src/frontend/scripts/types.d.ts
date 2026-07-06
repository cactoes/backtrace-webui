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