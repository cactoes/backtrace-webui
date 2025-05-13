// eslint-disable-next-line
// @ts-ignore
VanillaTilt.init(document.querySelector(".background"), {
    reverse: true,
    speed: 600,
    perspective: 2000
});

util.make_interval(() => {
    const fmt_time = (value: number): string => (value < 10 ? `0${value}` : `${value}`);

    const now = new Date();

    const [ hours, minutes, seconds ] = [
        fmt_time(now.getHours()),
        fmt_time(now.getMinutes()),
        fmt_time(now.getSeconds())
    ];

    document.getElementById("clock")!.innerText =
        `${hours} : ${minutes} : ${seconds}`;
}, 1000);

function ease_inout_sine(x: number): number {
    return -(Math.cos(Math.PI * x * 2) - 1) / 2;
}

const canvas = document.getElementById("stars") as HTMLCanvasElement;
const context = canvas.getContext("2d")!;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.onresize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
};

class star {
    public current_fade_tick: number = 0;

    constructor(
        private x: number,
        private y: number,
        public max_fade_tick: number,
        private size: number,
    ) {}

    public static create(): star {
        return new star(
            Math.random() * window.innerWidth,
            Math.random() * window.innerHeight,
            Math.round(Math.random() * 3 + 4),
            Math.round(Math.random() * 2 + 1)
        );
    }

    public update(dt: number): boolean {
        this.current_fade_tick += 1 * dt;
        return this.current_fade_tick < this.max_fade_tick;
    }

    public render(): void {
        const scale = (this.max_fade_tick - this.current_fade_tick) / (this.max_fade_tick);
        context.fillStyle = `rgba(255, 255, 255, ${ease_inout_sine(scale)})`;
        context.beginPath();
        context.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
        context.fill();
    }
}

const star_array = Array.from<star>({ length: 200 }).map(st => {
    st = star.create();
    st.current_fade_tick = Math.random() * st.max_fade_tick;
    return st;
});

function render(delta_time: number) {
    context.clearRect(0, 0, canvas.width, canvas.height);

    star_array.forEach((st, i) => {
        if (!st.update(delta_time))
            star_array[i] = star.create();

        st.render();
    });

    context.fillStyle = "rgb(0, 0, 0)";
    context.beginPath();
    context.arc(canvas.width / 2, canvas.height / 2, 200, 0, 2 * Math.PI);
    context.fill();
}

util.start_canvas_render_loop(render);