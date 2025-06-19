import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Text,
  Button,
  Spinner,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { Play24Regular, Building24Regular } from '@fluentui/react-icons';
import { apiService } from '../services/api';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('24px'),
  },
  header: {
    marginBottom: '24px',
  },
  scenariosGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
    ...shorthands.gap('24px'),
  },
  scenarioCard: {
    ...shorthands.padding('24px'),
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
    ...shorthands.gap('16px'),
  },
  cardTitle: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('12px'),
    marginBottom: '8px',
  },
  cardDescription: {
    color: tokens.colorNeutralForeground2,
    marginBottom: '16px',
  },
  customerProfile: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.padding('12px'),
    ...shorthands.borderRadius('6px'),
    marginBottom: '16px',
  },
  requirementsList: {
    ...shorthands.margin('0'),
    ...shorthands.padding('0', '0', '0', '20px'),
  },
  requirementItem: {
    marginBottom: '4px',
    color: tokens.colorNeutralForeground1,
  },
  solution: {
    backgroundColor: tokens.colorBrandBackground2,
    color: 'white',
    ...shorthands.padding('12px'),
    ...shorthands.borderRadius('6px'),
    marginTop: '16px',
  },
  actionButton: {
    alignSelf: 'flex-start',
    marginTop: 'auto',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
  },
  emptyState: {
    textAlign: 'center',
    ...shorthands.padding('48px'),
    color: tokens.colorNeutralForeground2,
  },
});

export function Scenarios() {
  const styles = useStyles();
  const navigate = useNavigate();

  const { data: scenariosData, isLoading, error } = useQuery({
    queryKey: ['scenarios'],
    queryFn: () => apiService.getScenarios(),
  });

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="large" label="Loading scenarios..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.emptyState}>
        <Text size={500}>Error loading scenarios. Please try again.</Text>
      </div>
    );
  }

  const scenarios = scenariosData?.scenarios || [];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Text size={800} weight="bold">
          Interactive Scenarios
        </Text>
        <Text size={400} style={{ display: 'block', marginTop: '4px' }}>
          Practice with real-world customer licensing scenarios and learn best practices
        </Text>
      </div>

      {scenarios.length === 0 ? (
        <div className={styles.emptyState}>
          <Text size={500}>No scenarios available.</Text>
          <Text size={300} style={{ marginTop: '8px' }}>
            Check back later for new interactive scenarios.
          </Text>
        </div>
      ) : (
        <div className={styles.scenariosGrid}>
          {scenarios.map((scenario) => (
            <div
              key={scenario.id}
              className={styles.scenarioCard}
              onClick={() => navigate(`/scenarios/${scenario.id}`)}
              style={{ 
                padding: '24px',
                backgroundColor: tokens.colorNeutralBackground1,
                border: `1px solid ${tokens.colorNeutralStroke2}`,
                borderRadius: tokens.borderRadiusMedium,
                boxShadow: tokens.shadow4
              }}
            >
              <div className={styles.cardContent}>
                  <div className={styles.cardTitle}>
                    <Building24Regular fontSize="24px" color={tokens.colorBrandBackground} />
                    <Text size={600} weight="semibold">
                      {scenario.title}
                    </Text>
                  </div>
                  
                  <Text size={300} className={styles.cardDescription}>
                    {scenario.description}
                  </Text>

                  <div className={styles.customerProfile}>
                    <Text size={300} weight="medium" style={{ marginBottom: '4px' }}>
                      Customer Profile
                    </Text>
                    <Text size={200}>
                      {scenario.customer_profile}
                    </Text>
                  </div>

                  <div>
                    <Text size={300} weight="medium" style={{ marginBottom: '8px' }}>
                      Key Requirements
                    </Text>
                    <ul className={styles.requirementsList}>
                      {scenario.requirements.map((req, index) => (
                        <li key={index} className={styles.requirementItem}>
                          <Text size={200}>{req}</Text>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className={styles.solution}>
                    <Text size={300} weight="medium" style={{ marginBottom: '4px' }}>
                      Recommended Solution
                    </Text>
                    <Text size={200}>
                      {scenario.recommended_solution}
                    </Text>
                  </div>

                  <Button
                    appearance="primary"
                    icon={<Play24Regular />}
                    className={styles.actionButton}
                  >
                    Start Scenario
                  </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
