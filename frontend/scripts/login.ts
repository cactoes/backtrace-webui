async function submit_callback() {
    const username_input = get_element<HTMLInputElement>("input#username");
    const password_input = get_element<HTMLInputElement>("input#password");

    if (!username_input.value)
        get_element<HTMLInputElement>("input#username").classList.add("error");
    
    if (!password_input.value)
        get_element<HTMLInputElement>("input#password").classList.add("error");

    if (!username_input.value || !password_input.value)
        return;

    username_input.classList.remove("error");
    password_input.classList.remove("error");

    const result = await make_api_call<{ token: string }>("POST", "/account/login", { username: username_input.value, password: await sha256(password_input.value) });
    
    if (result.error) {
        get_element<HTMLInputElement>("input#username").classList.add("error");
        get_element<HTMLInputElement>("input#password").classList.add("error");
        return;
    }

    set_jwt(result.payload!.token);

    window.location.href = "/home";
}

function remove_error(event: Event) {
    (event.target as HTMLInputElement).classList.remove("error")
}

link_component("input#username", { input: remove_error });
link_component("input#password", { input: remove_error });

link_component("button#submit", { click: submit_callback });