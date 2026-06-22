//==========================================
/// @file       generic.ts
/// @brief      generic routes
//==========================================

import { account_manager } from "../manager/manager";
import { BunRouter, resolve_web_file } from "../server";
import { permissions_t } from "../manager/account";

export const router = new BunRouter();

class generic_controller {
    static allowed_pages = [
        {
            name: "home",
            required_permissions: 0,
        },
        {
            name: "account",
            required_permissions: 0,
        },
        {
            name: "lists",
            required_permissions: permissions_t.ANIME_LISTS,
        },
        {
            name: "login",
            required_permissions: 0,
        },
        {
            name: "passwords",
            required_permissions: permissions_t.PASSWORD_MANAGER,
        },
        {
            name: "services",
            required_permissions: permissions_t.SERVICE_LIST,
        },
        {
            name: "streaming",
            required_permissions: permissions_t.STREAMING,
        },
        {
            name: "register",
            required_permissions: 0,
        }
    ]

    public static check_valid_page(page_name: string): boolean {
        return generic_controller.allowed_pages.find(p => p.name == page_name) != undefined;
    }

    public static check_page_permissions(page_name: string, user_permissions: number): boolean {
        const page = generic_controller.allowed_pages.find(p => p.name == page_name);
        if (!page)
            return false;

        if (page.required_permissions == 0)
            return true;

        return account_manager.check_permissions(user_permissions, page.required_permissions);
    }

    public static async home(_: Bun.BunRequest<"/">): Promise<Response> {
        const [ file, meta ] = (await resolve_web_file("index.html"))!;
        return new Response(file, { headers: { ...meta } });
    }

    public static async 404(_: Bun.BunRequest<"/404">): Promise<Response> {
        const [ file, meta ] = (await resolve_web_file("404.html"))!;
        return new Response(file, { headers: { ...meta } });
    }

    public static async unauthorized(_: Bun.BunRequest<"/unauthorized">): Promise<Response> {
        const [ file, meta ] = (await resolve_web_file("unauthorized.html"))!;
        return new Response(file, { headers: { ...meta } });
    }

    public static async fallback(req: Bun.BunRequest<"/*">): Promise<Response> {
        console.error(`[fallback]: url \"${req.method} ${req.url}\" not found or method was incorrect (redirecting 404).`);
        return Response.redirect("/404");
    }

    public static async page(req: Bun.BunRequest<"/:page">): Promise<Response> {
        if (!generic_controller.check_valid_page(req.params.page))
            return Response.redirect("/404");

        let user_permissions = 0;
        const result = await account_manager.get_user_from_token(req.headers.get("cookie")?.slice("token=".length) || "");
        if (result)
            user_permissions = result.permissions;

        if (!generic_controller.check_page_permissions(req.params.page, user_permissions))
            return Response.redirect("/unauthorized");

        const [ file, meta ] = (await resolve_web_file(`${req.params.page}.html`))!;
        return new Response(file, { headers: { ...meta } });
    }

    public static async page_backup(req: Bun.BunRequest<"/:page/*">): Promise<Response> {
        if (!generic_controller.check_valid_page(req.params.page))
            return Response.redirect("/404");

        let user_permissions = 0;
        const result = await account_manager.get_user_from_token(req.headers.get("cookie")?.slice("token=".length) || "");
        if (result)
            user_permissions = result.permissions;

        if (!generic_controller.check_page_permissions(req.params.page, user_permissions))
            return Response.redirect("/unauthorized");

        const [ file, meta ] = (await resolve_web_file(`${req.params.page}.html`))!;
        return new Response(file, { headers: { ...meta } });
    }
};

router.get("/", generic_controller.home);
router.get("/:page", generic_controller.page);
router.get("/:page/*", generic_controller.page_backup);
router.get("/404", generic_controller["404"]);
router.get("/unauthorized", generic_controller.unauthorized);
router.get("/*", generic_controller.fallback);