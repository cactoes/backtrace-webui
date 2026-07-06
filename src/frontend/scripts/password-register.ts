import { element, util } from "./global.js";

util.check_logged_in().then(r => (!r && (window.location.href = "/login")));

let login_mode = false;

const has_account_result = await util.make_api_call<{ status: "SETUP_COMPLETE" | "TO_BE_SETUP" }>("GET", "/password/account/check");
if (has_account_result!.payload!.status == "SETUP_COMPLETE") {
    login_mode = sessionStorage.getItem("master-key") == null;

    if (!login_mode)
        window.location.href = "/passwords";

    document.querySelector(".form>h2")!.innerHTML = "Password manager login";
}

async function submit_callback() {
    const password_input = element.get<HTMLInputElement>("input#password");

    if (!password_input.value)
        element.get<HTMLInputElement>("input#password").classList.add("error");

    if (!password_input.value)
        return;

    password_input.classList.remove("error");

    if (!login_mode) {
        const result = await util.make_api_call<{ token: string }>("POST", "/password/account/create", { password: password_input.value });
    
        if (!result || result.error) {
            element.get<HTMLInputElement>("input#password").classList.add("error");
            return;
        }
    
        sessionStorage.setItem("master-key", password_input.value);
        window.location.href = "/passwords";
    } else {
        sessionStorage.setItem("master-key", password_input.value);
        window.location.href = "/passwords";
    }
}

function remove_error(event: Event) {
    (event.target as HTMLInputElement).classList.remove("error")
}

element.link("input#password", { input: remove_error });
element.link("button#submit", { click: submit_callback });