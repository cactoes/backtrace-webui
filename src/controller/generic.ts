//==========================================
/// @file       generic.ts
/// @brief      generic routes
//==========================================

import { BunRouter, resolve_web_file } from "../server";

export const router = new BunRouter();

class generic_controller {
    static allowed_pages = [ "home", "account", "lists", "login", "passwords", "services", "streaming", "register" ]

    public static async home(_: Bun.BunRequest<"/">): Promise<Response> {
        const [ file, meta ] = (await resolve_web_file("index.html"))!;
        return new Response(file, { headers: { ...meta } });
    }

    public static async 404(_: Bun.BunRequest<"/404">): Promise<Response> {
        const [ file, meta ] = (await resolve_web_file("404.html"))!;
        return new Response(file, { headers: { ...meta } });
    }

    public static async fallback(req: Bun.BunRequest<"/*">): Promise<Response> {
        console.error(`[fallback]: url \"${req.method} ${req.url}\" not found or method was incorrect (redirecting 404).`);
        return Response.redirect("/404");
    }

    public static async page(req: Bun.BunRequest<"/:page">): Promise<Response> {
        if (!generic_controller.allowed_pages.includes(req.params.page))
            return Response.redirect("/404");

        const [ file, meta ] = (await resolve_web_file(`${req.params.page}.html`))!;
        return new Response(file, { headers: { ...meta } });
    }

    public static async page_backup(req: Bun.BunRequest<"/:page/*">): Promise<Response> {
        if (!generic_controller.allowed_pages.includes(req.params.page))
            return Response.redirect("/404");

        const [ file, meta ] = (await resolve_web_file(`${req.params.page}.html`))!;
        return new Response(file, { headers: { ...meta } });
    }
};

router.get("/", generic_controller.home);
router.get("/:page", generic_controller.page);
router.get("/:page/*", generic_controller.page_backup);
router.get("/404", generic_controller["404"]);
router.get("/*", generic_controller.fallback);