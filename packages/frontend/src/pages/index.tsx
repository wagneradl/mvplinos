import { Box, Typography, Container } from '@mui/material';

export default function Home() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Lino's Padaria - Sistema de Gestão de Pedidos
        </Typography>
      </Box>
    </Container>
  );
}