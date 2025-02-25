import { theme } from '../../theme';

describe('Theme', () => {
  it('has the correct primary color', () => {
    expect(theme.palette.primary.main).toBe('#1976d2');
  });

  it('has the correct secondary color', () => {
    expect(theme.palette.secondary.main).toBe('#dc004e');
  });

  it('is a valid theme object', () => {
    expect(theme).toHaveProperty('palette');
    expect(theme.palette).toHaveProperty('primary');
    expect(theme.palette).toHaveProperty('secondary');
  });
});
