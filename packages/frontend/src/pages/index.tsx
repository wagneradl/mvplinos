import { Box, Typography, Container, Grid, Card, CardContent, CardActionArea } from '@mui/material';
import Link from 'next/link';
import { AddShoppingCart, Assessment, ListAlt } from '@mui/icons-material';

export default function Home() {
  const quickLinks = [
    {
      title: 'Novo Pedido',
      description: 'Criar um novo pedido',
      icon: <AddShoppingCart sx={{ fontSize: 40 }} />,
      href: '/pedidos/novo',
    },
    {
      title: 'Lista de Pedidos',
      description: 'Ver todos os pedidos',
      icon: <ListAlt sx={{ fontSize: 40 }} />,
      href: '/pedidos',
    },
    {
      title: 'Relatórios',
      description: 'Visualizar relatórios',
      icon: <Assessment sx={{ fontSize: 40 }} />,
      href: '/relatorios',
    },
  ];

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h1" component="h1" gutterBottom>
          Sistema de Gestão de Pedidos da Lino&apos;s Padaria
        </Typography>

        <Grid container spacing={3} sx={{ mt: 4 }}>
          {quickLinks.map((link) => (
            <Grid item xs={12} sm={6} md={4} key={link.href}>
              <Card>
                <CardActionArea component={Link} href={link.href}>
                  <CardContent sx={{ textAlign: 'center', py: 4 }}>
                    {link.icon}
                    <Typography variant="h5" component="h2" sx={{ mt: 2 }}>
                      {link.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {link.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
}
