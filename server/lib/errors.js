'use strict';
/** HTTP error type + async route wrapper. */
class HttpError extends Error {
  constructor(status, message, code = 'error', fields = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const badRequest = (msg, code = 'bad_request', fields = null) => new HttpError(400, msg, code, fields);

module.exports = { HttpError, asyncHandler, badRequest };
