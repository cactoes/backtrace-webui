#!/usr/bin/env node
// import * as webui_controller from "controllers/webui";
import * as account_controller from "controllers/account";
import type { promises } from "dns";
import { response_builder } from "response_builder";

// function get_keys<T extends object>(obj: T): (keyof T)[] {
//     return Object.keys(obj) as (keyof T)[];
// }

function unused_params(...args: any[]): void { args; }

async function create_html_file_response(filename: string): Promise<Response> {
    return new Response(await Bun.file(`frontend/${filename}.html`).bytes(), {
        headers: {
            "Content-Type": "text/html"
        }
    });
}

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

Bun.serve({
    port: process.env.PORT,
    routes: {
        // routes
        "/": async (req) => {
            const file = await resolve_file("index.html");
            const meta = resolve_meta("index.html");

            if (!await account_controller.authenticate.PUBLIC(req.headers.get("token"), 0))
                return Response.redirect("/404");

            return new Response(file, { headers: { ...meta } });
        },

        "/home": async (req) => {
            const file = await resolve_file("home.html");
            const meta = resolve_meta("home.html");

            // if (!await account_controller.authenticate.PROTECTED(req.headers.get("token"), 0))
            //     return Response.redirect("/login");

            return new Response(file, { headers: { ...meta } });
        },

        "/profile": async (req) => {
            const file = await resolve_file("index.html");
            const meta = resolve_meta("index.html");

            if (!await account_controller.authenticate.PROTECTED(req.headers.get("token"), 0))
                return Response.redirect("/login");

            return new Response(file, { headers: { ...meta } });
        },

        "/lists": async (req) => {
            const file = await resolve_file("index.html");
            const meta = resolve_meta("index.html");

            if (!await account_controller.authenticate.PROTECTED(req.headers.get("token"), 0))
                return Response.redirect("/login");

            return new Response(file, { headers: { ...meta } });
        },

        "/passwords": async (req) => {
            const file = await resolve_file("index.html");
            const meta = resolve_meta("index.html");

            if (!await account_controller.authenticate.PROTECTED(req.headers.get("token"), 0))
                return Response.redirect("/login");

            return new Response(file, { headers: { ...meta } });
        },

        "/login": async () => {
            const file = await resolve_file("login.html");
            const meta = resolve_meta("login.html");

            return new Response(file, { headers: { ...meta } });
        },

        // data endpoints
        "/files/:fullname": async (req) => {
            const fullname = req.params.fullname;
            const file = await resolve_file(fullname);
            const meta = resolve_meta(fullname);

            if (!file || !meta)
                return new Response("file not found or filetype not supported", { status: 404 });

            return new Response(file, { headers: { ...meta } });
        },
        "/api/account": {
            POST: async (req: Bun.BunRequest<"/api/account">) => {
                const body = await req.json() as { token: string };
                
                return new response_builder()
                    .set_message("token checked")
                    .set_payload({ valid: account_controller.check_token(body.token) })
                    .set_status(200)
                    .build();
            }
        },
        // "/api/*": (req: Bun.BunRequest<"/api/*">) => new Response(JSON.stringify({ message: "endpoint not found", error: true, payload: req.url }), { status: 404, headers: { "Content-Type": "application/json" } }),
        
        "/404": async () => {
            const file = await resolve_file("404.html");
            const meta = resolve_meta("404.html");

            return new Response(file, { headers: { ...meta }, status: 404 });
        },

        "/*": async () => {
            return Response.redirect("/404");
        }
    },
    async error(error) {
        return new Response(`unexcpected server error: ${error.message}`, { status: 500 });
    }
});