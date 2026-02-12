import type { FC } from 'react';

export const Hello: FC<{ name: string }> = ({ name }) => {
  return <h1>Hello {name}</h1>;
};
