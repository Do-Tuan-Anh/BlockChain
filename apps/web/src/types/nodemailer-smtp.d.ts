// The patched SMTP implementation uses the same transport API as Nodemailer's types.
declare module 'nodemailer-smtp' {
  import nodemailer = require('nodemailer');
  export = nodemailer;
}
