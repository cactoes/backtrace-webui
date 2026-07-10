import { get_user_from_token, check_permissions, login_user, JWTManager, register_user, permissions_t, get_user_from_uuid, save_user } from "@backend/manager/account_manager";
import { get_file_with_lock, save_pfp } from "@backend/manager/data_manager";
import { get_all_server_details, probe_remote, make_remote_request, get_server_details, make_remote_request_raw } from "@backend/manager/proxy_manager";
import { response_builder } from "@backend/response_builder";
import { BunRouter, get_body } from "@backend/server";
import type { File } from "buffer";
import AbstractController from "./abstract_controller";

export default class ApiController implements AbstractController {
    constructor() {}

    private async fallback(req: Bun.BunRequest<"/*">) {
        return new response_builder(400)
            .set_message("endpoint not found or invalid method")
            .set_payload({ method: req.method, url: req.url });
    }

    private async services_list(req: Bun.BunRequest<"/services/list">) {
        const result = await get_user_from_token(req.headers.get("cookie")?.slice("token=".length) || "");
        
        if (result == undefined) {
            return new response_builder(401)
                .set_message("error: token was invalid");
        }

        const details = await get_all_server_details();

        const result_servers: [string, [boolean, string]][] = [];

        for (const server_id of Object.keys(details))
            result_servers.push([server_id, await probe_remote(server_id)]);

        return new response_builder()
            .set_payload(result_servers);
    }

    private async account_upload_pfp(req: Bun.BunRequest<"/account/upload/pfp">) {
        const user = await get_user_from_token(req.headers.get("cookie")?.slice("token=".length) || "");
        if (!user) {
            return new response_builder(400)
                .set_message("error: token was invalid");
        }

        const data = await req.formData();
        const image_file = data.get("image") as File | null;
        if (!image_file)
            return new response_builder(400)
                .set_message("error: no image given");

        if (!(await save_pfp(user.uuid, image_file)))
            return new response_builder(400)
                .set_message("error: the image was invalid");

        return new response_builder();
    }

    private async account_update(req: Bun.BunRequest<"/account/update">) {
        const user = await get_user_from_token(req.headers.get("cookie")?.slice("token=".length) || "");
        if (!user) {
            return new response_builder(400)
                .set_message("error: token was invalid");
        }

        const body = await get_body<{ company: string, location: string, website: string, description: string }>(req);
        user.company = body.company;
        user.location = body.location;
        user.website = body.website;
        user.description = body.description;

        if (!(await save_user(user))) {
            return new response_builder(500)
                .set_message("error: failed to save user");
        }

        return new response_builder();
    }

    private async account_check_token(req: Bun.BunRequest<"/account/check/token">) {
        const body = await get_body<{ token: string }>(req);

        const jwt_manager = JWTManager.get_instance();

        return new response_builder()
            .set_payload({ valid: await jwt_manager.check_token(body.token!) });
    }

    private async account_check_permissions(req: Bun.BunRequest<"/account/check/permissions">) {
        const body = await get_body<{ permissions: number }>(req);
        const result = await get_user_from_token(req.headers.get("cookie")?.slice("token=".length) || "");
        if (!result) {
            return new response_builder(400)
                .set_message("error: token was invalid");
        }

        return new response_builder()
            .set_payload({ has_permissions: check_permissions(result.permissions, body.permissions || 0) });
    }

    private async account_public_me(req: Bun.BunRequest<"/account/public/me">) {
        const result = await get_user_from_token(req.headers.get("cookie")?.slice("token=".length) || "");
        if (!result) {
            return new response_builder(400)
                .set_message("error: token was invalid");
        }

        if (result.description && result.description.length > 255) {
            return new response_builder(400)
                .set_message("error: description too long");
        }

        return new response_builder()
            .set_payload({ user: {
                username: result.username,
                uuid: result.uuid,
                permissions: result.permissions,
                created_at: result.created_at,
                description: result.description,
                website: result.website,
                location: result.location,
                company: result.company
             } });
    }

