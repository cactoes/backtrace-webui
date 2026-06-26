import * as Bun from "bun";
import { response_builder } from "./response_builder";
import { get_certs } from "./manager/data_manager";

export class BunRouter {
    public routes: { [key: string]: { [m: string ]: (req: Bun.BunRequest<any>) => Promise<Response> } }[] = [];

    private add_route(url: string, method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", callback: any) {
        const existing = this.routes.find(r => Object.keys(r)[0]! == url);

        if (existing) {
            existing[url]![method] = async (req: any) => (await callback(req))
            return;
        }

        this.routes.push({
            [url]: {
                [method]: async (req: any) => await callback(req)
            }
        });
    }

    private make_callback<T extends string>(callback: (req: Bun.BunRequest<T>) => Promise<response_builder<any> | Response>) {
        return async (req: any) => {
            // if (process.env.IS_PRODUCTION != "true")
            //     console.log(`[log]: ${req.method.padEnd(4)} \"${req.url}\"`);
            const result = await callback(req);
            return result instanceof Response ? result : result.build();
        }
    }

    public get<T extends string>(url: T, callback: (req: Bun.BunRequest<T>) => Promise<response_builder<any> | Response>) {
        this.add_route(url, "GET", this.make_callback(callback));
    }

    public post<T extends string>(url: T, callback: (req: Bun.BunRequest<T>) => Promise<response_builder<any> | Response>) {
        this.add_route(url, "POST", this.make_callback(callback));
    }

    public put<T extends string>(url: T, callback: (req: Bun.BunRequest<T>) => Promise<response_builder<any> | Response>) {
        this.add_route(url, "PUT", this.make_callback(callback));
    }

    public patch<T extends string>(url: T, callback: (req: Bun.BunRequest<T>) => Promise<response_builder<any> | Response>) {
        this.add_route(url, "PATCH", this.make_callback(callback));
    }

    public delete<T extends string>(url: T, callback: (req: Bun.BunRequest<T>) => Promise<response_builder<any> | Response>) {
        this.add_route(url, "DELETE", this.make_callback(callback));
    }
};

export default class bun_server {
    public routes: any = {};

    constructor(
        public port: string | undefined,
        private use_certs: boolean = false) {}

    public add_router(url: string, router: BunRouter) {
        if (url == "" || url == "/") {
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
                console.log(`unexcpected server error: ${error.message}`);
                return new Response(`unexcpected server error: ${error.message}`, { status: 500 });
            },
            tls: {
                ...(this.use_certs && { ...get_certs() })
            }
        });

        if (callback)
            callback();
    }
};

export async function get_body<T, U extends string = string>(req: Bun.BunRequest<U>): Promise<MakeFieldsOptional<T>> {
    return await req.json() as MakeFieldsOptional<T>;
}