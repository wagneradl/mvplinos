'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useTheme,
  Divider,
} from '@mui/material';
import {Menu as MenuIcon, Home as HomeIcon, ShoppingCart as PedidosIcon, Inventory as ProdutosIcon, People as ClientesIcon, Assessment as RelatoriosIcon, Add as AddIcon, Dashboard as DashboardIcon, Settings as SettingsIcon } from '@mui/icons-material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Breadcrumbs } from './Breadcrumbs';

const DRAWER_WIDTH = 240;

const menuItems = [
  { text: 'Início', href: '/', icon: HomeIcon },
  { 
    text: 'Pedidos', 
    href: '/pedidos', 
    icon: PedidosIcon,
    subItems: [
      { text: 'Listar Pedidos', href: '/pedidos', icon: PedidosIcon },
      { text: 'Novo Pedido', href: '/pedidos/novo', icon: AddIcon },
    ]
  },
  { 
    text: 'Produtos', 
    href: '/produtos', 
    icon: ProdutosIcon 
  },
  { 
    text: 'Clientes', 
    href: '/clientes', 
    icon: ClientesIcon 
  },
  { 
    text: 'Relatórios', 
    href: '/relatorios', 
    icon: RelatoriosIcon 
  },
];

export function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const pathname = usePathname();
  const theme = useTheme();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };
  
  const handleExpandClick = (text: string) => {
    setExpandedItem(expandedItem === text ? null : text);
  };

  const drawer = (
    <Box>
      {/* Logo e nome da empresa */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3, pb: 2, mb: 1 }}>
        <Box 
          sx={{ 
            width: 120,
            height: 120,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            margin: '0 auto'
          }}
        >
          <Image 
            src="/logo.png" 
            alt="Lino's Panificadora" 
            width={120} 
            height={120}
            style={{ objectFit: 'contain' }}
          />
        </Box>
        <Typography variant="h5" sx={{ mt: 2, fontWeight: 700, color: theme.palette.primary.main, letterSpacing: 0.5, textAlign: 'center' }}>
          Lino's Panificadora
        </Typography>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 400, letterSpacing: 0.3, textAlign: 'center' }}>
          Sistema de Gestão
        </Typography>
      </Box>
      
      <Divider sx={{ mb: 2, width: '85%', mx: 'auto', opacity: 0.6 }} />

      <List>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isSelected = pathname === item.href || 
                           (item.subItems && item.subItems.some(sub => sub.href === pathname));
          const isExpanded = expandedItem === item.text;
          
          // Se o item do menu atual tem subitens e o caminho atual corresponde a algum subitem
          const currentSubItem = item.subItems?.find(sub => sub.href === pathname);

          return (
            <React.Fragment key={item.href}>
              <ListItem disablePadding sx={{ display: 'block', mb: 0.75 }}>
                <ListItemButton
                  component={item.subItems ? 'div' : Link}
                  href={item.subItems ? undefined : item.href}
                  selected={isSelected}
                  onClick={() => item.subItems ? handleExpandClick(item.text) : null}
                  sx={{
                    minHeight: 52,
                    px: 3,
                    borderRadius: '12px',
                    mx: 1.5,
                    transition: 'all 0.2s ease',
                    '&.Mui-selected': {
                      backgroundColor: `${theme.palette.primary.main}E6`, // Com 90% de opacidade
                      color: theme.palette.primary.contrastText,
                      '&:hover': {
                        backgroundColor: theme.palette.primary.main,
                      },
                      '& .MuiListItemIcon-root': {
                        color: theme.palette.primary.contrastText,
                      },
                    },
                    '&:hover': {
                      backgroundColor: `${theme.palette.primary.main}14`, // Com 8% de opacidade
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Icon color={isSelected ? 'inherit' : 'action'} />
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text} 
                    primaryTypographyProps={{
                      fontWeight: isSelected ? 600 : 500,
                      fontSize: '0.95rem'
                    }}
                  />
                  {item.subItems && (
                    <IconButton 
                      edge="end" 
                      aria-label="expandir" 
                      sx={{ 
                        mr: -1, 
                        color: isSelected ? 'white' : 'inherit'
                      }} 
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExpandClick(item.text);
                      }}
                    >
                      {isExpanded ? (
                        <Box 
                          component="span" 
                          sx={{ 
                            transform: 'rotate(180deg)', 
                            transition: 'transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
                            color: isSelected ? 'white' : 'inherit'
                          }}
                        >
                          <span style={{ fontSize: '18px' }}>⌄</span> {/* Utilização do caractere Unicode para chevron */}
                        </Box>
                      ) : (
                        <Box 
                          component="span" 
                          sx={{ 
                            transition: 'transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
                            color: isSelected ? 'white' : 'inherit'
                          }}
                        >
                          <span style={{ fontSize: '18px' }}>⌄</span> {/* Utilização do caractere Unicode para chevron */}
                        </Box>
                      )}
                    </IconButton>
                  )}
                </ListItemButton>
              </ListItem>

              {/* Sub-itens para Pedidos */}
              {item.subItems && (
                <Box 
                  sx={{ 
                    pl: 4,
                    maxHeight: isExpanded ? '500px' : 0,
                    overflow: 'hidden',
                    opacity: isExpanded ? 1 : 0,
                    transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)'
                  }}
                >
                  {item.subItems.map((subItem) => {
                    const SubIcon = subItem.icon;
                    const isSubSelected = pathname === subItem.href;
                    
                    return (
                      <ListItem key={subItem.href} disablePadding sx={{ mb: 0.75 }}>
                        <ListItemButton
                          component={Link}
                          href={subItem.href}
                          selected={isSubSelected}
                          sx={{
                            minHeight: 44,
                            px: 3,
                            borderRadius: '12px',
                            mx: 1,
                            transition: 'all 0.2s ease',
                            '&.Mui-selected': {
                              backgroundColor: `${theme.palette.primary.main}E6`, // Com 90% de opacidade
                              color: theme.palette.primary.contrastText,
                              '&:hover': {
                                backgroundColor: theme.palette.primary.main,
                              },
                              '& .MuiListItemIcon-root': {
                                color: theme.palette.primary.contrastText,
                              },
                            },
                            '&:hover': {
                              backgroundColor: `${theme.palette.primary.main}14`, // Com 8% de opacidade
                            },
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <SubIcon 
                              fontSize="small" 
                              color={isSubSelected ? 'inherit' : 'action'}
                            />
                          </ListItemIcon>
                          <ListItemText 
                            primary={subItem.text}
                            primaryTypographyProps={{
                              variant: 'body2',
                              fontWeight: isSubSelected ? 600 : 500,
                              fontSize: '0.9rem'
                            }}
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </Box>
              )}
            </React.Fragment>
          );
        })}
      </List>
    </Box>
  );

  return (
    <>
      <AppBar
        position="fixed"
        elevation={1}
        sx={{
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { sm: `${DRAWER_WIDTH}px` },
          bgcolor: 'white',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="abrir menu"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
              {/* Título da página atual baseado na rota */}
              {pathname === '/' ? 'Início' : 
               pathname === '/pedidos/novo' ? 'Novo Pedido' : 
               pathname.startsWith('/pedidos/') ? 'Detalhes do Pedido' :
               pathname === '/pedidos' ? 'Pedidos' :
               pathname === '/produtos' ? 'Produtos' :
               pathname === '/clientes' ? 'Clientes' :
               pathname === '/relatorios' ? 'Relatórios' : 'Lino\'s Panificadora'}
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
    </>
  );
}
