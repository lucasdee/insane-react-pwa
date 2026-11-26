import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { AppRoutes } from '../../App';
import { server } from '../../test/server';
import { api, mockApi, seedMemo } from '../../test/handlers';
import { renderWithProviders } from '../../test/renderWithProviders';
import type { MemoCreateRequest } from '../../api/types';

beforeEach(() => {
  mockApi.session = true;
});

const renderCreate = async () => {
  const result = renderWithProviders(<AppRoutes />, { route: '/memos/new' });
  await screen.findByRole('heading', { name: 'New memo' });
  return result;
};

type User = Awaited<ReturnType<typeof renderCreate>>['user'];

const fill = async (user: User, title: string, content: string, tags: string[] = []) => {
  if (title) await user.type(screen.getByLabelText('Title'), title);
  if (content) await user.type(screen.getByLabelText('Content'), content);
  for (const tag of tags) {
    await user.type(screen.getByRole('combobox', { name: 'Tags' }), `${tag}{Enter}`);
  }
};

const submit = (user: User) => user.click(screen.getByRole('button', { name: 'Create memo' }));

/** Records the bodies posted to /memos/create; the default handler still answers. */
const captureCreate = () => {
  const bodies: MemoCreateRequest[] = [];
  server.use(
    http.post(api('/memos/create'), async ({ request }) => {
      bodies.push((await request.clone().json()) as MemoCreateRequest);
      return undefined;
    }),
  );
  return bodies;
};

describe('CreateMemoPage', () => {
  it('checks the fields before sending anything', async () => {
    const bodies = captureCreate();
    const { user } = await renderCreate();

    await submit(user);

    expect(screen.getByText(/title that is at least 3/)).toBeInTheDocument();
    expect(screen.getByText(/content that is at least 3/)).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it('clears a field’s error once it is edited', async () => {
    const { user } = await renderCreate();
    await submit(user);

    await user.type(screen.getByLabelText('Title'), 'P');

    expect(screen.queryByText(/title that is at least 3/)).not.toBeInTheDocument();
    expect(screen.getByText(/content that is at least 3/)).toBeInTheDocument();
  });

  it('creates the memo and returns to the list with a confirmation', async () => {
    const bodies = captureCreate();
    const { user } = await renderCreate();

    await fill(user, '  Weekend plan ', 'Hike{Enter}Read  ', ['Outdoors', 'fun']);
    await submit(user);

    expect(await screen.findByText('Created “Weekend plan”')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/memos$/);
    expect(await screen.findByRole('article', { name: 'Weekend plan' })).toBeInTheDocument();
    expect(bodies).toEqual([
      { title: 'Weekend plan', content: 'Hike\nRead', tags: ['outdoors', 'fun'] },
    ]);
  });

  it('suggests tags the user already uses', async () => {
    seedMemo({ tags: ['work'] });
    const { user } = await renderCreate();

    await user.click(screen.getByRole('combobox', { name: 'Tags' }));

    expect(await screen.findByRole('option', { name: 'work' })).toBeInTheDocument();
  });

  it('shows field errors from the API, including invalid tags', async () => {
    server.use(
      http.post(api('/memos/create'), () =>
        HttpResponse.json(
          {
            message: 'Validation failed',
            details: {
              'body.title': { message: 'Title from API' },
              'body.tags.$1': { message: 'Tag from API' },
            },
          },
          { status: 422 },
        ),
      ),
    );
    const { user } = await renderCreate();

    await fill(user, 'Plan', 'Things');
    await submit(user);

    expect(await screen.findByText('Title from API')).toBeInTheDocument();
    expect(screen.getByText('Tag from API')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows other errors above the form', async () => {
    server.use(http.post(api('/memos/create'), () => HttpResponse.error()));
    const { user } = await renderCreate();

    await fill(user, 'Plan', 'Things');
    await submit(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server');
    expect(screen.getByTestId('location')).toHaveTextContent('/memos/new');
  });

  it('goes back to the list on Cancel', async () => {
    const { user } = await renderCreate();

    await user.click(screen.getByRole('link', { name: 'Cancel' }));

    expect(await screen.findByRole('heading', { name: 'My memos' })).toBeInTheDocument();
  });
});
