import React from 'react';
import { render } from '@testing-library/react';
import Home from '../../pages/index';

// Mock Material-UI components
jest.mock('@mui/material', () => ({
  Box: ({ children, sx }: any) => (
    <div data-testid="mui-box" className="MuiBox-root" style={sx}>
      {children}
    </div>
  ),
  Typography: ({ children, variant, component, gutterBottom }: any) => (
    <div
      data-testid="mui-typography"
      className={`MuiTypography-${variant}`}
      style={{ marginBottom: gutterBottom ? '0.35em' : 0 }}
    >
      {children}
    </div>
  ),
  Container: ({ children, maxWidth }: any) => (
    <div data-testid="mui-container" className="MuiContainer-root" data-max-width={maxWidth}>
      {children}
    </div>
  ),
}));

describe('Home', () => {
  it('renders the title correctly', () => {
    const { getByTestId } = render(<Home />);
    
    const typography = getByTestId('mui-typography');
    expect(typography).toBeInTheDocument();
    expect(typography).toHaveClass('MuiTypography-h4');
    expect(typography).toHaveTextContent("Lino's Padaria - Sistema de Gestão de Pedidos");
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