//==========================================
/// @file       response_builder.ts
/// @brief      builder for making a http response
//==========================================

/**
 * @brief       helper class for building http responses
 * @remarks     subject to change a lot based on demand
 */
export class response_builder<T extends Object | Array<any>> {
    private body = { "message": "", "error": false, payload: {} };
    private headers: { [key:string]: string } = {
        "Content-Type": "application/json",
    };

    /**
     * @brief           simple constructor that only sets the status code
     * @param status    non-required parameter for http status code
     * @remarks         if the status code is not 2xx error is set to true
     */
    constructor(private status: number = 200) {}

    /**
     * @brief   sets the payload field
     */
    public set_payload(data: T): response_builder<T> {
        this.body.payload = data;
        return this;
    }

    /**
     * @brief   sets the message field
     */
    public set_message(message: string): response_builder<T> {
        this.body.message = message;
        return this;
    }

    /**
     * @brief       sets the http status code (same as in constructor)
     * @remarks     if the status code is not 2xx error is set to true
     */
    public set_status(code: number): response_builder<T> {
        this.status = code;
        return this;
    }

    /**
     * @brief   builds the http response
     */
    public build(): Response {
        this.body.error = !(this.status >= 200 && this.status < 300);
        return new Response(JSON.stringify(this.body), {
            status: this.status,
            headers: this.headers
        });
    }
}