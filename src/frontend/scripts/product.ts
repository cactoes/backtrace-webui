import { util } from "./global.js";

function format_time(date: Date) {
    const dt_ms = Date.now() - date.getTime();
    const dt_days = Math.floor(dt_ms / (1000 * 60 * 60 * 24));

    return dt_days == 0
        ? "today"
        : dt_days == 1
        ? "1 day ago"
        : `${dt_days} days ago`;
}

async function get_latest_release(project: string) {
    const res = await fetch(`https://api.github.com/repos/cactoes/${project}/releases/latest`);
    if (!res.ok)
        return undefined;

    return res.json();
}

async function load_github_data() {
    const target_element = document.querySelector(".container>section>footer>.updated");
    if (!target_element)
        return;

    const data = await get_latest_release("delirium");
    if (!data) {
        target_element.textContent = "Latest release unknown";
        return;
    }

    const date = new Date(data.published_at);
    const label = format_time(date);

    target_element.textContent = `Latest release ${label}`;
}

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

    load_github_data();
}

window.addEventListener("DOMContentLoaded", main);