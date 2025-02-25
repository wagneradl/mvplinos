import React from 'react';
import { render } from '@testing-library/react';
import App from '../../pages/_app';

// Mock the theme
jest.mock('../../theme', () => ({
  theme: {
    palette: {
      primary: { main: '#1976d2' },
      secondary: { main: '#dc004e' },
    },
  },
}));

// Mock Material-UI components
jest.mock('@mui/material/styles', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}));

jest.mock('@mui/material/CssBaseline', () => ({
  __esModule: true,
  default: () => <div data-testid="css-baseline" />,
}));

describe('App', () => {
  it('renders without crashing', () => {
    const mockComponent = () => <div>Test Component</div>;
    const { getByText, getByTestId } = render(<App Component={mockComponent} pageProps={{}} />);

    expect(getByTestId('theme-provider')).toBeInTheDocument();
    expect(getByTestId('css-baseline')).toBeInTheDocument();
    expect(getByText('Test Component')).toBeInTheDocument();
  });

  it('passes pageProps to the Component', () => {
    interface TestProps {
      testProp: string;
    }
    const mockComponent = (props: TestProps) => <div>Props: {JSON.stringify(props)}</div>;
    const mockPageProps: TestProps = { testProp: 'test value' };

    const { getByText } = render(<App Component={mockComponent} pageProps={mockPageProps} />);

    expect(getByText('Props: {"testProp":"test value"}')).toBeInTheDocument();
  });
});
