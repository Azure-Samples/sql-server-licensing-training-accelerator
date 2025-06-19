import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Text,
  Card,
  Spinner,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { ArrowLeft24Regular, Building24Regular, Calculator24Regular } from '@fluentui/react-icons';
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
  scenarioIcon: {
    fontSize: '32px',
    color: tokens.colorBrandBackground,
  },
  content: {
    ...shorthands.padding('24px'),
    marginBottom: '24px',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    marginBottom: '12px',
    color: tokens.colorBrandForeground1,
  },
  customerProfile: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.padding('16px'),
    ...shorthands.borderRadius('8px'),
    marginBottom: '16px',
  },
  requirementsList: {
    ...shorthands.margin('0'),
    ...shorthands.padding('0', '0', '0', '20px'),
  },
  requirementItem: {
    marginBottom: '8px',
    color: tokens.colorNeutralForeground1,
  },
  solution: {
    backgroundColor: tokens.colorBrandBackground2,
    color: 'white',
    ...shorthands.padding('20px'),
    ...shorthands.borderRadius('8px'),
    marginBottom: '24px',
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
});

export function ScenarioDetail() {
  const styles = useStyles();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: scenario, isLoading, error } = useQuery({
    queryKey: ['scenario', id],
    queryFn: () => apiService.getScenario(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="large" label="Loading scenario..." />
      </div>
    );
  }

  if (error || !scenario) {
    return (
      <div className={styles.errorState}>
        <Text size={500}>Scenario not found.</Text>
        <Button 
          appearance="primary" 
          onClick={() => navigate('/scenarios')}
          style={{ marginTop: '16px' }}
        >
          Back to Scenarios
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
          onClick={() => navigate('/scenarios')}
        >
          Back to Scenarios
        </Button>
        <Building24Regular className={styles.scenarioIcon} />
        <Text size={800} weight="bold">
          {scenario.title}
        </Text>
      </div>

      <Card className={styles.content}>
        <div className={styles.section}>
          <Text size={400} style={{ marginBottom: '16px' }}>
            {scenario.description}
          </Text>
        </div>

        <div className={styles.section}>
          <Text size={500} weight="semibold" className={styles.sectionTitle}>
            Customer Profile
          </Text>
          <div className={styles.customerProfile}>
            <Text size={400}>
              {scenario.customer_profile}
            </Text>
          </div>
        </div>

        <div className={styles.section}>
          <Text size={500} weight="semibold" className={styles.sectionTitle}>
            Key Requirements
          </Text>
          <ul className={styles.requirementsList}>
            {scenario.requirements.map((requirement, index) => (
              <li key={index} className={styles.requirementItem}>
                <Text size={400}>{requirement}</Text>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.section}>
          <Text size={500} weight="semibold" className={styles.sectionTitle}>
            Recommended Solution
          </Text>
          <div className={styles.solution}>
            <Text size={400} weight="medium">
              {scenario.recommended_solution}
            </Text>
          </div>
        </div>

        <div className={styles.actions}>
          <Button 
            appearance="primary" 
            icon={<Calculator24Regular />}
            onClick={() => navigate('/calculator')}
          >
            Calculate Costs
          </Button>
          <Button 
            appearance="secondary"
            onClick={() => navigate('/topics')}
          >
            Learn More
          </Button>
        </div>
      </Card>
    </div>
  );
}
