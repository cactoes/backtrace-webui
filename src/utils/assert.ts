//==========================================
/// @file       assert.ts
/// @brief      assertion functions
//==========================================

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