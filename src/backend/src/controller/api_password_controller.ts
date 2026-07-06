import { BunRouter, get_body } from "@backend/server";
import AbstractController from "./abstract_controller";
import { response_builder } from "@backend/response_builder";
import { check_permissions, get_user_from_token, permissions_t } from "@backend/manager/account_manager";
import { make_remote_request } from "@backend/manager/proxy_manager";
import { get_file_with_lock, save_file_and_unlock } from "@backend/manager/data_manager";

export default class PasswordController implements AbstractController {
    constructor() {}

    private async password_account_check(req: Bun.BunRequest<"/account/check">) {
        const result = await get_user_from_token(req.headers.get("cookie")?.slice("token=".length) || "");
        if (!result) {
            return new response_builder(401)
                .set_message("error: token was invalid");
        }

        if (!check_permissions(result.permissions, permissions_t.PASSWORD_MANAGER)) {
            return new response_builder(401)
                .set_message("error: unauthorized");
        }

        const server_instace = result.servers.find(server => server.server == "starguardian");
        if (!server_instace) {
            return new response_builder(200)
                .set_message("this user account has not been setup")
                .set_payload({ status: "TO_BE_SETUP" });
        }

        return new response_builder(200)
            .set_message("this user account has been setup")
            .set_payload({ status: "SETUP_COMPLETE" });
    }

    private async password_account_create(req: Bun.BunRequest<"/account/create">) {
        const result = await get_user_from_token(req.headers.get("cookie")?.slice("token=".length) || "");
        if (!result) {
            return new response_builder(401)
                .set_message("error: token was invalid");
        }

        if (!check_permissions(result.permissions, permissions_t.PASSWORD_MANAGER)) {
            return new response_builder(401)
                .set_message("error: unauthorized");
        }

        const server_instace = result.servers.find(server => server.server == "starguardian");
        if (server_instace) {
            return new response_builder(400)
                .set_message("this user account has already been setup");
        }

        const body = await get_body<{ password: string }>(req);

        if (!body || !body.password) {
            return new response_builder(400)
                .set_message("error: missing password field");
        }

        const [ users, release_users ] = await get_file_with_lock<user_t[]>("users");

        const user_account = users.find(u => u.uuid == result.uuid);

        if (!user_account) {
            release_users();
            return new response_builder(500)
                .set_message("error: user not found");
        }

        const data = await make_remote_request<{ message: string, success: boolean, data: { instance: string } }>(
            "POST", "starguardian", "/instance/create", {
                password: body.password
            }
        );

        if (!data || data.success == false) {
            return new response_builder(500)
                .set_message("error: remote server not found or unreachable");
        }

        user_account.servers.push({
            "server": "starguardian",
            "id": data.data!.instance
        })

        save_file_and_unlock("users", release_users, users);

        return new response_builder(200)
            .set_message("created account");
    }

    private async password_get_all(req: Bun.BunRequest<"/get-all">) {
        const result = await get_user_from_token(req.headers.get("cookie")?.slice("token=".length) || "");
        if (!result) {
            return new response_builder(401)
                .set_message("error: token was invalid");
        }

        if (!check_permissions(result.permissions, permissions_t.PASSWORD_MANAGER)) {
            return new response_builder(401)
                .set_message("error: unauthorized");
        }

        const server_instace = result.servers.find(server => server.server == "starguardian");
        if (!server_instace) {
            return new response_builder(400)
                .set_message("this user account has not been setup");
        }

        const body = await get_body<{ password: string }>(req);

        if (!body || !body.password) {
            return new response_builder(400)
                .set_message("error: missing password field");
        }

        const data = await make_remote_request<{ message: string, success: boolean, data: any }>(
            "POST", server_instace.server, "/instance/get", {
                instance: server_instace.id,
                password: body.password,
                keys: []
            }
        );

        if (!data) {
            return new response_builder(500)
                .set_message("error: remote server not found or unreachable");
        }

        return new response_builder(data.success == true ? 200 : 400)
            .set_payload(data);
    }

    private async password_entry_add(req: Bun.BunRequest<"/entry/add">) {
        const result = await get_user_from_token(req.headers.get("cookie")?.slice("token=".length) || "");
        if (!result) {
            return new response_builder(401)
                .set_message("error: token was invalid");
        }

        if (!check_permissions(result.permissions, permissions_t.PASSWORD_MANAGER)) {
            return new response_builder(401)
                .set_message("error: unauthorized");
        }

        const server_instace = result.servers.find(server => server.server == "starguardian");
        if (!server_instace) {
            return new response_builder(400)
                .set_message("this user account has not been setup");
        }

        const body = await get_body<{ password: string, name: string, fields: { value: string, name: string }[] }>(req);

        if (!body || !body.password || !body.name) {
            return new response_builder(400)
                .set_message("error: missing password field");
        }

        const data = await make_remote_request<{ message: string, success: boolean, data: any }>(
            "POST", server_instace.server, "/entry/add", {
                instance: server_instace.id,
                password: body.password,
                name: body.name,
                fields: body.fields
            }
        );

        if (!data) {
            return new response_builder(500)
                .set_message("error: remote server not found or unreachable");
        }

        return new response_builder(data.success == true ? 200 : 400)
            .set_payload(data);
    }

