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

    util.make_api_call<{ ui: string, api: any, proxy: any }>("GET", "/version").then(result => {
        element.get<HTMLDivElement>("ver").innerText = `v${result!.payload!.ui}`;
    });

    util.make_interval(() => {
        const fmt_time = (value: number): string => (value < 10 ? `0${value}` : `${value}`);

        const now = new Date();

        const [ hours, minutes, seconds ] = [
            fmt_time(now.getHours()),
            fmt_time(now.getMinutes()),
            fmt_time(now.getSeconds())
        ];

        document.getElementById("time")!.innerText =
            `${hours} : ${minutes} : ${seconds}`;
    }, 1000);
}

window.addEventListener("DOMContentLoaded", main);