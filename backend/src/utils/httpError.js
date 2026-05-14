/**
 * Throwable error that the central errorHandler will turn into
 * a JSON response with the right HTTP status code.
 */
export function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  err.publicMessage = message;
  return err;
}