    private async account_public_user(req: Bun.BunRequest<"/account/public/:uuid">) {
        const uuid = parseInt(req.params.uuid);
        if (Number.isNaN(uuid)) {
            return new response_builder(400)
                .set_message("error: uuid was invalid");
        }

        const user = await get_user_from_uuid(uuid);
        if (!user) {
            return new response_builder(400)
                .set_message("error: user not found");
        }

        const anime_counters = {
            0: 0,
            1: 0,
            2: 0,
            3: 0,
        };

        const manga_counters = {
            0: 0,
            1: 0,
            2: 0,
            3: 0,
        };

        if (check_permissions(user.permissions, permissions_t.ANIME_LISTS)) {
            const server_instace = user.servers.find(server => server.server == "yuno");
            if (server_instace) {
                const data = await make_remote_request<{ message: string, success: boolean, data: { anime: { state: anime_state }[], manga: { state: manga_state }[] } }>(
                    "POST", server_instace.server, "/instance/get", {
                        instance: server_instace.id,
                        keys: { anime: [ "state" ], manga: [ "state" ] }
                    }
                );

                if (data && data.success && data.data) {
                    data.data.anime.forEach(v => anime_counters[v.state]++);
                    data.data.manga.forEach(v => manga_counters[v.state]++);
                }
            }
        }

        return new response_builder()
            .set_payload({ user: {
                username: user.username,
                uuid: user.uuid,
                permissions: user.permissions,
                created_at: user.created_at,
                description: user.description,
                website: user.website,
                location: user.location,
                company: user.company,
                anime_counters, manga_counters
            } });
    }

    private async account_login(req: Bun.BunRequest<"/account/login">) {
        const body = await get_body<{ username: string, password: string }>(req);
        const token = await login_user(body.username || "", body.password || "");

        if (!token) {
            return new response_builder(400)
                .set_message("error: username or password are invalid");
        }

        return new response_builder()
            .set_header("Set-Cookie", `token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`)
            .set_payload({ token });
    }

    private async account_register(req: Bun.BunRequest<"/account/register">) {
        const body = await get_body<{ username: string, password: string, key: string }>(req);
        const token = await register_user(body.username || "", body.password || "", body.key || "");

        if (!token) {
            return new response_builder(400)
                .set_message("error: username, password or key are invalid");
        }

        return new response_builder()
            .set_payload({ token });
    }

    private async lists(req: Bun.BunRequest<"/lists">) {
        const result = await get_user_from_token(req.headers.get("cookie")?.slice("token=".length) || "");
        if (!result) {
            return new response_builder(401)
                .set_message("error: token was invalid");
        }

        if (!check_permissions(result.permissions, permissions_t.ANIME_LISTS)) {
            return new response_builder(401)
                .set_message("error: unauthorized");
        }

        const server_instace = result.servers.find(server => server.server == "yuno");
        if (!server_instace) {
            return new response_builder(500)
                .set_message("error: server has not (yet) fully setup this users account, contact administation");
        }

        const data = await make_remote_request<{ message: string, success: boolean, data: any }>(
            "POST", server_instace.server, "/instance/get", {
                instance: server_instace.id,
                keys: {
                    anime: [ "_id", "name", "current", "state" ],
                    manga: [ "_id", "name", "current", "state" ]
                }
            }
        );

        if (!data) {
            return new response_builder(500)
                .set_message("error: remote server not found or unreachable");
        }

        return new response_builder(data.success == true ? 200 : 400)
            .set_payload(data);
    }

    private async lists_anime(req: Bun.BunRequest<"/lists/anime">) {
        const result = await get_user_from_token(req.headers.get("cookie")?.slice("token=".length) || "");
        if (!result) {
            return new response_builder(401)
                .set_message("error: token was invalid");
        }

        if (!check_permissions(result.permissions, permissions_t.ANIME_LISTS)) {
            return new response_builder(401)
                .set_message("error: unauthorized");
        }

        const server_instace = result.servers.find(server => server.server == "yuno");
        if (!server_instace) {
            return new response_builder(500)
                .set_message("error: server has not (yet) fully setup this users account, contact administation");
        }

        const body = await get_body<{ _id: string, name: string, current: string, state: 0 | 1 | 2 | 3 }>(req);

        const data = await make_remote_request<{ message: string, success: boolean, data: any }>(
            "POST", server_instace.server, "/anime/update", {
                instance: server_instace.id,
                id: body._id!,
                pairs: {
                    name: body.name!,
                    current: body.current!,
                    state: body.state!
                }
            }
        );

        if (!data) {
            return new response_builder(500)
                .set_message("error: remote server not found or unreachable");
        }

        return new response_builder(data.success == true ? 200 : 400)
            .set_payload(data);
    }

    private async lists_anime_delete(req: Bun.BunRequest<"/lists/anime">) {
        const result = await get_user_from_token(req.headers.get("cookie")?.slice("token=".length) || "");
        if (!result) {
            return new response_builder(401)
                .set_message("error: token was invalid");
        }

        if (!check_permissions(result.permissions, permissions_t.ANIME_LISTS)) {
            return new response_builder(401)
                .set_message("error: unauthorized");
        }

        const server_instace = result.servers.find(server => server.server == "yuno");
        if (!server_instace) {
            return new response_builder(500)
                .set_message("error: server has not (yet) fully setup this users account, contact administation");
        }

        const body = await get_body<{ id: string }>(req);

        const data = await make_remote_request<{ message: string, success: boolean }>(
            "POST", server_instace.server, "/anime/delete", {
                instance: server_instace.id,
                id: body.id!
            }
        );

        if (!data) {
            return new response_builder(500)
                .set_message("error: remote server not found or unreachable");
        }

        return new response_builder(data.success == true ? 200 : 400)
            .set_payload(data);
    }

