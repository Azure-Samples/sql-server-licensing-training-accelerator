import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  makeStyles,
  shorthands,
  tokens,
  Button,
  Text,
  Divider,
} from '@fluentui/react-components';
import {
  Home24Regular,
  Book24Regular,
  PlayCircle24Regular,
  Calculator24Regular,
  QuestionCircle24Regular,
  Settings24Regular,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  sidebar: {
    width: '240px',
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.padding('16px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
  },
  logo: {
    ...shorthands.margin('0', '0', '24px', '0'),
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
  },
  navButton: {
    justifyContent: 'flex-start',
    ...shorthands.padding('12px', '16px'),
  },
  activeNavButton: {
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground2,
  },
  main: {
    flex: 1,
    ...shorthands.padding('24px'),
    overflowY: 'auto',
  },
  mobileMenuButton: {
    display: 'none',
    '@media (max-width: 768px)': {
      display: 'block',
      position: 'fixed',
      top: '16px',
      left: '16px',
      zIndex: 1000,
    },
  },
  mobileSidebar: {
    '@media (max-width: 768px)': {
      position: 'fixed',
      top: 0,
      left: 0,
      height: '100vh',
      zIndex: 999,
      transform: 'translateX(-100%)',
      transition: 'transform 0.3s ease',
    },
  },
  mobileSidebarOpen: {
    '@media (max-width: 768px)': {
      transform: 'translateX(0)',
    },
  },
});

interface LayoutProps {
  children: ReactNode;
}

const navigationItems = [
  { path: '/', label: 'Dashboard', icon: Home24Regular },
  { path: '/topics', label: 'Learning Topics', icon: Book24Regular },
  { path: '/scenarios', label: 'Scenarios', icon: PlayCircle24Regular },
  { path: '/calculator', label: 'Cost Calculator', icon: Calculator24Regular },
  { path: '/faq', label: 'FAQ & Resources', icon: QuestionCircle24Regular },
  { path: '/admin', label: 'Admin Console', icon: Settings24Regular },
];

export function Layout({ children }: LayoutProps) {
  const styles = useStyles();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <Text size={600} weight="semibold">
            SQL Server Licensing
          </Text>
          <Text size={300} style={{ display: 'block', marginTop: '4px' }}>
            Training & Support
          </Text>
          <div style={{ 
            display: 'block', 
            marginTop: '12px', 
            padding: '12px 16px',
            background: 'linear-gradient(135deg, #0078d4, #106ebe, #005a9e)',
            borderRadius: '20px',
            textAlign: 'center',
            boxShadow: '0 6px 20px rgba(0, 120, 212, 0.4)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            transform: 'rotate(-1deg)',
          }}>
            <Text size={300} style={{ 
              color: 'white', 
              fontFamily: '"Dancing Script", "Brush Script MT", cursive',
              fontWeight: '600',
              textShadow: '0 2px 6px rgba(0,0,0,0.5)',
              letterSpacing: '0.8px',
              fontSize: '16px',
              fontStyle: 'italic',
            }}>
              ✨ by Laura Robinson ✨
            </Text>
          </div>
        </div>
        
        <Divider />
        
        <nav className={styles.nav} style={{ marginTop: '16px' }}>
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Button
                key={item.path}
                appearance="subtle"
                icon={<Icon />}
                className={`${styles.navButton} ${isActive ? styles.activeNavButton : ''}`}
                onClick={() => navigate(item.path)}
              >
                {item.label}
              </Button>
            );
          })}
        </nav>
      </aside>
      
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
