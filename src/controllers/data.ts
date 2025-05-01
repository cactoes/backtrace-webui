import { Mutex, type ReleaseFunction } from "mutex";
import * as path from "path";

const mutex_map: { [key: string]: Mutex } = {};

/**
 * @brief               wrapper for reading files of the disk & parsing into json
 * @param filename      name of the file
 * @returns             promise to a json parsed file handle
 * @remarks             automatically determines what version of the file to use
 *                      ex: .dev.json or .prod.json
 */
export async function get_file_with_lock<T extends (Object | Array<any>)>(filename: string): Promise<[T, ReleaseFunction]> {
    const prefix = process.env.IS_PRODUCTION == "true" ? "prod" : "dev";

    if (mutex_map[filename] == undefined)
        mutex_map[filename] = new Mutex();

    return [
        await Bun.file(path.join(__dirname, `../../data/${filename}.${prefix}.json`)).json(),
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
    const prefix = process.env.IS_PRODUCTION == "true" ? "prod" : "dev";
    await Bun.file(path.join(__dirname, `../../data/${filename}.${prefix}.json`)).write(JSON.stringify(data, null, 4));
    release_function();
}