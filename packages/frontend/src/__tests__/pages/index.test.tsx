import React from 'react';
import { render } from '@testing-library/react';
import Home from '../../pages/index';
import type { SxProps, Theme } from '@mui/material/styles';

interface BoxProps {
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}

interface TypographyProps {
  children: React.ReactNode;
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'subtitle1' | 'subtitle2' | 'body1' | 'body2';
  gutterBottom?: boolean;
}

interface ContainerProps {
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

// Mock Material-UI components
jest.mock('@mui/material', () => ({
  Box: ({ children, sx }: BoxProps) => (
    <div data-testid="mui-box" className="MuiBox-root" style={sx as React.CSSProperties}>
      {children}
    </div>
  ),
  Typography: ({ children, variant, gutterBottom }: TypographyProps) => (
    <div
      data-testid="mui-typography"
      className={`MuiTypography-${variant}`}
      style={{ marginBottom: gutterBottom ? '0.35em' : 0 }}
    >
      {children}
    </div>
  ),
  Container: ({ children, maxWidth }: ContainerProps) => (
    <div data-testid="mui-container" className="MuiContainer-root" data-max-width={maxWidth}>
      {children}
    </div>
  ),
}));

describe('Home', () => {
  it('renders without crashing', () => {
    const { getByRole } = render(<Home />);
    expect(getByRole('heading')).toBeInTheDocument();
  });

  it('renders within a container with correct max width', () => {
    const { getByTestId } = render(<Home />);

    const container = getByTestId('mui-container');
    expect(container).toHaveClass('MuiContainer-root');
    expect(container).toHaveAttribute('data-max-width', 'lg');
  });

  it('has correct spacing with Box component', () => {
    const { getByTestId } = render(<Home />);

    const box = getByTestId('mui-box');
    expect(box).toHaveClass('MuiBox-root');
  });

  it('renders Typography with correct variant and gutterBottom', () => {
    const { getByTestId } = render(<Home />);

    const typography = getByTestId('mui-typography');
    expect(typography).toHaveClass('MuiTypography-h4');
    expect(typography).toHaveStyle({ marginBottom: '0.35em' });
  });
});
