#!/usr/bin/env node
import * as account_controller from "controllers/account";
import { response_builder } from "response_builder";
import * as data_controller from "controllers/data";
import * as server_controller from "controllers/server";

// function get_keys<T extends object>(obj: T): (keyof T)[] {
//     return Object.keys(obj) as (keyof T)[];
// }

function unused_params(...args: any[]): void { args; }

async function resolve_file(fullname: string): Promise<Uint8Array<ArrayBufferLike> | undefined> {
    const parts = fullname.split(".");
    const ext = parts.at(-1);
    const name = parts.slice(0, -1).join(".");

    let path: string | undefined;

    switch(ext) {
        case "js":
            path = "scripts/js";
            break;
        case "css":
            path = "styles";
            break;
        case "png":
        case "jpg":
            path = "media";
            break;
        case "html":
            path = "html";
            break;
        default:
            return undefined;
    }
    
    const file = Bun.file(`frontend/${path}/${name}.${ext}`);

    if (await file.exists())
        return await file.bytes();

    return undefined;
}

function resolve_meta(fullname: string) {
    const ext = fullname.split(".").at(-1);

    switch(ext) {
        case "js":
            return { "Content-Type": "text/javascript" };
        case "css":
            return { "Content-Type": "text/css" };
        case "html":
            return { "Content-Type": "text/html" };
        case "png":
            return { "Content-Type": "image/png" };
        case "jpg":
            return { "Content-Type": "image/jpeg" };
        default:
            return undefined;
    }
}

type MakeFieldsOptional<T> = {
    [K in keyof T]?: T[K] | undefined;
};

async function get_body<T, U extends string = string>(req: Bun.BunRequest<U>): Promise<MakeFieldsOptional<T>> {
    return await req.json() as MakeFieldsOptional<T>;
}

async function make_remote_request<T>(type: "GET" | "POST" | "PATCH" | "PUT", full_url: string, data?: Object | Array<any>, headers?: { [key: string]: string }): Promise<MakeFieldsOptional<T>> {
    const result = await fetch(full_url, {
        method: type,
        headers: {
            "Accept": "application/json",
            ...(type != "GET" && { "Content-Type": "application/json" }),
            ...headers
        },
        ...(type != "GET" && { body: JSON.stringify(data) })
    });

    return await result.json() as MakeFieldsOptional<T>;
}

Bun.serve({
    port: process.env.PORT,
    routes: {
        // routes
        "/": async (req) => {
            unused_params(req);

            const file = await resolve_file("index.html");
            const meta = resolve_meta("index.html");

            return new Response(file, { headers: { ...meta } });
        },

        "/404": async () => {
            const file = await resolve_file("404.html");
            const meta = resolve_meta("404.html");

            return new Response(file, { headers: { ...meta }, status: 404 });
        },

        "/:page": async (req: Bun.BunRequest<"/:page">) => {
            if (!["home", "profile", "lists", "login", "passwords"].includes(req.params.page))
                return Response.redirect("/404");

            const file = await resolve_file(`${req.params.page}.html`);
            const meta = resolve_meta(`${req.params.page}.html`);

            return new Response(file, { headers: { ...meta } });
        },

        "/files/pfp/:uuid": async (req: Bun.BunRequest<"/files/pfp/:uuid">) => {
            const pfp_data = await data_controller.get_pfp(parseInt(req.params.uuid));

            if (!pfp_data)
                return new response_builder(404).build();

            return new Response(pfp_data);
        },

        // data endpoints
        "/files/:fullname": async (req) => {
            unused_params(req);

            const fullname = req.params.fullname;
            const file = await resolve_file(fullname);
            const meta = resolve_meta(fullname);

            if (!file || !meta)
                return new Response("file not found or filetype not supported", { status: 404 });

            return new Response(file, { headers: { ...meta } });
        },
        "/api/account/check/token": {
            POST: async (req: Bun.BunRequest<"/api/account/check/token">) => {
                const body = await get_body<{ token: string }>(req);

                return new response_builder()
                    .set_payload({ valid: await account_controller.check_token(body.token!) })
                    .build();
            }
        },
        "/api/account/public/me": {
            GET: async (req: Bun.BunRequest<"/api/account/public/me">) => {
                const result = await account_controller.get_user_from_token(req.headers.get("Authorization"));

                if (!result)
                    return new response_builder()
                        .set_message("error: token was invalid")
                        .set_status(400)
                        .build();

                return new response_builder()
                    .set_payload({ user: { username: result.username, uuid: result.uuid } })
                    .build();
            }
        },
        "/api/account/login": {
            POST: async (req: Bun.BunRequest<"/api/account/login">) => {
                const body = await get_body<{ username: string, password: string }>(req);
                const token = await account_controller.login_user(body.username || "", body.password || "");

                if (!token)
                    return new response_builder(400)
                        .set_message("error: username or password are invalid")
                        .build();

                return new response_builder()
                    .set_payload({ token })
                    .build();
            }
        },
        "/api/lists": {
            GET: async (req: Bun.BunRequest<"/api/lists">) => {
                const result = await account_controller.get_user_from_token(req.headers.get("Authorization"));
                if (!result)
                    return new response_builder()
                        .set_message("error: token was invalid")
                        .set_status(400)
                        .build();

                const server_instace = result.servers.find(server => server.server == "yuno");

                if (!server_instace)
                    return new response_builder()
                        .set_message("error: server has not (yet) fully setup this users account, contact administation")
                        .set_status(500)
                        .build();

                const server_details = (await server_controller.get_server_details(server_instace.server))!;

                const data = await make_remote_request<{ message: string, success: boolean, data: any }>("POST", `${server_details.server}/instance/get`, {
                    instance: server_instace.id,
                    keys: {
                        anime: [ "_id", "name", "current", "state" ],
                        manga: [ "_id", "name", "current", "state" ]
                    }
                });

                return new response_builder(data.success == true ? 200 : 400)
                    .set_payload(data)
                    .build();
            }
        },
        "/api/*": (req: Bun.BunRequest<"/api/*">) => {
            return new response_builder(400)
                .set_message("endpoint not found or invalid method")
                .set_payload({ method: req.method, url: req.url })
                .build();
        },

        "/*": async (req: Bun.BunRequest<"/*">) => {
            console.error(`[fallback]: url \"${req.method} ${req.url}\" not found or method was incorrect (redirecting 404).`);
            return Response.redirect("/404");
        }
    },
    async error(error) {
        return new Response(`unexcpected server error: ${error.message}`, { status: 500 });
    }
});