import { useState, type FC } from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { MAX_TAGS, normalizeTags, validateTags } from '../../utils/validation';

type Props = {
  value: string[];
  onChange: (tags: string[]) => void;
  /** Existing tags to offer while typing. */
  suggestions?: string[];
  /** An error from outside, e.g. the API; shown instead of the hint. */
  error?: string;
  label?: string;
  disabled?: boolean;
  autoFocus?: boolean;
};

/**
 * Edits a list of tags as chips: type a tag and press Enter (or pick a suggestion).
 * Tags are lowercased and de-duplicated like the API does; invalid tags and more
 * than MAX_TAGS are refused with a message.
 */
const TagInput: FC<Props> = ({
  value,
  onChange,
  suggestions = [],
  error,
  label = 'Tags',
  disabled,
  autoFocus,
}) => {
  const [inputError, setInputError] = useState<string | undefined>();

  const handleChange = (next: string[]) => {
    const tags = normalizeTags(next);
    const invalid = validateTags(tags);
    setInputError(invalid);
    if (!invalid) onChange(tags);
  };

  const message = error ?? inputError;

  return (
    <Autocomplete
      multiple
      freeSolo
      autoSelect
      filterSelectedOptions
      options={suggestions}
      value={value}
      onChange={(_event, next) => handleChange(next)}
      disabled={disabled}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          autoFocus={autoFocus}
          error={!!message}
          helperText={message ?? `Press Enter to add a tag. Up to ${MAX_TAGS} tags.`}
        />
      )}
    />
  );
};

export default TagInput;
