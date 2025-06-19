import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Text,
  Button,
  Input,
  Badge,
  Spinner,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { Search24Regular, Clock24Regular } from '@fluentui/react-icons';
import { apiService } from '../services/api';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('24px'),
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  searchContainer: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('12px'),
    marginBottom: '24px',
  },
  searchInput: {
    minWidth: '300px',
  },
  topicsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    ...shorthands.gap('24px'),
  },
  topicCard: {
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: tokens.shadow8,
    },
  },
  cardContent: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px'),
  },
  cardTitle: {
    marginBottom: '8px',
  },
  cardDescription: {
    color: tokens.colorNeutralForeground2,
    marginBottom: '16px',
  },
  cardMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  tags: {
    display: 'flex',
    ...shorthands.gap('8px'),
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
  emptyState: {
    textAlign: 'center',
    ...shorthands.padding('48px'),
    color: tokens.colorNeutralForeground2,
  },
});

export function Topics() {
  const styles = useStyles();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: topicsData, isLoading, error } = useQuery({
    queryKey: ['topics', searchTerm],
    queryFn: () => apiService.getTopics(searchTerm || undefined),
  });



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

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="large" label="Loading topics..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.emptyState}>
        <Text size={500}>Error loading topics. Please try again.</Text>
      </div>
    );
  }

  const topics = topicsData?.topics || [];

  return (
    <div className={styles.container} data-testid="topics-container">
      <div className={styles.header}>
        <div>
          <Text size={800} weight="bold">
            Learning Topics
          </Text>
          <Text size={400} style={{ display: 'block', marginTop: '4px' }}>
            Master SQL Server licensing concepts step by step
          </Text>
        </div>
      </div>

      <div className={styles.searchContainer}>
        <Input
          className={styles.searchInput}
          placeholder="Search topics..."
          value={searchTerm}
          onChange={(_, data) => setSearchTerm(data.value)}
          contentBefore={<Search24Regular />}
        />
        <Button appearance="primary">Search</Button>
      </div>

      {topics.length === 0 ? (
        <div className={styles.emptyState}>
          <Text size={500}>No topics found.</Text>
          <Text size={300} style={{ marginTop: '8px' }}>
            Try adjusting your search terms or check back later for new content.
          </Text>
        </div>
      ) : (
        <div className={styles.topicsGrid} data-testid="topics-grid">
          {topics.map((topic) => (
            <div
              key={topic.id}
              className={styles.topicCard}
              onClick={() => navigate(`/topics/${topic.id}`)}
              style={{ 
                padding: '20px',
                backgroundColor: tokens.colorNeutralBackground1,
                border: `1px solid ${tokens.colorNeutralStroke2}`,
                borderRadius: tokens.borderRadiusMedium,
                boxShadow: tokens.shadow4
              }}
            >
              <div className={styles.cardContent}>
                <Text size={600} weight="semibold" className={styles.cardTitle}>
                  {topic.title}
                </Text>
                <Text size={300} className={styles.cardDescription}>
                  {topic.description}
                </Text>
                
                <div className={styles.tags}>
                  {topic.tags.map((tag) => (
                    <Badge key={tag} size="small" appearance="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className={styles.cardMeta}>
                  <Badge 
                    size="medium" 
                    appearance="filled"
                    color={getDifficultyColor(topic.difficulty)}
                  >
                    {topic.difficulty}
                  </Badge>
                  
                  <div className={styles.timeInfo}>
                    <Clock24Regular fontSize="16px" />
                    <Text size={200}>{topic.estimated_time} min</Text>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
