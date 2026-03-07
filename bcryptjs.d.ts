declare module "bcryptjs" {
  const bcrypt: {
    genSaltSync(rounds?: number): string;
    hashSync(data: string, salt: string | number): string;
    compareSync(data: string, encrypted: string): boolean;
    genSalt(rounds?: number): Promise<string>;
    hash(data: string, salt: string | number): Promise<string>;
    compare(data: string, encrypted: string): Promise<boolean>;
  };
  export default bcrypt;
}