    private async lists_anime_create(req: Bun.BunRequest<"/lists/anime/create">) {
        const result = await get_user_from_token(req.headers.get("cookie")?.slice("token=".length) || "");
        if (!result) {
            return new response_builder(401)
                .set_message("error: token was invalid");
        }

        if (!check_permissions(result.permissions, permissions_t.ANIME_LISTS)) {
            return new response_builder(401)
                .set_message("error: unauthorized");
        }

        const server_instace = result.servers.find(server => server.server == "yuno");
        if (!server_instace) {
            return new response_builder(500)
                .set_message("error: server has not (yet) fully setup this users account, contact administation");
        }

        const body = await get_body<{ name: string, current: string, state: number }>(req);

        const data = await make_remote_request<{ message: string, success: boolean, data: { id: string } }>(
            "POST", server_instace.server, "/anime/create", {
                instance: server_instace.id,
                data: {
                    name: body.name,
                    current: body.current,
                    state: body.state
                }
            }
        );

        if (!data) {
            return new response_builder(500)
                .set_message("error: remote server not found or unreachable");
        }

        return new response_builder(data.success == true ? 200 : 400)
            .set_payload(data);
    }

    private async lists_manga(req: Bun.BunRequest<"/lists/manga">) {
        const result = await get_user_from_token(req.headers.get("cookie")?.slice("token=".length) || "");
        if (!result) {
            return new response_builder(401)
                .set_message("error: token was invalid");
        }

        if (!check_permissions(result.permissions, permissions_t.ANIME_LISTS)) {
            return new response_builder(401)
                .set_message("error: unauthorized");
        }

        const server_instace = result.servers.find(server => server.server == "yuno");
        if (!server_instace) {
            return new response_builder(500)
                .set_message("error: server has not (yet) fully setup this users account, contact administation");
        }

        const body = await get_body<{ _id: string, name: string, current: string, state: 0 | 1 | 2 | 3 }>(req);

        const data = await make_remote_request<{ message: string, success: boolean, data: any }>(
            "POST", server_instace.server, "/manga/update", {
                instance: server_instace.id,
                id: body._id!,
                pairs: {
                    name: body.name!,
                    current: body.current!,
                    state: body.state!
                }
            }
        );

        if (!data) {
            return new response_builder(500)
                .set_message("error: remote server not found or unreachable");
        }

        return new response_builder(data.success == true ? 200 : 400)
            .set_payload(data);
    }

    private async lists_manga_delete(req: Bun.BunRequest<"/lists/manga">) {
        const result = await get_user_from_token(req.headers.get("cookie")?.slice("token=".length) || "");
        if (!result) {
            return new response_builder(401)
                .set_message("error: token was invalid");
        }

        if (!check_permissions(result.permissions, permissions_t.ANIME_LISTS)) {
            return new response_builder(401)
                .set_message("error: unauthorized");
        }

        const server_instace = result.servers.find(server => server.server == "yuno");
        if (!server_instace) {
            return new response_builder(500)
                .set_message("error: server has not (yet) fully setup this users account, contact administation");
        }

        const body = await get_body<{ id: string }>(req);

        const data = await make_remote_request<{ message: string, success: boolean, data: any }>(
            "POST", server_instace.server, "/manga/delete", {
                instance: server_instace.id,
                id: body.id!
            }
        );

        if (!data) {
            return new response_builder(500)
                .set_message("error: remote server not found or unreachable");
        }

        return new response_builder(data.success == true ? 200 : 400)
            .set_payload(data);
    }

    private async lists_manga_create(req: Bun.BunRequest<"/lists/manga/create">) {
        const result = await get_user_from_token(req.headers.get("cookie")?.slice("token=".length) || "");
        if (!result) {
            return new response_builder(401)
                .set_message("error: token was invalid");
        }

        if (!check_permissions(result.permissions, permissions_t.ANIME_LISTS)) {
            return new response_builder(401)
                .set_message("error: unauthorized");
        }

        const server_instace = result.servers.find(server => server.server == "yuno");
        if (!server_instace) {
            return new response_builder(500)
                .set_message("error: server has not (yet) fully setup this users account, contact administation");
        }

        const body = await get_body<{ name: string, current: string, state: number }>(req);

        const data = await make_remote_request<{ message: string, success: boolean, data: { id: string } }>(
            "POST", server_instace.server, "/manga/create", {
                instance: server_instace.id,
                data: {
                    name: body.name,
                    current: body.current,
                    state: body.state
                }
            }
        );

        if (!data) {
            return new response_builder(500)
                .set_message("error: remote server not found or unreachable");
        }

        return new response_builder(data.success == true ? 200 : 400)
            .set_payload(data);
    }

