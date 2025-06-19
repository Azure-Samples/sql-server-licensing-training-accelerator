import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Text,
  Badge,
  Spinner,
  Card,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { ArrowLeft24Regular, Clock24Regular, Play24Regular } from '@fluentui/react-icons';
import { apiService } from '../services/api';

const useStyles = makeStyles({
  container: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('16px'),
    marginBottom: '24px',
  },
  backButton: {
    minWidth: 'auto',
  },
  topicMeta: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('16px'),
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  timeInfo: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('4px'),
    color: tokens.colorNeutralForeground2,
  },
  content: {
    ...shorthands.padding('24px'),
    marginBottom: '24px',
    lineHeight: '1.6',
  },
  actions: {
    display: 'flex',
    ...shorthands.gap('12px'),
    justifyContent: 'center',
    marginTop: '32px',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
  },
  errorState: {
    textAlign: 'center',
    ...shorthands.padding('48px'),
    color: tokens.colorNeutralForeground2,
  },
  markdownContent: {
    '& h1': {
      fontSize: tokens.fontSizeHero800,
      fontWeight: tokens.fontWeightSemibold,
      marginBottom: '16px',
      color: tokens.colorNeutralForeground1,
    },
    '& h2': {
      fontSize: tokens.fontSizeHero700,
      fontWeight: tokens.fontWeightSemibold,
      marginBottom: '12px',
      marginTop: '24px',
      color: tokens.colorNeutralForeground1,
    },
    '& h3': {
      fontSize: tokens.fontSizeBase500,
      fontWeight: tokens.fontWeightSemibold,
      marginBottom: '8px',
      marginTop: '16px',
      color: tokens.colorNeutralForeground1,
    },
    '& p': {
      marginBottom: '12px',
      color: tokens.colorNeutralForeground1,
    },
    '& ul, & ol': {
      marginBottom: '12px',
      paddingLeft: '24px',
    },
    '& li': {
      marginBottom: '4px',
      color: tokens.colorNeutralForeground1,
    },
    '& code': {
      backgroundColor: tokens.colorNeutralBackground2,
      ...shorthands.padding('2px', '4px'),
      ...shorthands.borderRadius('4px'),
      fontFamily: tokens.fontFamilyMonospace,
    },
  },
});

export function TopicDetail() {
  const styles = useStyles();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isQuizMode = window.location.pathname.startsWith('/quiz/');

  const { data: topic, isLoading, error } = useQuery({
    queryKey: ['topic', id],
    queryFn: () => apiService.getTopic(id!),
    enabled: !!id,
  });

  const { data: quiz, isLoading: quizLoading, error: quizError } = useQuery({
    queryKey: ['quiz', id],
    queryFn: () => apiService.getQuiz(id!),
    enabled: !!id && isQuizMode,
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

  const renderMarkdownContent = (content: string) => {
    return content.split('\n').map((line, index) => {
      if (line.startsWith('# ')) {
        return <h1 key={index}>{line.substring(2)}</h1>;
      } else if (line.startsWith('## ')) {
        return <h2 key={index}>{line.substring(3)}</h2>;
      } else if (line.startsWith('### ')) {
        return <h3 key={index}>{line.substring(4)}</h3>;
      } else if (line.startsWith('- ')) {
        return <li key={index}>{line.substring(2)}</li>;
      } else if (line.trim() === '') {
        return <br key={index} />;
      } else {
        return <p key={index}>{line}</p>;
      }
    });
  };

  if (isLoading || (isQuizMode && quizLoading)) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="large" label={isQuizMode ? "Loading quiz..." : "Loading topic..."} />
      </div>
    );
  }

  if (isQuizMode && (quizError || !quiz)) {
    return (
      <div className={styles.errorState}>
        <Text size={500}>Quiz not found.</Text>
        <Text size={300} style={{ display: 'block', marginTop: '8px' }}>
          This quiz may not be available yet. Try exploring the topic content first.
        </Text>
        <Button 
          appearance="primary" 
          onClick={() => navigate('/topics')}
          style={{ marginTop: '16px' }}
        >
          Back to Topics
        </Button>
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className={styles.errorState}>
        <Text size={500}>Topic not found.</Text>
        <Button 
          appearance="primary" 
          onClick={() => navigate('/topics')}
          style={{ marginTop: '16px' }}
        >
          Back to Topics
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button
          appearance="subtle"
          icon={<ArrowLeft24Regular />}
          className={styles.backButton}
          onClick={() => navigate('/topics')}
        >
          Back to Topics
        </Button>
        <Text size={800} weight="bold">
          {isQuizMode && quiz ? `Quiz: ${quiz.title}` : topic.title}
        </Text>
      </div>

      <div className={styles.topicMeta}>
        <Badge 
          size="medium" 
          appearance="filled"
          color={getDifficultyColor(topic.difficulty)}
        >
          {topic.difficulty}
        </Badge>
        
        <div className={styles.timeInfo}>
          <Clock24Regular fontSize="16px" />
          <Text size={300}>{topic.estimated_time} minutes</Text>
        </div>

        {topic.tags.map((tag) => (
          <Badge key={tag} size="small" appearance="outline">
            {tag}
          </Badge>
        ))}
      </div>

      <Card className={styles.content}>
        {isQuizMode && quiz ? (
          <div>
            <Text size={500} weight="medium" style={{ marginBottom: '16px' }}>
              Quiz Questions
            </Text>
            <Text size={300} style={{ marginBottom: '24px' }}>
              This quiz feature is coming soon. For now, please review the topic content below.
            </Text>
            <div className={styles.markdownContent}>
              {renderMarkdownContent(topic.content)}
            </div>
          </div>
        ) : (
          <div className={styles.markdownContent}>
            {renderMarkdownContent(topic.content)}
          </div>
        )}
      </Card>

      <div className={styles.actions}>
        {!isQuizMode && (
          <Button 
            appearance="primary" 
            icon={<Play24Regular />}
            onClick={() => navigate(`/quiz/${topic.id}`)}
          >
            Take Quiz
          </Button>
        )}
        <Button 
          appearance="secondary"
          onClick={() => navigate('/calculator')}
        >
          Try Cost Calculator
        </Button>
        {isQuizMode && (
          <Button 
            appearance="outline"
            onClick={() => navigate(`/topics/${topic.id}`)}
          >
            View Topic Content
          </Button>
        )}
      </div>
    </div>
  );
}
