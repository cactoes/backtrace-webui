interface instance_object_t {
    _id: string,
    name: string,
    current: string,
    // finished, watching, planned, dropped
    state: 0 | 1 | 2 | 3
};

interface video_meta_entry_t {
    episodes: {
        name: string,
        hash: string
    }[]
};