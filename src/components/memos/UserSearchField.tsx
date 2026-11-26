import { useState, type FC } from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { useUserSearch } from '../../hooks/useUserSearch';
import type { UserSummary } from '../../api/types';
import { userLabel } from '../../utils/format';

type Props = {
  value: UserSummary | null;
  onChange: (user: UserSummary | null) => void;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
};

/** Picks another user, searching the API by username or display name as you type. */
const UserSearchField: FC<Props> = ({ value, onChange, error, disabled, autoFocus }) => {
  const [text, setText] = useState('');
  // While a user is picked, the input shows their label: don't search for that.
  const { data = [], isFetching, search } = useUserSearch(value ? '' : text);
  const typing = !value && text.trim().length > 0;
  const loading = typing && (search !== text.trim() || isFetching);

  return (
    <Autocomplete
      value={value}
      onChange={(_event, user) => onChange(user)}
      inputValue={text}
      onInputChange={(_event, next, reason) => {
        setText(next);
        if (reason === 'input' && value) onChange(null);
      }}
      options={value ? [value] : search ? data : []}
      // The API already filtered the options.
      filterOptions={(options) => options}
      getOptionLabel={userLabel}
      isOptionEqualToValue={(option, selected) => option.uuid === selected.uuid}
      loading={loading}
      loadingText='Searching…'
      noOptionsText={typing ? 'No users found' : 'Type a username or display name'}
      disabled={disabled}
      renderInput={(params) => (
        <TextField
          {...params}
          label='User'
          autoFocus={autoFocus}
          error={!!error}
          helperText={error ?? 'Search by username or display name'}
        />
      )}
    />
  );
};

export default UserSearchField;
