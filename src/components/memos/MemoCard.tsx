import type { FC } from 'react';
import { Button, Card, CardActions, CardContent, Chip, Stack, Typography } from '@mui/material';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import type { MemoListItem } from '../../api/types';
import { canAssign, canEditTags } from '../../utils/permissions';
import { formatDate } from '../../utils/format';

type Props = {
  item: MemoListItem;
  onEditTags: (item: MemoListItem) => void;
  onAssign: (item: MemoListItem) => void;
};

/** One memo, with the actions the user's role on it allows. */
const MemoCard: FC<Props> = ({ item, onEditTags, onAssign }) => {
  const { memo, role } = item;
  const titleId = `memo-title-${memo.uuid}`;
  const showEditTags = canEditTags(role);
  const showAssign = canAssign(role);

  return (
    <Card component='article' aria-labelledby={titleId} variant='outlined'>
      <CardContent>
        <Stack direction='row' spacing={1} sx={{ justifyContent: 'space-between', mb: 0.5 }}>
          <Typography id={titleId} variant='h6' component='h2' sx={{ wordBreak: 'break-word' }}>
            {memo.title}
          </Typography>
          <Chip label={`Your role: ${role}`} size='small' sx={{ flexShrink: 0 }} />
        </Stack>
        <Typography variant='body2' color='text.secondary'>
          {formatDate(memo.createdAt)}
        </Typography>
        <Typography sx={{ mt: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {memo.content}
        </Typography>
        {memo.tags.length > 0 && (
          <Stack
            component='ul'
            aria-label='Tags'
            direction='row'
            sx={{ flexWrap: 'wrap', gap: 1, mt: 2, p: 0, listStyle: 'none' }}
          >
            {memo.tags.map((tag) => (
              <li key={tag}>
                <Chip label={tag} size='small' variant='outlined' />
              </li>
            ))}
          </Stack>
        )}
      </CardContent>
      {(showEditTags || showAssign) && (
        <CardActions sx={{ px: 2, pb: 2 }}>
          {showEditTags && (
            <Button
              size='small'
              startIcon={<LocalOfferOutlinedIcon />}
              onClick={() => onEditTags(item)}
            >
              Edit tags
            </Button>
          )}
          {showAssign && (
            <Button
              size='small'
              startIcon={<PersonAddAlt1OutlinedIcon />}
              onClick={() => onAssign(item)}
            >
              Assign
            </Button>
          )}
        </CardActions>
      )}
    </Card>
  );
};

export default MemoCard;
