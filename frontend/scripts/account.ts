util.check_logged_in().then(r => (!r && (window.location.href = "/login")));
util.set_version();
component.set_pfp();

element.link("btn", {
    click: async () => {
        const input = document.getElementById("file") as HTMLInputElement;
        if (!input!.files?.length) return alert("Choose a file");

        const form = new FormData();
        // 'image' must match the server's form key
        form.append("image", input.files[0]);

        const res = await fetch("http://localhost:8080/api/account/upload/pfp", {
            method: "POST",
            // DO NOT set Content-Type header; browser will add multipart boundary
            body: form,
        });

        const text = await res.text();
        console.log(text);
    }
})