import { get_pfp, resolve_web_file } from "@backend/manager/data_manager";
import { response_builder } from "@backend/response_builder";
import { bun_router } from "@backend/server";

export default class filecontroller {
    constructor() {}

    private async pfp(req: Bun.BunRequest<"/pfp/:uuid">) {
        const pfp_data = await get_pfp(parseInt(req.params.uuid));

        if (!pfp_data)
            return new response_builder(404);

        return new Response(pfp_data);
    }

    private async file(req: Bun.BunRequest<"/:fullname">) {
        const file_data = await resolve_web_file(req.params.fullname);

        if (!file_data)
            return new Response("file not found or filetype not supported", { status: 404 });

        return new Response(file_data[0] as BodyInit, { headers: { ...file_data[1] } });
    }

    public create_bindings(): bun_router {
        const router = new bun_router();
        router.get("/:fullname", this.file.bind(this));
        router.get("/pfp/:uuid", this.pfp.bind(this));
        return router;
    }
};