    private async version(_: Bun.BunRequest<"/version">) {
        const proxy_servers = await get_all_server_details();

        const results: { [k: string]: string } = {};

        for (const server_name of Object.keys(proxy_servers)) {
            const result = await make_remote_request<{ message: string, success: boolean, data: { version: string } }>("GET", server_name, "/");
            results[server_name] = result?.data?.version || "0.0.0";
        }

        const [ file, release ] = await get_file_with_lock<config_file_t>("config");
        release();

        return new response_builder()
            .set_payload({
                ui: file.version.ui,
                api: file.version.api,
                proxy: results
            });
    }

    private async all_shows(req: Bun.BunRequest<"/shows">) {
        const result = await get_user_from_token(req.headers.get("cookie")?.slice("token=".length) || "");
        if (!result) {
            return new response_builder(401)
                .set_message("error: token was invalid");
        }

        if (!check_permissions(result.permissions, permissions_t.ANIME_LISTS)) {
            return new response_builder(401)
                .set_message("error: unauthorized");
        }

        const data = await make_remote_request<{ message: string, success: boolean, data: { [key: string]: video_meta_entry_t } }>("GET", "toga", "/meta");
        
        if (!data) {
            return new response_builder(500)
                .set_message("error: remote server not found or unreachable");
        }

        return new response_builder()
            .set_payload(data.data!);
    }

    private async video(req: Bun.BunRequest<"/video/*">) {
        const result = await get_user_from_token(req.headers.get("cookie")?.slice("token=".length) || "");
        if (!result) {
            return new response_builder(401)
                .set_message("error: token was invalid");
        }

        if (!check_permissions(result.permissions, permissions_t.STREAMING)) {
            return new response_builder(401)
                .set_message("error: unauthorized");
        }

        const target_file_name = (new URL(req.url).pathname.slice("/api/video".length));

        const details = await get_server_details("toga");
        
        if (!details)
            return new response_builder(400)
                .set_message("error: -");
    
        const range = req.headers.get("range");
        const data = await fetch(`${details.server}/video${target_file_name}`, {
            method: "GET",
            headers: {
                ...(range && { "Range": range }),
                "Accept": "video/mp4"
            }
        });

        const outHeaders = data!.headers;
        outHeaders.set("Cache-Control", "private, no-store");
        outHeaders.set("Pragma", "no-cache");

        return new Response(data!.body, {
            status: data!.status,
            headers: outHeaders
        });
    }

    private async subs(req: Bun.BunRequest<"/subs/*">) {
        const result = await get_user_from_token(req.headers.get("cookie")?.slice("token=".length) || null);
        if (!result) {
            return new response_builder(401)
                .set_message("error: token was invalid");
        }

        if (!check_permissions(result.permissions, permissions_t.STREAMING)) {
            return new response_builder(401)
                .set_message("error: unauthorized");
        }

        const url = new URL(req.url);
        const target_file_name = (url.pathname.slice("/api/subs".length));
        const data = await make_remote_request_raw<Response>("GET", "toga", "/subs" + target_file_name);
        
        return new Response(data!.body, {
            status: data!.status,
            headers: data!.headers
        });
    }

    public create_router(): BunRouter {
        const router = new BunRouter();
        router.get("/*", this.fallback.bind(this));
        router.get("/services/list", this.services_list.bind(this));
        router.get("/account/public/:uuid", this.account_public_user.bind(this));
        router.post("/account/upload/pfp", this.account_upload_pfp.bind(this));
        router.post("/account/update", this.account_update.bind(this));
        router.post("/account/register", this.account_register.bind(this));
        router.post("/account/check/token", this.account_check_token.bind(this));
        router.post("/account/check/permissions", this.account_check_permissions.bind(this));
        router.get("/account/public/me", this.account_public_me.bind(this));
        router.post("/account/login", this.account_login.bind(this));
        router.get("/lists", this.lists.bind(this));
        router.post("/lists/anime", this.lists_anime.bind(this));
        router.post("/lists/anime/create", this.lists_anime_create.bind(this));
        router.delete("/lists/anime", this.lists_anime_delete.bind(this));
        router.post("/lists/manga", this.lists_manga.bind(this));
        router.post("/lists/manga/create", this.lists_manga_create.bind(this));
        router.delete("/lists/manga", this.lists_manga_delete.bind(this));
        router.get("/version", this.version.bind(this));
        router.get("/video/*", this.video.bind(this));
        router.get("/subs/*", this.subs.bind(this));
        router.get("/shows", this.all_shows.bind(this));
        return router;
    }
};