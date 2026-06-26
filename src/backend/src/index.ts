#!/usr/bin/env bun
import apicontroller from "./controller/apicontroller";
import filecontroller from "./controller/filecontroller";
import webcontroller from "./controller/webcontroller";

import { JWTManager } from "./manager/account_manager";
import { bun_server } from "./server";

const port: string = process.env.PORT!;
const use_certs: boolean = process.env.IS_PRODUCTION === "true";
const api = new bun_server(port, use_certs);

JWTManager.get_instance().set_secret(process.env.JWT_SECRET!);

api.add_router("/", new webcontroller().create_bindings());
api.add_router("/files", new filecontroller().create_bindings());
api.add_router("/api", new apicontroller().create_bindings());

api.start(() => {
    console.log(`webserver/backtrace-webui is running on http://localhost:${port}/`);
});