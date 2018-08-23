const nodemailer = require('nodemailer');
const _ = require('lodash');

exports.handleEmail = async (req, res, next) => {
  if (res.wrestler.email) {
    const transporter = _.get(req, 'wrestler.options.email.transporter') || nodemailer.createTransport({ sendmail: true });
    try {
      // noinspection JSUnusedLocalSymbols
      const emailInfo = await transporter.sendMail(res.wrestler.email);
      // console.log(`Email sent to ${res.wrestler.email.to}: ${emailInfo.messageId}`);
    } catch (err) {
      next(err);
    }
  }
  next();
};
