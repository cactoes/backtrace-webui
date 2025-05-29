//==========================================
/// @file       proxy.ts
/// @brief      remote server functions
//==========================================

import { get_file_with_lock } from "./data";

export async function get_server_details(id: string): Promise<server_t | undefined> {
    const [servers, release] = await get_file_with_lock("servers"); release();
    return (servers as server_list_t)[id];
}

export async function make_remote_request<T>(type: "GET" | "POST" | "PATCH" | "PUT", server_id: string, endpoint: string, data?: Object | Array<any>, headers?: { [key: string]: string }): Promise<MakeFieldsOptional<T> | undefined> {
    const details = await get_server_details(server_id);

    if (!details)
        return undefined;

    try {
        const result = await fetch(`${details.server}${endpoint}`, {
            method: type,
            headers: {
                "Accept": "application/json",
                ...(type != "GET" && { "Content-Type": "application/json" }),
                ...headers
            },
            ...(type != "GET" && { body: JSON.stringify(data) })
        });

        return await result.json() as MakeFieldsOptional<T>;
    } catch (_) {
        return undefined;
    }
}