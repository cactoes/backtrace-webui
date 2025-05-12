//==========================================
/// @file       file.ts
/// @brief      file api routes
//==========================================

import { data_manager } from "../manager/manager";
import { BunRouter, resolve_web_file } from "../server";
import { response_builder } from "../utils/utils";

export const router = new BunRouter();

class file_controller {
    public static async pfp(req: Bun.BunRequest<"/pfp/:uuid">) {
        const pfp_data = await data_manager.get_pfp(parseInt(req.params.uuid));

        if (!pfp_data)
            return new response_builder(404);

        return new Response(pfp_data);
    }

    public static async file(req: Bun.BunRequest<"/:fullname">) {
        const file_data = await resolve_web_file(req.params.fullname);

        if (!file_data)
            return new Response("file not found or filetype not supported", { status: 404 });

        return new Response(file_data[0], { headers: { ...file_data[1] } });
    }
};

router.get("/:fullname", file_controller.file);
router.get("/pfp/:uuid", file_controller.pfp);