//==========================================
/// @file       router.ts
/// @brief      bun router helper functions
//==========================================

import type { response_builder } from "./utils/utils";

export class BunRouter {
    public routes: { [key: string]: { [m: string ]: (req: Bun.BunRequest<any>) => Promise<Response> } }[] = [];

    private add_method(url: string, method: "GET" | "POST" | "PUT" | "PATCH", callback: any) {
        const existing = this.routes.find(r => Object.keys(r)[0]! == url);

        if (existing) {
            existing[url]![method] = async (req: any) => (await callback(req)).build()
            return;
        }

        this.routes.push({
            [url]: {
                [method]: async (req: any) => await callback(req)
            }
        });
    }

    private make_callback<T extends string>(callback: (req: Bun.BunRequest<T | string>) => Promise<response_builder<any> | Response>) {
        return async (req: any) => {
            console.log(`[log]: ${req.method.padEnd(4)} \"${req.url}\"`);
            const result = await callback(req);
            return result instanceof Response ?  result : result.build();
        }
    }

    public get<T extends string>(url: T, callback: (req: Bun.BunRequest<T>) => Promise<response_builder<any> | Response>) {
        this.add_method(url, "GET", this.make_callback(callback));
    }
    public post<T extends string>(url: T, callback: (req: Bun.BunRequest<T>) => Promise<response_builder<any> | Response>) {
        this.add_method(url, "POST", this.make_callback(callback));
    }
    public put<T extends string>(url: T, callback: (req: Bun.BunRequest<T>) => Promise<response_builder<any> | Response>) {
        this.add_method(url, "PUT", this.make_callback(callback));
    }
    public patch<T extends string>(url: T, callback: (req: Bun.BunRequest<T>) => Promise<response_builder<any> | Response>) {
        this.add_method(url, "PATCH", this.make_callback(callback));
    }
};

export class BunServer {
    public routes: any = {};

    constructor(public port: string | undefined) {}

    public add_router(url: string, router: BunRouter) {
        if (url == "") {
            Object.assign(this.routes, ...router.routes);
            return;
        }

        const routes = router.routes.map(obj => {
            const key = Object.keys(obj)[0]!;
            return { [`${url}${key}`]: obj[key] };
        });

        Object.assign(this.routes, ...routes);
    }

    public start(callback?: () => void | undefined) {
        Bun.serve({
            port: this.port,
            routes: { ...this.routes },
            async error(error) {
                return new Response(`unexcpected server error: ${error.message}`, { status: 500 });
            }
        });

        if (callback)
            callback();
    }
};

export async function get_body<T, U extends string = string>(req: Bun.BunRequest<U>): Promise<MakeFieldsOptional<T>> {
    return await req.json() as MakeFieldsOptional<T>;
}

export async function resolve_web_file(fullname: string): Promise<[Uint8Array, { "Content-Type": string; }] | undefined> {
    const parts = fullname.split(".");
    const ext = parts.at(-1);
    const name = parts.slice(0, -1).join(".");

    let path: string | undefined;

    switch(ext) {
        case "js":      path = "scripts/js"; break;
        case "css":     path = "styles"; break;
        case "png":
        case "jpg":     path = "media"; break;
        case "html":    path = "html"; break;
        default:        return undefined;
    }
    
    const file = Bun.file(`frontend/${path}/${name}.${ext}`);

    if (!(await file.exists()))
        return undefined;
    
    const file_data = await file.bytes();

    let file_meta = { "Content-Type": "text/html" };

    switch(ext) {
        case "js":      file_meta = { "Content-Type": "text/javascript" }; break;
        case "css":     file_meta = { "Content-Type": "text/css" }; break;
        case "html":    file_meta = { "Content-Type": "text/html" }; break;
        case "png":     file_meta = { "Content-Type": "image/png" }; break;
        case "jpg":     file_meta = { "Content-Type": "image/jpeg" }; break;
        default:        return undefined;
    }

    return [ file_data, file_meta ];
}