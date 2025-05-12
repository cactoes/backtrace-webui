//==========================================
/// @file       optional.ts
/// @brief      optional class there could be a value present
///             but its not certain
//==========================================

import assert from "assert";

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