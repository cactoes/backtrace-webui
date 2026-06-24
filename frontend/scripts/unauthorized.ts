const TIMEOUT_DURATION: number = 5000;
const TIMER_INTERVAL: number = 1000;

function handle_timer_complete(): void {
    window.location.href = "/";
}

// @ts-ignore
async function main(): Promise<void> {
    let timeout_counter_max: number = TIMEOUT_DURATION / TIMER_INTERVAL;

    element.get("timer").innerHTML = `${timeout_counter_max}`;

    const timer = setInterval(() => {
        if (--timeout_counter_max <= 0) {
            clearInterval(timer);
            handle_timer_complete();
        }

        element.get("timer").innerHTML = `${timeout_counter_max}`;
    }, TIMER_INTERVAL);
}

window.addEventListener("DOMContentLoaded", main);