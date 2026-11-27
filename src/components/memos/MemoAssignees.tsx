import { useState, type FC } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import PersonRemoveOutlinedIcon from '@mui/icons-material/PersonRemoveOutlined';
import RemoveAssignmentDialog from './RemoveAssignmentDialog';
import { useAssignmentsQuery } from '../../hooks/useMemos';
import { useAuth } from '../../auth/useAuth';
import { errorMessage } from '../../api/errors';
import { canRemoveAssignment } from '../../utils/permissions';
import { formatDate, userLabel } from '../../utils/format';
import type { Memo, MemoAssignment, MemoListItem } from '../../api/types';

type Props = {
  /** The memo, with the signed-in user's role on it. */
  item: MemoListItem;
  /** Called after the signed-in user left the memo; they no longer have access to it. */
  onLeft: (memo: Memo) => void;
};

const assigneeLabel = (a: MemoAssignment) =>
  userLabel({ uuid: a.userUuid, username: a.username, displayName: a.displayName });

const assignerLabel = (a: MemoAssignment) =>
  userLabel({
    uuid: a.assignedByUuid,
    username: a.assignedByUsername,
    displayName: a.assignedByDisplayName,
  });

/**
 * Who a memo is shared with: each assignee with their role, who assigned them and when.
 * Offers Remove on the assignments the user's role allows, and Leave on their own.
 */
const MemoAssignees: FC<Props> = ({ item, onLeft }) => {
  const { memo, role } = item;
  const { user } = useAuth();
  const { data, isPending, isError, error, refetch, isRefetching } = useAssignmentsQuery(memo.uuid);
  const [removing, setRemoving] = useState<MemoAssignment | null>(null);
  const [notice, setNotice] = useState<string | undefined>();
  const leaving = removing !== null && removing.userUuid === user?.uuid;

  const assignedText = (a: MemoAssignment) => {
    const by = a.assignedByUuid === user?.uuid ? 'you' : assignerLabel(a);
    return `Assigned by ${by} on ${formatDate(a.assignedAt)}`;
  };

  return (
    <Box component='section' aria-labelledby='memo-assignees-title'>
      <Typography id='memo-assignees-title' variant='h6' component='h2' gutterBottom>
        Shared with
      </Typography>

      {notice && (
        <Alert severity='success' onClose={() => setNotice(undefined)} sx={{ mb: 2 }}>
          {notice}
        </Alert>
      )}

      {isPending && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={28} aria-label='Loading assignees' />
        </Box>
      )}

      {isError && (
        <Alert
          severity='error'
          action={
            <Button color='inherit' size='small' onClick={() => refetch()} loading={isRefetching}>
              Retry
            </Button>
          }
        >
          Could not load who the memo is shared with. {errorMessage(error)}
        </Alert>
      )}

      {data && (
        <List aria-label='Assignees' disablePadding>
          {data.map((a) => {
            const label = assigneeLabel(a);
            const self = a.userUuid === user?.uuid;
            const author = a.userUuid === memo.authorUuid;
            const removable = canRemoveAssignment({
              assignment: a,
              memo,
              userUuid: user?.uuid,
              role,
            });
            return (
              <ListItem
                key={a.userUuid}
                divider
                sx={{ px: 0, gap: 1 }}
                secondaryAction={
                  removable &&
                  (self ? (
                    <Button size='small' color='error' onClick={() => setRemoving(a)}>
                      Leave
                    </Button>
                  ) : (
                    <Tooltip title='Remove'>
                      <IconButton
                        edge='end'
                        color='error'
                        aria-label={`Remove ${label}`}
                        onClick={() => setRemoving(a)}
                      >
                        <PersonRemoveOutlinedIcon />
                      </IconButton>
                    </Tooltip>
                  ))
                }
              >
                <ListItemText
                  primary={
                    <Stack
                      direction='row'
                      component='span'
                      sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}
                    >
                      <span>{label}</span>
                      <Chip label={a.role} size='small' />
                      {author && <Chip label='Author' size='small' color='primary' />}
                      {self && <Chip label='You' size='small' variant='outlined' />}
                    </Stack>
                  }
                  secondary={author ? undefined : assignedText(a)}
                  sx={{ pr: removable ? 8 : 0, wordBreak: 'break-word' }}
                />
              </ListItem>
            );
          })}
        </List>
      )}

      <RemoveAssignmentDialog
        memo={memo}
        assignment={removing}
        leaving={leaving}
        onClose={() => setRemoving(null)}
        onRemoved={(removed) => {
          setRemoving(null);
          if (removed.userUuid === user?.uuid) {
            onLeft(memo);
          } else {
            setNotice(`Removed ${assigneeLabel(removed)}`);
          }
        }}
      />
    </Box>
  );
};

export default MemoAssignees;
