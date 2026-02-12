import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Hello } from '../Hello';

describe('Hello component', () => {
  it('renders greeting', () => {
    render(<Hello name='John' />);
    expect(screen.getByText('Hello John')).toBeInTheDocument();
  });
});
