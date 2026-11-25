export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = 'ERROR',
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new HttpError(400, message, 'BAD_REQUEST', details);

export const unauthorized = (message = 'برای این عملیات باید وارد شوید') =>
  new HttpError(401, message, 'UNAUTHORIZED');

export const forbidden = (message = 'به این بخش دسترسی ندارید') =>
  new HttpError(403, message, 'FORBIDDEN');

export const notFound = (message = 'موردی یافت نشد') => new HttpError(404, message, 'NOT_FOUND');

export const conflict = (message: string) => new HttpError(409, message, 'CONFLICT');

export const tooMany = (message = 'تعداد درخواست‌ها بیش از حد مجاز است') =>
  new HttpError(429, message, 'TOO_MANY_REQUESTS');

export const serverError = (message = 'خطای داخلی سرور') => new HttpError(500, message, 'INTERNAL');