    private async password_entry_edit(req: Bun.BunRequest<"/entry/edit">) {
        const result = await get_user_from_token(req.headers.get("cookie")?.slice("token=".length) || "");
        if (!result) {
            return new response_builder(401)
                .set_message("error: token was invalid");
        }

        if (!check_permissions(result.permissions, permissions_t.PASSWORD_MANAGER)) {
            return new response_builder(401)
                .set_message("error: unauthorized");
        }

        const server_instace = result.servers.find(server => server.server == "starguardian");
        if (!server_instace) {
            return new response_builder(400)
                .set_message("this user account has not been setup");
        }

        const body = await get_body<{ password: string, name: string, id: string }>(req);

        if (!body || !body.password || !body.name || !body.id) {
            return new response_builder(400)
                .set_message("error: missing password field");
        }

        const data = await make_remote_request<{ message: string, success: boolean, data: any }>(
            "POST", server_instace.server, "/entry/edit", {
                instance: server_instace.id,
                password: body.password,
                name: body.name,
                id: body.id
            }
        );

        if (!data) {
            return new response_builder(500)
                .set_message("error: remote server not found or unreachable");
        }

        return new response_builder(data.success == true ? 200 : 400)
            .set_payload(data);
    }

    private async password_entry_delete(req: Bun.BunRequest<"/entry/delete">) {
        const result = await get_user_from_token(req.headers.get("cookie")?.slice("token=".length) || "");
        if (!result) {
            return new response_builder(401)
                .set_message("error: token was invalid");
        }

        if (!check_permissions(result.permissions, permissions_t.PASSWORD_MANAGER)) {
            return new response_builder(401)
                .set_message("error: unauthorized");
        }

        const server_instace = result.servers.find(server => server.server == "starguardian");
        if (!server_instace) {
            return new response_builder(400)
                .set_message("this user account has not been setup");
        }

        const body = await get_body<{ password: string, id: string }>(req);

        if (!body || !body.password || !body.id) {
            return new response_builder(400)
                .set_message("error: missing password field");
        }

        const data = await make_remote_request<{ message: string, success: boolean, data: any }>(
            "DELETE", server_instace.server, "/entry/delete", {
                instance: server_instace.id,
                password: body.password,
                id: body.id
            }
        );

        if (!data) {
            return new response_builder(500)
                .set_message("error: remote server not found or unreachable");
        }

        return new response_builder(data.success == true ? 200 : 400)
            .set_payload(data);
    }

    private async password_field_edit(req: Bun.BunRequest<"/entry/field/edit">) {
        const result = await get_user_from_token(req.headers.get("cookie")?.slice("token=".length) || "");
        if (!result) {
            return new response_builder(401)
                .set_message("error: token was invalid");
        }

        if (!check_permissions(result.permissions, permissions_t.PASSWORD_MANAGER)) {
            return new response_builder(401)
                .set_message("error: unauthorized");
        }

        const server_instace = result.servers.find(server => server.server == "starguardian");
        if (!server_instace) {
            return new response_builder(400)
                .set_message("this user account has not been setup");
        }

        const body = await get_body<{ password: string, id: string, field: { name: string, value: string } }>(req);

        if (!body || !body.password || !body.id || !body.field) {
            return new response_builder(400)
                .set_message("error: missing password field");
        }

        const data = await make_remote_request<{ message: string, success: boolean, data: any }>(
            "POST", server_instace.server, "/entry/field/edit", {
                instance: server_instace.id,
                password: body.password,
                id: body.id,
                field: body.field
            }
        );

        if (!data) {
            return new response_builder(500)
                .set_message("error: remote server not found or unreachable");
        }

        return new response_builder(data.success == true ? 200 : 400)
            .set_payload(data);
    }

    private async password_field_delete(req: Bun.BunRequest<"/entry/field/delete">) {
        const result = await get_user_from_token(req.headers.get("cookie")?.slice("token=".length) || "");
        if (!result) {
            return new response_builder(401)
                .set_message("error: token was invalid");
        }

        if (!check_permissions(result.permissions, permissions_t.PASSWORD_MANAGER)) {
            return new response_builder(401)
                .set_message("error: unauthorized");
        }

        const server_instace = result.servers.find(server => server.server == "starguardian");
        if (!server_instace) {
            return new response_builder(400)
                .set_message("this user account has not been setup");
        }

        const body = await get_body<{ password: string, id: string, name: string }>(req);

        if (!body || !body.password || !body.id || !body.name) {
            return new response_builder(400)
                .set_message("error: missing password field");
        }

        const data = await make_remote_request<{ message: string, success: boolean, data: any }>(
            "DELETE", server_instace.server, "/entry/field/delete", {
                instance: server_instace.id,
                password: body.password,
                id: body.id,
                name: body.name
            }
        );

        if (!data) {
            return new response_builder(500)
                .set_message("error: remote server not found or unreachable");
        }

        return new response_builder(data.success == true ? 200 : 400)
            .set_payload(data);
    }

    public create_router(): BunRouter {
        const router = new BunRouter();
        router.get("/account/check", this.password_account_check.bind(this));
        router.post("/account/create", this.password_account_create.bind(this));
        router.post("/get-all", this.password_get_all.bind(this));
        router.post("/entry/add", this.password_entry_add.bind(this));
        router.post("/entry/edit", this.password_entry_edit.bind(this));
        router.delete("/entry/delete", this.password_entry_delete.bind(this));
        router.post("/entry/field/edit", this.password_field_edit.bind(this));
        router.delete("/entry/field/delete", this.password_field_delete.bind(this));
        return router;
    }
}