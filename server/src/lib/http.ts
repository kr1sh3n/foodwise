export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const notFound = (what = 'Resource') => new HttpError(404, `${what} not found`);
export const forbidden = (msg = 'You do not have permission to do that') => new HttpError(403, msg);
export const bad = (msg: string) => new HttpError(400, msg);
