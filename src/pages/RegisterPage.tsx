import { useState, type FC, type FormEvent } from 'react';
import { Link as RouterLink } from 'react-router';
import { Alert, Button, Link, Stack, TextField, Typography } from '@mui/material';
import CenteredCard from '../components/CenteredCard';
import { useAuth } from '../auth/useAuth';
import { errorMessage, fieldErrors, hasStatus } from '../api/errors';
import {
  hasErrors,
  validateRegister,
  type FieldErrors,
  type RegisterValues,
} from '../utils/validation';

const EMPTY: RegisterValues = {
  username: '',
  email: '',
  displayName: '',
  password: '',
  confirmPassword: '',
};

/**
 * Maps an error from the API to field messages. The API checks the username before
 * saving, so any other 409 means the email address is already registered.
 */
const errorsFrom = (error: unknown): FieldErrors => {
  if (hasStatus(error, 409)) {
    return /username/i.test(error.message)
      ? { username: 'This username is already taken' }
      : { email: 'An account with this email address already exists' };
  }
  return fieldErrors(error);
};

/** Creates the account and signs in; PublicOnly then shows the profile. */
const RegisterPage: FC = () => {
  const { register } = useAuth();
  const [values, setValues] = useState<RegisterValues>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const change = (field: keyof RegisterValues) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const invalid = validateRegister(values);
    setErrors(invalid);
    setFormError(null);
    if (hasErrors(invalid)) return;

    setSubmitting(true);
    try {
      await register({
        username: values.username,
        email: values.email,
        password: values.password,
        displayName: values.displayName.trim() || undefined,
      });
    } catch (error) {
      const invalidFields = errorsFrom(error);
      setErrors(invalidFields);
      if (!hasErrors(invalidFields)) setFormError(errorMessage(error));
      setSubmitting(false);
    }
  };

  const field = (name: keyof RegisterValues) => ({
    value: values[name],
    onChange: change(name),
    error: !!errors[name],
    helperText: errors[name],
  });

  return (
    <CenteredCard title='Register'>
      <Stack component='form' spacing={2} noValidate onSubmit={submit}>
        {formError && <Alert severity='error'>{formError}</Alert>}
        <TextField label='Username' autoComplete='username' autoFocus {...field('username')} />
        <TextField label='Email' type='email' autoComplete='email' {...field('email')} />
        <TextField label='Display name (optional)' autoComplete='name' {...field('displayName')} />
        <TextField
          label='Password'
          type='password'
          autoComplete='new-password'
          {...field('password')}
        />
        <TextField
          label='Confirm password'
          type='password'
          autoComplete='new-password'
          {...field('confirmPassword')}
        />
        <Button type='submit' variant='contained' size='large' loading={submitting}>
          Create account
        </Button>
        <Typography variant='body2'>
          Already registered?{' '}
          <Link component={RouterLink} to='/login'>
            Log in
          </Link>
        </Typography>
      </Stack>
    </CenteredCard>
  );
};

export default RegisterPage;
