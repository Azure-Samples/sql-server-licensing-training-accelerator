import { useState } from 'react';
import {
  Card,
  CardHeader,
  Text,
  Button,
  Input,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { Search24Regular, ArrowDownload24Regular, QuestionCircle24Regular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('24px'),
  },
  header: {
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
  content: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    ...shorthands.gap('24px'),
    '@media (max-width: 1024px)': {
      gridTemplateColumns: '1fr',
    },
  },
  faqSection: {
    ...shorthands.padding('24px'),
  },
  resourcesSection: {
    ...shorthands.padding('24px'),
  },
  resourceCard: {
    ...shorthands.padding('16px'),
    marginBottom: '16px',
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
    ':hover': {
      transform: 'translateY(-1px)',
    },
  },
  resourceTitle: {
    marginBottom: '8px',
  },
  resourceDescription: {
    color: tokens.colorNeutralForeground2,
    marginBottom: '12px',
  },
  downloadButton: {
    width: '100%',
  },
});

const faqData = [
  {
    id: 'licensing-models',
    question: 'What are the main SQL Server licensing models?',
    answer: 'SQL Server offers two primary licensing models: Per-Core licensing (based on the number of physical cores) and Server + CAL licensing (server license plus Client Access Licenses). Per-Core is typically better for high-user environments, while Server + CAL works well for smaller user counts.',
  },
  {
    id: 'minimum-cores',
    question: 'What is the minimum core requirement for Per-Core licensing?',
    answer: 'SQL Server Per-Core licensing requires a minimum of 4 cores per processor, regardless of the actual number of physical cores. This means you will be charged for at least 4 cores even if your processor has fewer.',
  },
  {
    id: 'azure-hybrid-benefit',
    question: 'How does Azure Hybrid Benefit work?',
    answer: 'Azure Hybrid Benefit allows you to use your existing on-premises SQL Server licenses with Software Assurance to get discounted rates on Azure SQL Database, SQL Managed Instance, and SQL Server on Azure VMs.',
  },
  {
    id: 'software-assurance',
    question: 'What is Software Assurance and is it required?',
    answer: 'Software Assurance (SA) is an optional maintenance program that provides version upgrades, support, and other benefits. It typically costs 25% of the license price annually. SA is required for Azure Hybrid Benefit and some virtualization rights.',
  },
  {
    id: 'virtualization',
    question: 'How does licensing work in virtualized environments?',
    answer: 'Standard Edition allows you to run one virtual instance per license. Enterprise Edition with SA provides unlimited virtualization rights, allowing you to run unlimited virtual instances on a licensed server.',
  },
  {
    id: 'cal-types',
    question: 'What are the different types of CALs?',
    answer: 'There are User CALs (assigned to specific users) and Device CALs (assigned to specific devices). Choose User CALs when users access from multiple devices, and Device CALs when multiple users share devices.',
  },
];

const resources = [
  {
    id: 'licensing-guide',
    title: 'SQL Server Licensing Quick Reference',
    description: 'Comprehensive guide covering all licensing models and scenarios',
    type: 'PDF',
    size: '2.1 MB',
  },
  {
    id: 'cost-calculator-template',
    title: 'Cost Calculator Spreadsheet',
    description: 'Excel template for calculating licensing costs offline',
    type: 'XLSX',
    size: '156 KB',
  },
  {
    id: 'azure-pricing-guide',
    title: 'Azure SQL Pricing Comparison',
    description: 'Compare pricing between different Azure SQL options',
    type: 'PDF',
    size: '1.8 MB',
  },
  {
    id: 'licensing-flowchart',
    title: 'Licensing Decision Flowchart',
    description: 'Visual guide to help choose the right licensing model',
    type: 'PDF',
    size: '892 KB',
  },
];

export function FAQ() {
  const styles = useStyles();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFAQ = faqData.filter(
    (item) =>
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownload = (resourceId: string) => {
    console.log(`Downloading resource: ${resourceId}`);
    alert(`Download started for ${resources.find(r => r.id === resourceId)?.title}`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Text size={800} weight="bold">
          FAQ & Resources
        </Text>
        <Text size={400} style={{ display: 'block', marginTop: '4px' }}>
          Quick answers and downloadable reference materials for SQL Server licensing
        </Text>
      </div>

      <div className={styles.searchContainer}>
        <Input
          className={styles.searchInput}
          placeholder="Search FAQ..."
          value={searchTerm}
          onChange={(_, data) => setSearchTerm(data.value)}
          contentBefore={<Search24Regular />}
        />
        <Button appearance="primary">Search</Button>
      </div>

      <div className={styles.content}>
        <Card className={styles.faqSection}>
          <CardHeader>
            <Text size={600} weight="semibold">
              Frequently Asked Questions
            </Text>
          </CardHeader>
          
          <Accordion multiple collapsible>
            {filteredFAQ.map((item) => (
              <AccordionItem key={item.id} value={item.id}>
                <AccordionHeader>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <QuestionCircle24Regular />
                    <Text size={400} weight="medium">
                      {item.question}
                    </Text>
                  </div>
                </AccordionHeader>
                <AccordionPanel>
                  <Text size={300}>
                    {item.answer}
                  </Text>
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>

          {filteredFAQ.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <Text size={400}>No FAQ items match your search.</Text>
            </div>
          )}
        </Card>

        <Card className={styles.resourcesSection}>
          <CardHeader>
            <Text size={600} weight="semibold">
              Download Resources
            </Text>
          </CardHeader>
          
          {resources.map((resource) => (
            <Card key={resource.id} className={styles.resourceCard}>
              <div>
                <Text size={400} weight="medium" className={styles.resourceTitle}>
                  {resource.title}
                </Text>
                <Text size={300} className={styles.resourceDescription}>
                  {resource.description}
                </Text>
                <Text size={200} style={{ marginBottom: '12px', color: tokens.colorNeutralForeground2 }}>
                  {resource.type} • {resource.size}
                </Text>
                <Button
                  appearance="primary"
                  icon={<ArrowDownload24Regular />}
                  className={styles.downloadButton}
                  size="small"
                  onClick={() => handleDownload(resource.id)}
                >
                  Download
                </Button>
              </div>
            </Card>
          ))}
        </Card>
      </div>
    </div>
  );
}
