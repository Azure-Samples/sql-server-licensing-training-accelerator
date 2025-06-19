import { 
  Card, 
  CardHeader, 
  Text, 
  Button,
  Badge,
  Spinner,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { 
  Book24Regular, 
  Calculator24Regular, 
  PlayCircle24Regular,
  QuestionCircle24Regular,
  Clock24Regular,
} from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('24px'),
  },
  header: {
    marginBottom: '32px',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    ...shorthands.gap('24px'),
  },
  card: {
    ...shorthands.padding('24px'),
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: tokens.shadow8,
    },
  },
  cardIcon: {
    fontSize: '32px',
    color: tokens.colorBrandBackground,
    marginBottom: '16px',
  },
  cardTitle: {
    marginBottom: '8px',
  },
  cardDescription: {
    marginBottom: '16px',
    color: tokens.colorNeutralForeground2,
  },
  statsSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    ...shorthands.gap('16px'),
    marginTop: '32px',
  },
  statCard: {
    ...shorthands.padding('16px'),
    textAlign: 'center',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  topicsSection: {
    marginTop: '32px',
  },
  topicsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    ...shorthands.gap('16px'),
    marginTop: '16px',
  },
  topicCard: {
    ...shorthands.padding('16px'),
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: tokens.shadow8,
    },
  },
  topicMeta: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
    marginTop: '8px',
    flexWrap: 'wrap',
  },
  timeInfo: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('4px'),
    color: tokens.colorNeutralForeground2,
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '200px',
  },
});

export function Dashboard() {
  const styles = useStyles();
  const navigate = useNavigate();

  const { data: topicsData, isLoading: topicsLoading } = useQuery({
    queryKey: ['topics'],
    queryFn: () => apiService.getTopics(),
  });

  const topics = topicsData?.topics || [];
  const recentTopics = topics.slice(0, 6); // Show first 6 topics on dashboard

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return 'success';
      case 'intermediate':
        return 'warning';
      case 'advanced':
        return 'danger';
      default:
        return 'informative';
    }
  };

  const quickActions = [
    {
      title: 'Learning Topics',
      description: 'Explore SQL Server licensing fundamentals and advanced concepts',
      icon: Book24Regular,
      path: '/topics',
      color: tokens.colorPaletteRedBorder2,
    },
    {
      title: 'Cost Calculator',
      description: 'Calculate licensing costs for different scenarios and workloads',
      icon: Calculator24Regular,
      path: '/calculator',
      color: tokens.colorPaletteGreenBorder2,
    },
    {
      title: 'Interactive Scenarios',
      description: 'Practice with real-world customer licensing scenarios',
      icon: PlayCircle24Regular,
      path: '/scenarios',
      color: tokens.colorPaletteRedBorder2,
    },
    {
      title: 'FAQ & Resources',
      description: 'Quick answers and downloadable reference materials',
      icon: QuestionCircle24Regular,
      path: '/faq',
      color: tokens.colorPaletteDarkOrangeBorder2,
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Text size={900} weight="bold">
          Welcome to SQL Server Licensing Training
        </Text>
        <Text size={400} style={{ display: 'block', marginTop: '8px' }}>
          Master SQL Server licensing with interactive training, cost calculators, and real-world scenarios
        </Text>
      </div>

      <div className={styles.cardGrid}>
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Card 
              key={action.path}
              className={styles.card}
              onClick={() => navigate(action.path)}
            >
              <CardHeader>
                <div className={styles.cardIcon}>
                  <Icon style={{ color: action.color }} />
                </div>
                <Text size={600} weight="semibold" className={styles.cardTitle}>
                  {action.title}
                </Text>
                <Text size={300} className={styles.cardDescription}>
                  {action.description}
                </Text>
                <Button appearance="primary" size="small">
                  Get Started
                </Button>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <div className={styles.topicsSection}>
        <Text size={700} weight="semibold" style={{ marginBottom: '16px' }}>
          Recent Learning Topics
        </Text>
        
        {topicsLoading ? (
          <div className={styles.loadingContainer}>
            <Spinner size="large" label="Loading topics..." />
          </div>
        ) : (
          <div className={styles.topicsGrid}>
            {recentTopics.map((topic) => (
              <div
                key={topic.id}
                className={styles.topicCard}
                onClick={() => navigate(`/topics/${topic.id}`)}
                style={{
                  backgroundColor: tokens.colorNeutralBackground1,
                  border: `1px solid ${tokens.colorNeutralStroke2}`,
                  borderRadius: tokens.borderRadiusMedium,
                }}
              >
                <Text size={500} weight="semibold" style={{ marginBottom: '8px' }}>
                  {topic.title}
                </Text>
                <Text size={300} style={{ 
                  color: tokens.colorNeutralForeground2,
                  marginBottom: '12px',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {topic.description}
                </Text>
                <div className={styles.topicMeta}>
                  <Badge 
                    size="small" 
                    appearance="filled"
                    color={getDifficultyColor(topic.difficulty)}
                  >
                    {topic.difficulty}
                  </Badge>
                  <div className={styles.timeInfo}>
                    <Clock24Regular fontSize="12px" />
                    <Text size={200}>{topic.estimated_time} min</Text>
                  </div>
                  {topic.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} size="small" appearance="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {!topicsLoading && recentTopics.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <Button 
              appearance="outline" 
              onClick={() => navigate('/topics')}
            >
              View All Topics
            </Button>
          </div>
        )}
      </div>

      <div className={styles.statsSection}>
        <Card className={styles.statCard}>
          <Text size={800} weight="bold" style={{ display: 'block' }}>
            {topics.length}
          </Text>
          <Text size={300}>Learning Topics</Text>
        </Card>
        <Card className={styles.statCard}>
          <Text size={800} weight="bold" style={{ display: 'block' }}>
            8
          </Text>
          <Text size={300}>Scenarios</Text>
        </Card>
        <Card className={styles.statCard}>
          <Text size={800} weight="bold" style={{ display: 'block' }}>
            25
          </Text>
          <Text size={300}>Quiz Questions</Text>
        </Card>
        <Card className={styles.statCard}>
          <Text size={800} weight="bold" style={{ display: 'block' }}>
            100%
          </Text>
          <Text size={300}>Free Training</Text>
        </Card>
      </div>
    </div>
  );
}
