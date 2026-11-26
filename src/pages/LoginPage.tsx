import { useState, type FC, type FormEvent } from 'react';
import { Link as RouterLink } from 'react-router';
import { Alert, Button, Link, Stack, TextField, Typography } from '@mui/material';
import CenteredCard from '../components/CenteredCard';
import { useAuth } from '../auth/useAuth';
import { errorMessage, fieldErrors, hasStatus } from '../api/errors';
import { hasErrors, validateLogin, type FieldErrors, type LoginValues } from '../utils/validation';

/** On success, PublicOnly takes the user where they were going, or to their profile. */
const LoginPage: FC = () => {
  const { login, signedOutBy } = useAuth();
  const [values, setValues] = useState<LoginValues>({ username: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const change = (field: keyof LoginValues) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const invalid = validateLogin(values);
    setErrors(invalid);
    setFormError(null);
    if (hasErrors(invalid)) return;

    setSubmitting(true);
    try {
      await login(values);
    } catch (error) {
      setErrors(fieldErrors(error));
      setFormError(hasStatus(error, 401) ? 'Invalid username or password.' : errorMessage(error));
      setSubmitting(false);
    }
  };

  return (
    <CenteredCard title='Log in'>
      <Stack component='form' spacing={2} noValidate onSubmit={submit}>
        {formError && <Alert severity='error'>{formError}</Alert>}
        {!formError && signedOutBy === 'expired' && (
          <Alert severity='info'>Your session has expired. Please log in again.</Alert>
        )}
        <TextField
          label='Username'
          autoComplete='username'
          autoFocus
          value={values.username}
          onChange={change('username')}
          error={!!errors.username}
          helperText={errors.username}
        />
        <TextField
          label='Password'
          type='password'
          autoComplete='current-password'
          value={values.password}
          onChange={change('password')}
          error={!!errors.password}
          helperText={errors.password}
        />
        <Button type='submit' variant='contained' size='large' loading={submitting}>
          Log in
        </Button>
        <Typography variant='body2'>
          No account yet?{' '}
          <Link component={RouterLink} to='/register'>
            Register
          </Link>
        </Typography>
      </Stack>
    </CenteredCard>
  );
};

export default LoginPage;
