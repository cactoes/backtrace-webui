function format_time(date: Date) {
    const dt_ms = Date.now() - date.getTime();
    const dt_days = Math.floor(dt_ms / (1000 * 60 * 60 * 24));

    return dt_days == 0
        ? "today"
        : dt_days == 1
        ? "1 day ago"
        : `${dt_days} days ago`;
}

async function get_repo(project: string) {
    const res = await fetch(`https://api.github.com/repos/cactoes/${project}`);
    if (!res.ok)
        return undefined;

    return res.json();
}

function setup_card(card: Element) {
    const project = card.getAttribute("project");
    if (!project)
        return;

    card.addEventListener("click", () => {
        window.open(`https://github.com/cactoes/${project}`, "_blank");
    });

    const target_element = card.querySelector(".card-footer>.updated");

    get_repo(project).then(data => {
        if (!data) {
            if (target_element)
                target_element.textContent = "? days ago";

            return;
        }

        const date = new Date(data.updated_at);
        const label = format_time(date);

        if (target_element)
            target_element.textContent = label;
    });
}

// @ts-ignore
async function main(): Promise<void> {
    util.check_logged_in().then(is_logged_in => {
        const login_button = document.getElementById("login");
        const home_button = document.getElementById("home");
        if (is_logged_in) {
            if (login_button)
                login_button.style.display = "none";
            
        } else {
            login_button?.addEventListener("click", () => window.location.href = "/login");
            if (home_button)
                home_button.style.display = "none";
        }
    });

    component.set_version();
    component.set_clock();

    document
        .querySelectorAll("section>span")
        .forEach(setup_card);
}

window.addEventListener("DOMContentLoaded", main);