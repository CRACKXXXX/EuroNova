declare module "nodemailer" {
  export interface SmtpTransportOptions {
    host?: string;
    port?: number;
    secure?: boolean;
    service?: string;
    auth?: {
      user: string;
      pass: string;
    };
    tls?: {
      rejectUnauthorized?: boolean;
    };
  }

  export interface SendMailOptions {
    from?: string;
    to: string;
    subject: string;
    text?: string;
    html: string;
  }

  export interface SentMessageInfo {
    messageId?: string;
    accepted?: string[];
    rejected?: string[];
    response?: string;
  }

  export interface Transporter {
    sendMail(options: SendMailOptions): Promise<SentMessageInfo>;
    verify?(): Promise<boolean>;
  }

  export function createTransport(
    options: SmtpTransportOptions | string
  ): Transporter;
}

