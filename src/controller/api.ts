//==========================================
/// @file       api.ts
/// @brief      api routes
//==========================================

import { response_builder } from "../utils/utils";
import { BunRouter, get_body } from "../server";
import { account_manager, proxy_manager } from "../manager/manager";

export const router = new BunRouter();

class api_controller {
    public static async fallback(req: Bun.BunRequest<"/*">) {
        return new response_builder(400)
            .set_message("endpoint not found or invalid method")
            .set_payload({ method: req.method, url: req.url });
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
            return new response_builder()
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
};

router.get("/*", api_controller.fallback);
router.post("/account/check/token", api_controller.account_check_token);
router.get("/account/public/me", api_controller.account_public_me);
router.post("/account/login", api_controller.account_login);
router.get("/lists", api_controller.lists);