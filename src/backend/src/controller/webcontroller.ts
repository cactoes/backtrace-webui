import { check_permissions, get_user_from_token, permissions_t } from "@backend/manager/account_manager";
import { resolve_web_file } from "@backend/manager/data_manager";
import { BunRouter } from "@backend/server";
import AbstractController from "./abstract_controller";

export default class WebController implements AbstractController {
    static pages = [
        { name: "home", required_permissions: 0, },
        { name: "account", required_permissions: 0, },
        { name: "lists", required_permissions: permissions_t.ANIME_LISTS, },
        { name: "login", required_permissions: 0, },
        { name: "profile", required_permissions: 0, },
        { name: "passwords", required_permissions: permissions_t.PASSWORD_MANAGER, },
        { name: "password-register", required_permissions: permissions_t.PASSWORD_MANAGER, },
        { name: "services", required_permissions: permissions_t.SERVICE_LIST, },
        { name: "streaming", required_permissions: permissions_t.STREAMING, },
        { name: "register", required_permissions: 0, }
    ];

    constructor() {}

    private check_valid_page(page_name: string): boolean {
        return WebController.pages.find(p => p.name == page_name) != undefined;
    }

    private check_page_permissions(page_name: string, user_permissions: number): boolean {
        const page = WebController.pages.find(p => p.name == page_name);
        if (!page)
            return false;

        if (page.required_permissions == 0)
            return true;

        return check_permissions(user_permissions, page.required_permissions);
    }

    private async home(_: Bun.BunRequest<"/">): Promise<Response> {
        const [ file, meta ] = (await resolve_web_file("index.html"))!;
        return new Response(file as BodyInit, { headers: { ...meta } });
    }

    private async 404(_: Bun.BunRequest<"/404">): Promise<Response> {
        const [ file, meta ] = (await resolve_web_file("404.html"))!;
        return new Response(file as BodyInit, { headers: { ...meta } });
    }

    private async unauthorized(_: Bun.BunRequest<"/unauthorized">): Promise<Response> {
        const [ file, meta ] = (await resolve_web_file("unauthorized.html"))!;
        return new Response(file as BodyInit, { headers: { ...meta } });
    }

    private async page(req: Bun.BunRequest<"/:page">): Promise<Response> {
        if (!this.check_valid_page(req.params.page))
            return Response.redirect("/404");

        let user_permissions = 0;
        const result = await get_user_from_token(req.headers.get("cookie")?.slice("token=".length) || "");
        if (result)
            user_permissions = result.permissions;

        if (!this.check_page_permissions(req.params.page, user_permissions))
            return Response.redirect("/unauthorized");

        const [ file, meta ] = (await resolve_web_file(`${req.params.page}.html`))!;
        return new Response(file as BodyInit, { headers: { ...meta } });
    }

    private async page_backup(req: Bun.BunRequest<"/:page/*">): Promise<Response> {
        if (!this.check_valid_page(req.params.page))
            return Response.redirect("/404");

        let user_permissions = 0;
        const result = await get_user_from_token(req.headers.get("cookie")?.slice("token=".length) || "");
        if (result)
            user_permissions = result.permissions;

        if (!this.check_page_permissions(req.params.page, user_permissions))
            return Response.redirect("/unauthorized");

        const [ file, meta ] = (await resolve_web_file(`${req.params.page}.html`))!;
        return new Response(file as BodyInit, { headers: { ...meta } });
    }

    public create_router(): BunRouter {
        const router = new BunRouter();
        router.get("/", this.home.bind(this));
        router.get("/:page", this.page.bind(this));
        router.get("/:page/*", this.page_backup.bind(this));
        router.get("/404", this["404"].bind(this));
        router.get("/unauthorized", this.unauthorized.bind(this));
        return router;
    }
};