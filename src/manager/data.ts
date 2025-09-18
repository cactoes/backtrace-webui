//==========================================
/// @file       data.ts
/// @brief      file manager (thread safe)
//==========================================

import type { File } from "buffer";
import { Mutex } from "../utils/utils";
import * as path from "path";
import { Glob } from "bun";

const PFP_MAX_SIZE = 1 * 1024 * 1014; // 1mb
const mutex_map: { [key: string]: Mutex } = {};

function get_data_path() {
    const prefix = process.env.IS_PRODUCTION == "true" ? "prod" : "dev";
    return path.join(__dirname, `../../data/${prefix}`);
}

function resolve_path(filename: string, ext: string = "json"): string {
    return path.join(get_data_path(), `${filename}.${ext}`);
}

export function get_certs(): { cert: Bun.BunFile, key: Bun.BunFile } {
    return {
        cert: Bun.file(resolve_path("cert/cert", "pem")),
        key: Bun.file(resolve_path("cert/key", "pem")),
    };
}

export async function get_pfp(uuid: number): Promise<Bun.BunFile | undefined> {
    try {
        const glob = new Glob(get_data_path() + `/pfp/${uuid}.*`);
        const result = glob.scan();
        let filename: string | undefined = undefined;

        for await (const file of result) {
            filename = file;
            break;
        }

        if (!filename)
            return undefined;

        const file = Bun.file(filename);

        if (!(await file.exists()))
            return undefined;

        return file;
    } catch (err) {
        return undefined
    }
}

export async function save_pfp(uuid: number, file: File): Promise<boolean> {
    const ext = file.name.split(".").at(-1);
    if (!ext)
        return false;

    if (![ "png", "jpg", "jpeg" ].includes(ext.toLowerCase()))
        return false;

    if (file.size > PFP_MAX_SIZE)
        return false;

    try {
        await Bun.write(resolve_path(`pfp/${uuid}`, ext), file as any);
        return true;
    } catch (_) {
        return false
    }
}

/**
 * @brief               wrapper for reading files of the disk & parsing into json
 * @param filename      name of the file
 * @returns             promise to a json parsed file handle
 * @remarks             automatically determines what version of the file to use
 *                      ex: .dev.json or .prod.json
 */
export async function get_file_with_lock<T extends (Object | Array<any>)>(filename: string): Promise<[T, ReleaseFunction]> {
    if (mutex_map[filename] == undefined)
        mutex_map[filename] = new Mutex();

    return [
        await Bun.file(resolve_path(filename)).json(),
        await mutex_map[filename].acquire()
    ];
}

/**
 * @brief                       saves the data to a file & releases the write lock
 * @param filename              name of the file
 * @param release_function      mutex release function
 * @param data                  file contents to write
 * @remarks                     automatically determines what version of the file to use
 *                              ex: .dev.json or .prod.json
 */
export async function save_file_and_unlock<T extends (Object | Array<any>)>(filename: string, release_function: ReleaseFunction, data: T): Promise<void> {
    await Bun.file(resolve_path(filename)).write(JSON.stringify(data, null, 4));
    release_function();
}