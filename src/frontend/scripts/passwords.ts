import { component, util } from "./global.js";

util.check_logged_in().then(r => (!r && (window.location.href = "/login")));
util.set_version();
component.set_pfp();