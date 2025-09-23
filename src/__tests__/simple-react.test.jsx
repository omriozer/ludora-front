import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

const SimpleComponent = ({ name }) => <div>Hello {name}</div>;

describe('React Testing Library setup', () => {
  it('should render a simple component', () => {
    render(<SimpleComponent name="World" />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });
});