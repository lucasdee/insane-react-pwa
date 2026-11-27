import type { FC } from 'react';
import { Chip } from '@mui/material';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import type { Memo } from '../../api/types';
import { authorLabel } from '../../utils/format';
import { isAuthor } from '../../utils/permissions';

type Props = {
  memo: Memo;
  /** The signed-in user's uuid. */
  currentUserUuid: string | undefined;
};

/** Who wrote a memo: "You're the author" on the user's own memos, "By …" on others'. */
const AuthorChip: FC<Props> = ({ memo, currentUserUuid }) =>
  isAuthor(memo, currentUserUuid) ? (
    <Chip
      label='You’re the author'
      size='small'
      color='primary'
      icon={<PersonOutlinedIcon />}
      sx={{ maxWidth: '100%' }}
    />
  ) : (
    <Chip
      label={`By ${authorLabel(memo)}`}
      size='small'
      variant='outlined'
      sx={{ maxWidth: '100%' }}
    />
  );

export default AuthorChip;
