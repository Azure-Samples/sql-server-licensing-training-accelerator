import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Card,
  CardHeader,
  Text,
  Button,
  Input,
  Dropdown,
  Option,
  Switch,
  Spinner,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { Calculator24Regular, Save24Regular } from '@fluentui/react-icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiService } from '../services/api';
import type { CostModelRequest, CostModelResponse } from '../types';

const useStyles = makeStyles({
  container: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    ...shorthands.gap('24px'),
    '@media (max-width: 1024px)': {
      gridTemplateColumns: '1fr',
    },
  },
  formCard: {
    ...shorthands.padding('24px'),
  },
  resultsCard: {
    ...shorthands.padding('24px'),
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
    marginBottom: '16px',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    ...shorthands.gap('16px'),
  },
  switchGroup: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('12px'),
    marginBottom: '16px',
  },
  submitButton: {
    width: '100%',
    marginTop: '16px',
  },
  resultSection: {
    marginBottom: '24px',
  },
  costDisplay: {
    textAlign: 'center',
    ...shorthands.padding('24px'),
    backgroundColor: tokens.colorBrandBackground2,
    ...shorthands.borderRadius('8px'),
    marginBottom: '24px',
  },
  chartContainer: {
    height: '300px',
    marginBottom: '24px',
  },
  notesSection: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.padding('16px'),
    ...shorthands.borderRadius('8px'),
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '200px',
  },
});

export function Calculator() {
  const styles = useStyles();
  
  const [formData, setFormData] = useState<CostModelRequest>({
    workload_type: 'OnPrem',
    edition: 'Standard',
    license_model: 'PerCore',
    core_count: 4,
    user_count: undefined,
    include_sa: true,
    term_years: 3,
  });

  const calculateMutation = useMutation({
    mutationFn: (data: CostModelRequest) => apiService.calculateCost(data),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    calculateMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof CostModelRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getChartData = (result: CostModelResponse) => {
    return result.annual_breakdown.map((cost, index) => ({
      year: `Year ${index + 1}`,
      cost: cost,
    }));
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Text size={800} weight="bold">
          SQL Server Licensing Cost Calculator
        </Text>
        <Text size={400} style={{ display: 'block', marginTop: '4px' }}>
          Calculate licensing costs for different scenarios and workloads
        </Text>
      </div>

      <div className={styles.container}>
        <Card className={styles.formCard}>
          <CardHeader>
            <Text size={600} weight="semibold">
              Configuration
            </Text>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <Text size={300} weight="medium">Workload Type</Text>
              <Dropdown
                value={formData.workload_type}
                onOptionSelect={(_, data) => handleInputChange('workload_type', data.optionValue)}
                style={{ zIndex: 1100 }}
              >
                <Option value="OnPrem">On-Premises</Option>
                <Option value="AzureVM">Azure Virtual Machine</Option>
                <Option value="AzureSQLMI">Azure SQL Managed Instance</Option>
              </Dropdown>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <Text size={300} weight="medium">Edition</Text>
                <Dropdown
                  value={formData.edition}
                  onOptionSelect={(_, data) => handleInputChange('edition', data.optionValue)}
                  style={{ zIndex: 1099 }}
                >
                  <Option value="Standard">Standard</Option>
                  <Option value="Enterprise">Enterprise</Option>
                </Dropdown>
              </div>

              <div className={styles.formGroup}>
                <Text size={300} weight="medium">License Model</Text>
                <Dropdown
                  value={formData.license_model}
                  onOptionSelect={(_, data) => handleInputChange('license_model', data.optionValue)}
                  style={{ zIndex: 1098 }}
                >
                  <Option value="PerCore">Per-Core</Option>
                  <Option value="ServerCAL">Server + CAL</Option>
                </Dropdown>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <Text size={300} weight="medium">Core Count</Text>
                <Input
                  type="number"
                  value={formData.core_count.toString()}
                  onChange={(_, data) => handleInputChange('core_count', parseInt(data.value) || 4)}
                  min={1}
                />
              </div>

              {formData.license_model === 'ServerCAL' && (
                <div className={styles.formGroup}>
                  <Text size={300} weight="medium">User Count</Text>
                  <Input
                    type="number"
                    value={formData.user_count?.toString() || ''}
                    onChange={(_, data) => handleInputChange('user_count', parseInt(data.value) || undefined)}
                    min={1}
                  />
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <Text size={300} weight="medium">Term (Years)</Text>
              <Input
                type="number"
                value={formData.term_years.toString()}
                onChange={(_, data) => handleInputChange('term_years', parseInt(data.value) || 3)}
                min={1}
                max={10}
              />
            </div>

            <div className={styles.switchGroup}>
              <Switch
                checked={formData.include_sa}
                onChange={(_, data) => handleInputChange('include_sa', data.checked)}
              />
              <Text size={300}>Include Software Assurance (25%)</Text>
            </div>

            <Button
              type="submit"
              appearance="primary"
              icon={<Calculator24Regular />}
              className={styles.submitButton}
              disabled={calculateMutation.isPending}
            >
              {calculateMutation.isPending ? 'Calculating...' : 'Calculate Cost'}
            </Button>
          </form>
        </Card>

        <Card className={styles.resultsCard}>
          <CardHeader>
            <Text size={600} weight="semibold">
              Results
            </Text>
          </CardHeader>

          {calculateMutation.isPending && (
            <div className={styles.loadingContainer}>
              <Spinner size="large" label="Calculating costs..." />
            </div>
          )}

          {calculateMutation.error && (
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <Text size={400} style={{ color: tokens.colorPaletteRedForeground1 }}>
                Error calculating costs. Please check your inputs and try again.
              </Text>
            </div>
          )}

          {calculateMutation.data && (
            <div>
              <div className={styles.costDisplay}>
                <Text size={900} weight="bold" style={{ color: 'white' }}>
                  {formatCurrency(calculateMutation.data.total_cost)}
                </Text>
                <Text size={400} style={{ display: 'block', marginTop: '4px', color: 'white' }}>
                  Total {formData.term_years}-Year Cost
                </Text>
                {calculateMutation.data.cost_per_user && (
                  <Text size={300} style={{ display: 'block', marginTop: '8px', color: 'white' }}>
                    {formatCurrency(calculateMutation.data.cost_per_user)} per user
                  </Text>
                )}
              </div>

              <div className={styles.chartContainer}>
                <Text size={500} weight="medium" style={{ marginBottom: '16px' }}>
                  Annual Cost Breakdown
                </Text>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getChartData(calculateMutation.data)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(value) => [formatCurrency(value as number), 'Cost']} />
                    <Bar dataKey="cost" fill={tokens.colorBrandBackground} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className={styles.notesSection}>
                <Text size={400} weight="medium" style={{ marginBottom: '8px' }}>
                  Notes & Recommendations
                </Text>
                <Text size={300}>
                  {calculateMutation.data.notes}
                </Text>
              </div>

              <Button
                appearance="secondary"
                icon={<Save24Regular />}
                style={{ marginTop: '16px', width: '100%' }}
                onClick={() => {
                  const csvContent = `Year,Cost\n${getChartData(calculateMutation.data!).map(d => `${d.year},${d.cost}`).join('\n')}`;
                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'sql-licensing-cost-breakdown.csv';
                  a.click();
                }}
              >
                Export Results
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
