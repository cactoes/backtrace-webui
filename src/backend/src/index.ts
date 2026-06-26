#!/usr/bin/env bun
import BunServer from "./server";

import ApiController from "./controller/apicontroller";
import FileController from "./controller/filecontroller";
import WebController from "./controller/webcontroller";

import { JWTManager } from "./manager/account_manager";

const port: string = process.env.PORT!;
const use_certs: boolean = process.env.IS_PRODUCTION === "true";
const api = new BunServer(port, use_certs);

JWTManager.get_instance().set_secret(process.env.JWT_SECRET!);

api.add_router("/", new WebController().create_router());
api.add_router("/files", new FileController().create_router());
api.add_router("/api", new ApiController().create_router());

api.start(() => {
    console.log(`webserver/backtrace-webui is running on http://localhost:${port}`);
});