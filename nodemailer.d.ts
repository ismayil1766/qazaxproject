declare module "nodemailer" {
  type Transporter = any;
  type TransportOptions = any;
  function createTransport(options?: TransportOptions): Transporter;
  const nodemailer: { createTransport: typeof createTransport };
  export { createTransport };
  export default nodemailer;
}
