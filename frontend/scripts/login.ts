async function submit_callback() {
    const username_input = element.get<HTMLInputElement>("input#username");
    const password_input = element.get<HTMLInputElement>("input#password");

    if (!username_input.value)
        element.get<HTMLInputElement>("input#username").classList.add("error");
    
    if (!password_input.value)
        element.get<HTMLInputElement>("input#password").classList.add("error");

    if (!username_input.value || !password_input.value)
        return;

    username_input.classList.remove("error");
    password_input.classList.remove("error");

    const result = await util.make_api_call<{ token: string }>("POST", "/account/login", { username: username_input.value, password: await util.sha256(password_input.value) });
    
    if (!result || result.error) {
        element.get<HTMLInputElement>("input#username").classList.add("error");
        element.get<HTMLInputElement>("input#password").classList.add("error");
        return;
    }

    jwt.set(result.payload!.token);

    window.location.href = "/home";
}

function remove_error(event: Event) {
    (event.target as HTMLInputElement).classList.remove("error")
}

element.link("input#username", { input: remove_error });
element.link("input#password", { input: remove_error });
element.link("button#submit", { click: submit_callback });