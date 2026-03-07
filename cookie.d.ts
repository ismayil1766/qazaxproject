// Minimal typings for `cookie` package for production builds (Railway omits dev @types)
declare module "cookie" {
  export interface CookieParseOptions {
    decode?: (value: string) => string;
  }

  export interface CookieSerializeOptions {
    domain?: string;
    encode?: (value: string) => string;
    expires?: Date;
    httpOnly?: boolean;
    maxAge?: number;
    path?: string;
    priority?: "low" | "medium" | "high";
    sameSite?: true | false | "lax" | "strict" | "none";
    secure?: boolean;
  }

  export function parse(str: string, options?: CookieParseOptions): Record<string, string>;
  export function serialize(name: string, val: string, options?: CookieSerializeOptions): string;
}
