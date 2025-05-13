//==========================================
/// @file       data.ts
/// @brief      file manager (thread safe)
//==========================================

import { Mutex } from "../utils/utils";
import * as path from "path";

const mutex_map: { [key: string]: Mutex } = {};

function resolve_path(filename: string, ext: string = "json"): string {
    const prefix = process.env.IS_PRODUCTION == "true" ? "prod" : "dev";
    return path.join(__dirname, `../../data/${prefix}/${filename}.${ext}`);
}

export async function get_pfp(uuid: number): Promise<Bun.BunFile | undefined> {
    try {
        const file = Bun.file(resolve_path(`pfp/${uuid}`, "png"));

        if (!(await file.exists()))
            return undefined;

        return file;
    } catch (err) {
        return undefined
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