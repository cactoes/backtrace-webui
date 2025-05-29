#!/usr/bin/env node

import { generic_controller, api_controller, file_controller } from "./controller/controller";
import { account_manager } from "./manager/manager";
import { BunServer } from "./server";

function UNUSED_PARAMS(...args: any[]): void { args; }

function main(argc: number, argv: string[]): number {
    UNUSED_PARAMS(argc, argv);

    account_manager.JWTManager.get_instance().set_secret(process.env.JWT_SECRET!);

    const server = new BunServer(process.env.PORT, true);

    server.add_router("", generic_controller.router);
    server.add_router("/api", api_controller.router);
    server.add_router("/files", file_controller.router);

    server.start();

    return 0;
}


main(process.argv.length, process.argv);