// Client-side checks that mirror the API's validation rules, so most mistakes are
// caught before a request. The API still validates everything; its 422 messages
// are shown the same way (see fieldErrors in api/errors.ts).

/** Field name to message, for the invalid fields only. */
export type FieldErrors<K extends string = string> = Partial<Record<K, string>>;

/** bcrypt, which the API hashes passwords with, only uses the first 72 bytes. */
export const MAX_PASSWORD_BYTES = 72;

/** The API's email pattern. */
const EMAIL_PATTERN = /^(.+)@(.+)\.(.+)$/;

const byteLength = (value: string) => new TextEncoder().encode(value).length;

export const validateUsername = (username: string): string | undefined => {
  if (username.length < 3) return 'Please provide a username that is at least 3 characters long';
  if (username.length > 64) return 'Please provide a username that is at most 64 characters long';
};

export const validatePassword = (password: string): string | undefined => {
  if (password.length < 6) return 'Please provide a password that is at least 6 characters long';
  if (password.length > 72) return 'Please provide a password that is at most 72 characters long';
  if (byteLength(password) > MAX_PASSWORD_BYTES) {
    return 'Please provide a shorter password. It can be at most 72 bytes, and characters such as accented letters or emoji take more than one byte';
  }
};

export const validateEmail = (email: string): string | undefined => {
  if (!EMAIL_PATTERN.test(email)) return 'Please provide a valid email address';
  if (email.length > 128) {
    return 'Please provide an email address that is at most 128 characters long';
  }
};

export const validateDisplayName = (displayName: string): string | undefined => {
  if (displayName.length > 64) {
    return 'Please provide a display name that is at most 64 characters long';
  }
};

/** Drops the fields without an error. */
const compact = <K extends string>(errors: Record<K, string | undefined>): FieldErrors<K> =>
  Object.fromEntries(Object.entries(errors).filter(([, message]) => message)) as FieldErrors<K>;

export const hasErrors = (errors: object) => Object.keys(errors).length > 0;

export type LoginValues = { username: string; password: string };

/** Login only needs both fields filled in; the API decides whether they are right. */
export const validateLogin = ({ username, password }: LoginValues) =>
  compact<keyof LoginValues>({
    username: username ? undefined : 'Please enter your username',
    password: password ? undefined : 'Please enter your password',
  });

export type RegisterValues = {
  username: string;
  email: string;
  displayName: string;
  password: string;
  confirmPassword: string;
};

export const validateRegister = (values: RegisterValues) =>
  compact<keyof RegisterValues>({
    username: validateUsername(values.username),
    email: validateEmail(values.email),
    displayName: validateDisplayName(values.displayName),
    password: validatePassword(values.password),
    confirmPassword:
      values.confirmPassword === values.password ? undefined : 'The passwords do not match',
  });
