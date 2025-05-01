// asserts a runtime condition if it fails it exists the program
export function assert(condition: boolean, message: string): asserts condition {
    if (!condition) {
        console.assert(condition, message);
        console.trace(condition);
        if (process.env.IS_PRODUCTION != "true")
            process.exit(1);
        else
            throw new Error("assertion failed");
    }
}

// optional class there could be a value present but its not certain
// so here we have the optional class
export class Optional<T> {
    constructor(private readonly m_value: T | undefined = undefined) {}

    public has_value(): boolean {
        return this.m_value != undefined;
    }

    public value(): T {
        assert(this.has_value(), "a value was not present");
        return this.m_value as T;
    }

    public value_or(or: T): T {
        return this.has_value() ? this.value() : or;
    }
};

// nullopt is an optional w/o a value
export const NULLOPT = new Optional<any>();