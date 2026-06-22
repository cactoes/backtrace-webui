import { util, component } from "./global.ts";

util.check_logged_in().then(r => (!r && (window.location.href = "/login")));
util.set_version();
component.set_pfp();