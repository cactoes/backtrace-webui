//==========================================
/// @file       api.ts
/// @brief      api routes
//==========================================

import { response_builder } from "../utils/utils";
import { BunRouter, get_body } from "../server";
import { account_manager, proxy_manager } from "../manager/manager";
import type { File } from "buffer";
import { save_pfp } from "manager/data";

export const router = new BunRouter();

class api_controller {
    public static async fallback(req: Bun.BunRequest<"/*">) {
        return new response_builder(400)
            .set_message("endpoint not found or invalid method")
            .set_payload({ method: req.method, url: req.url });
    }

    public static async services_list(req: Bun.BunRequest<"/services/list">) {
        const result = await account_manager.get_user_from_token(req.headers.get("Authorization"));
        if (!result) {
            return new response_builder(400)
                .set_message("error: token was invalid");
        }

        const details = await proxy_manager.get_all_server_details();
        const result_servers: [string, boolean][] = [];
        for (const server_id of Object.keys(details))
            result_servers.push([server_id, await proxy_manager.probe_remote(server_id)]);

        return new response_builder()
            .set_payload(result_servers);
    }

    public static async account_upload_pfp(req: Bun.BunRequest<"/account/upload/pfp">) {
        const user = await account_manager.get_user_from_token(req.headers.get("Authorization"));
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

    public static async account_check_token(req: Bun.BunRequest<"/account/check/token">) {
        const body = await get_body<{ token: string }>(req);

        const JWTManager = account_manager.JWTManager.get_instance();

        return new response_builder()
            .set_payload({ valid: await JWTManager.check_token(body.token!) });
    }

    public static async account_public_me(req: Bun.BunRequest<"/account/public/me">) {
        const result = await account_manager.get_user_from_token(req.headers.get("Authorization"));

        if (!result) {
            return new response_builder(400)
                .set_message("error: token was invalid");
        }

        return new response_builder()
            .set_payload({ user: { username: result.username, uuid: result.uuid } });
    }

    public static async account_login(req: Bun.BunRequest<"/account/login">) {
        const body = await get_body<{ username: string, password: string }>(req);
        const token = await account_manager.login_user(body.username || "", body.password || "");

        if (!token) {
            return new response_builder(400)
                .set_message("error: username or password are invalid");
        }

        return new response_builder()
            .set_payload({ token });
    }

    public static async account_register(req: Bun.BunRequest<"/account/register">) {
        const body = await get_body<{ username: string, password: string, key: string }>(req);
        const token = await account_manager.register_user(body.username || "", body.password || "", body.key || "");

        if (!token) {
            return new response_builder(400)
                .set_message("error: username, password or key are invalid");
        }

        return new response_builder()
            .set_payload({ token });
    }

    public static async lists(req: Bun.BunRequest<"/lists">) {
        const result = await account_manager.get_user_from_token(req.headers.get("Authorization"));
        if (!result) {
            return new response_builder(400)
                .set_message("error: token was invalid");
        }

        const server_instace = result.servers.find(server => server.server == "yuno");
        if (!server_instace) {
            return new response_builder(500)
                .set_message("error: server has not (yet) fully setup this users account, contact administation");
        }

        const data = await proxy_manager.make_remote_request<{ message: string, success: boolean, data: any }>(
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

    public static async lists_anime(req: Bun.BunRequest<"/lists/anime">) {
        const result = await account_manager.get_user_from_token(req.headers.get("Authorization"));
        if (!result) {
            return new response_builder(400)
                .set_message("error: token was invalid");
        }

        const server_instace = result.servers.find(server => server.server == "yuno");
        if (!server_instace) {
            return new response_builder(500)
                .set_message("error: server has not (yet) fully setup this users account, contact administation");
        }

        const body = await get_body<{ _id: string, name: string, current: string, state: 0 | 1 | 2 | 3 }>(req);

        const data = await proxy_manager.make_remote_request<{ message: string, success: boolean, data: any }>(
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

    public static async lists_anime_delete(req: Bun.BunRequest<"/lists/anime">) {
        const result = await account_manager.get_user_from_token(req.headers.get("Authorization"));
        if (!result) {
            return new response_builder(400)
                .set_message("error: token was invalid");
        }

        const server_instace = result.servers.find(server => server.server == "yuno");
        if (!server_instace) {
            return new response_builder(500)
                .set_message("error: server has not (yet) fully setup this users account, contact administation");
        }

        const body = await get_body<{ id: string }>(req);

        const data = await proxy_manager.make_remote_request<{ message: string, success: boolean }>(
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

    public static async lists_anime_create(req: Bun.BunRequest<"/lists/anime/create">) {
        const result = await account_manager.get_user_from_token(req.headers.get("Authorization"));
        if (!result) {
            return new response_builder(400)
                .set_message("error: token was invalid");
        }

        const server_instace = result.servers.find(server => server.server == "yuno");
        if (!server_instace) {
            return new response_builder(500)
                .set_message("error: server has not (yet) fully setup this users account, contact administation");
        }

        const body = await get_body<{ name: string, current: string, state: number }>(req);

        const data = await proxy_manager.make_remote_request<{ message: string, success: boolean, data: { id: string } }>(
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

    public static async lists_manga(req: Bun.BunRequest<"/lists/manga">) {
        const result = await account_manager.get_user_from_token(req.headers.get("Authorization"));
        if (!result) {
            return new response_builder(400)
                .set_message("error: token was invalid");
        }

        const server_instace = result.servers.find(server => server.server == "yuno");
        if (!server_instace) {
            return new response_builder(500)
                .set_message("error: server has not (yet) fully setup this users account, contact administation");
        }

        const body = await get_body<{ _id: string, name: string, current: string, state: 0 | 1 | 2 | 3 }>(req);

        const data = await proxy_manager.make_remote_request<{ message: string, success: boolean, data: any }>(
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

    public static async lists_manga_delete(req: Bun.BunRequest<"/lists/manga">) {
        const result = await account_manager.get_user_from_token(req.headers.get("Authorization"));
        if (!result) {
            return new response_builder(400)
                .set_message("error: token was invalid");
        }

        const server_instace = result.servers.find(server => server.server == "yuno");
        if (!server_instace) {
            return new response_builder(500)
                .set_message("error: server has not (yet) fully setup this users account, contact administation");
        }

        const body = await get_body<{ id: string }>(req);

        const data = await proxy_manager.make_remote_request<{ message: string, success: boolean, data: any }>(
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

    public static async lists_manga_create(req: Bun.BunRequest<"/lists/manga/create">) {
        const result = await account_manager.get_user_from_token(req.headers.get("Authorization"));
        if (!result) {
            return new response_builder(400)
                .set_message("error: token was invalid");
        }

        const server_instace = result.servers.find(server => server.server == "yuno");
        if (!server_instace) {
            return new response_builder(500)
                .set_message("error: server has not (yet) fully setup this users account, contact administation");
        }

        const body = await get_body<{ name: string, current: string, state: number }>(req);

        const data = await proxy_manager.make_remote_request<{ message: string, success: boolean, data: { id: string } }>(
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

    public static async version(_: Bun.BunRequest<"/version">) {
        const data_yuno = await proxy_manager.make_remote_request<{ message: string, success: boolean, data: { version: string } }>(
            "GET", "yuno", "/");

        const data_toga = await proxy_manager.make_remote_request<{ message: string, success: boolean, data: { version: string } }>(
            "GET", "toga", "/");

        return new response_builder()
            .set_payload({
                ui: "2.1.0",
                api: "0.0.1",
                proxy: {
                    "yuno": data_yuno?.data?.version || "0.0.0",
                    "toga": data_toga?.data?.version || "0.0.0",
                }
            });
    }

    public static async all_shows(req: Bun.BunRequest<"/shows">) {
        const result = await account_manager.get_user_from_token(req.headers.get("Authorization"));
        if (!result) {
            return new response_builder(400)
                .set_message("error: token was invalid");
        }

        const data = await proxy_manager.make_remote_request<{ message: string, success: boolean, data: { [key: string]: video_meta_entry_t } }>("GET", "toga", "/meta");
        
        if (!data) {
            return new response_builder(500)
                .set_message("error: remote server not found or unreachable");
        }

        return new response_builder()
            .set_payload(data.data!);
    }

    public static async video(req: Bun.BunRequest<"/video/*">) {
        const result = await account_manager.get_user_from_token(req.headers.get("Authorization"));
        if (!result) {
            return new response_builder(400)
                .set_message("error: token was invalid");
        }

        const target_file_name = (new URL(req.url).pathname.slice("/api/video".length));

        const data = await proxy_manager.make_remote_request_raw<Response>("GET", "toga", "/video" + target_file_name);
        
        return new Response(data!.body, {
            status: data!.status,
            headers: data!.headers
        });
    }

    public static async subs(req: Bun.BunRequest<"/subs/*">) {
        const url = new URL(req.url);

        let token = req.headers.get("Authorization");
        if (!token)
            token = url.searchParams.get("t");

        const result = await account_manager.get_user_from_token(token);
        if (!result) {
            return new response_builder(400)
                .set_message("error: token was invalid");
        }

        const target_file_name = (url.pathname.slice("/api/subs".length));

        const data = await proxy_manager.make_remote_request_raw<Response>("GET", "toga", "/subs" + target_file_name);
        
        return new Response(data!.body, {
            status: data!.status,
            headers: data!.headers
        });
    }
};

router.get("/*", api_controller.fallback);
router.get("/services/list", api_controller.services_list);
router.post("/account/upload/pfp", api_controller.account_upload_pfp);
router.post("/account/register", api_controller.account_register);
router.post("/account/check/token", api_controller.account_check_token);
router.get("/account/public/me", api_controller.account_public_me);
router.post("/account/login", api_controller.account_login);
router.get("/lists", api_controller.lists);
router.post("/lists/anime", api_controller.lists_anime);
router.post("/lists/anime/create", api_controller.lists_anime_create);
router.delete("/lists/anime", api_controller.lists_anime_delete);
router.post("/lists/manga", api_controller.lists_manga);
router.post("/lists/manga/create", api_controller.lists_manga_create);
router.delete("/lists/manga", api_controller.lists_manga_delete);
router.get("/version", api_controller.version);
router.get("/video/*", api_controller.video);
router.get("/subs/*", api_controller.subs);
router.get("/shows", api_controller.all_shows);