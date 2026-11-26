import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TagInput from '../TagInput';

/** A TagInput holding its own state, reporting every change to `onChange`. */
const Harness = ({
  initial = [],
  onChange = () => {},
  ...props
}: {
  initial?: string[];
  onChange?: (tags: string[]) => void;
  suggestions?: string[];
  error?: string;
}) => {
  const [tags, setTags] = useState(initial);
  return (
    <TagInput
      value={tags}
      onChange={(next) => {
        setTags(next);
        onChange(next);
      }}
      {...props}
    />
  );
};

const input = () => screen.getByRole('combobox', { name: 'Tags' });
const chips = () =>
  Array.from(document.querySelectorAll('.MuiChip-label')).map((chip) => chip.textContent);

describe('TagInput', () => {
  it('shows a hint by default', () => {
    render(<Harness />);

    expect(screen.getByText('Press Enter to add a tag. Up to 10 tags.')).toBeInTheDocument();
  });

  it('adds a typed tag on Enter, lowercased', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} />);

    await user.type(input(), 'Home{Enter}');

    expect(onChange).toHaveBeenLastCalledWith(['home']);
    expect(chips()).toEqual(['home']);
  });

  it('ignores a tag that is already there', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness initial={['home']} onChange={onChange} />);

    await user.type(input(), 'HOME{Enter}');

    expect(chips()).toEqual(['home']);
  });

  it('refuses an invalid tag with a message', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} />);

    await user.type(input(), 'not valid!{Enter}');

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/^Tags may only contain/)).toBeInTheDocument();
    expect(input()).toHaveAttribute('aria-invalid', 'true');
  });

  it('refuses an 11th tag, and clears the message after a valid change', async () => {
    const user = userEvent.setup();
    const ten = Array.from({ length: 10 }, (_, i) => `t${i}`);
    render(<Harness initial={ten} />);

    await user.type(input(), 'eleven{Enter}');
    expect(screen.getByText('Please provide at most 10 tags')).toBeInTheDocument();

    await user.click(screen.getAllByTestId('CancelIcon')[0]);
    expect(screen.queryByText('Please provide at most 10 tags')).not.toBeInTheDocument();
    expect(chips()).toHaveLength(9);
  });

  it('adds the typed text when the field loses focus', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} />);

    await user.type(input(), 'work');
    await user.tab();

    expect(onChange).toHaveBeenLastCalledWith(['work']);
  });

  it('offers suggestions that are not chosen yet', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness initial={['home']} suggestions={['home', 'work']} onChange={onChange} />);

    await user.click(input());
    expect(screen.queryByRole('option', { name: 'home' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'work' }));

    expect(onChange).toHaveBeenLastCalledWith(['home', 'work']);
  });

  it('shows an error from outside instead of the hint', () => {
    render(<Harness error='Bad tags from the API' />);

    expect(screen.getByText('Bad tags from the API')).toBeInTheDocument();
    expect(input()).toHaveAttribute('aria-invalid', 'true');
  });
});
