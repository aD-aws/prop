import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Box,
  useMediaQuery,
  useTheme,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  Home,
  Dashboard,
  Add,
  Help,
  Work,
  Assignment,
  Person,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useAIAssistant } from '../../contexts/AIAssistantContext';

interface NavigationItem {
  label: string;
  path?: string;
  action?: () => void;
  icon: JSX.Element;
}

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, logout, isAuthenticated } = useAuth();
  const { openChat } = useAIAssistant();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
    navigate('/');
  };

  const getNavigationItems = (): NavigationItem[] => {
    const baseItems: NavigationItem[] = [
      { label: 'Home', path: '/', icon: <Home /> },
    ];

    if (isAuthenticated) {
      if (user?.userType === 'builder') {
        baseItems.push(
          { label: 'Dashboard', path: '/builder/dashboard', icon: <Work /> },
          { label: 'Profile', path: '/builder/profile', icon: <Person /> },
        );
      } else {
        baseItems.push(
          { label: 'Dashboard', path: '/dashboard', icon: <Dashboard /> },
          { label: 'New Project', path: '/projects/create', icon: <Add /> },
        );
      }
    }

    baseItems.push({ label: 'Help', action: openChat, icon: <Help /> });
    return baseItems;
  };

  const navigationItems = getNavigationItems();

  const renderDesktopMenu = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {navigationItems.map((item) => (
        <Button
          key={item.label}
          color="inherit"
          onClick={item.path ? () => navigate(item.path!) : item.action}
          sx={{
            color: location.pathname === item.path ? 'secondary.main' : 'inherit',
            fontWeight: location.pathname === item.path ? 600 : 400,
          }}
          startIcon={item.icon}
        >
          {item.label}
        </Button>
      ))}
      
      {isAuthenticated ? (
        <>
          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-controls="primary-search-account-menu"
            aria-haspopup="true"
            onClick={handleProfileMenuOpen}
            color="inherit"
          >
            <AccountCircle />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={() => { 
              navigate(user?.userType === 'builder' ? '/builder/profile' : '/profile'); 
              handleMenuClose(); 
            }}>
              Profile
            </MenuItem>
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </>
      ) : (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button color="inherit" onClick={() => navigate('/login')}>
            Login
          </Button>
          <Button 
            variant="outlined" 
            color="inherit" 
            onClick={() => navigate('/register')}
            sx={{ borderColor: 'white', '&:hover': { borderColor: 'secondary.main' } }}
          >
            Register
          </Button>
        </Box>
      )}
    </Box>
  );

  const renderMobileMenu = () => (
    <Drawer
      anchor="left"
      open={mobileMenuOpen}
      onClose={() => setMobileMenuOpen(false)}
      sx={{
        '& .MuiDrawer-paper': {
          width: 250,
          boxSizing: 'border-box',
        },
      }}
    >
      <Box sx={{ pt: 2 }}>
        <Typography variant="h6" sx={{ px: 2, mb: 2 }}>
          UK Home Improvement
        </Typography>
        <List>
          {navigationItems.map((item) => (
            <ListItem
              key={item.label}
              button
              onClick={() => {
                if (item.path) {
                  navigate(item.path);
                } else if (item.action) {
                  item.action();
                }
                setMobileMenuOpen(false);
              }}
              sx={{
                backgroundColor: location.pathname === item.path ? 'action.selected' : 'transparent',
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItem>
          ))}
          
          {isAuthenticated ? (
            <>
              <ListItem button onClick={() => { 
                navigate(user?.userType === 'builder' ? '/builder/profile' : '/profile'); 
                setMobileMenuOpen(false); 
              }}>
                <ListItemIcon><AccountCircle /></ListItemIcon>
                <ListItemText primary="Profile" />
              </ListItem>
              <ListItem button onClick={() => { handleLogout(); setMobileMenuOpen(false); }}>
                <ListItemText primary="Logout" />
              </ListItem>
            </>
          ) : (
            <>
              <ListItem button onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}>
                <ListItemText primary="Login" />
              </ListItem>
              <ListItem button onClick={() => { navigate('/register'); setMobileMenuOpen(false); }}>
                <ListItemText primary="Register" />
              </ListItem>
            </>
          )}
        </List>
      </Box>
    </Drawer>
  );

  return (
    <>
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {isMobile && (
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="open drawer"
              onClick={() => setMobileMenuOpen(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ 
              flexGrow: isMobile ? 1 : 0,
              cursor: 'pointer',
              mr: 4,
            }}
            onClick={() => navigate('/')}
          >
            UK Home Improvement
          </Typography>
          
          {!isMobile && (
            <Box sx={{ flexGrow: 1 }} />
          )}
          
          {!isMobile && renderDesktopMenu()}
        </Toolbar>
      </AppBar>
      
      {isMobile && renderMobileMenu()}
    </>
  );
};

export default Header;