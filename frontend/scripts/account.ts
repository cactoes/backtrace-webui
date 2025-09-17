util.check_logged_in().then(r => (!r && (window.location.href = "/login")));
util.set_version();
component.set_pfp();

element.link("file", {
    change: () => {
        const file_data = element.get<HTMLInputElement>("file").files![0];
        const is_file_too_big = file_data.size > 1 * 1024 * 1014;

        if (is_file_too_big)
            element.get<HTMLParagraphElement>("fu#label").classList.add("big");
        else
            element.get<HTMLParagraphElement>("fu#label").classList.remove("big");

        element.get<HTMLParagraphElement>("file_stats").innerHTML = `${file_data.name}; ${Math.round(file_data.size / 1024)} kb; ${is_file_too_big ? "Image too large!" : ""}`;
    }
});

element.link("btn", {
    click: async () => {
        const input = document.getElementById("file") as HTMLInputElement;
        if (!input!.files?.length) return;

        const form = new FormData();
        form.append("image", input.files[0]);

        const res = await fetch("http://localhost:8080/api/account/upload/pfp", {
            method: "POST",
            body: form,
        });

        const text = await res.text();
        console.log(text);
    }
})