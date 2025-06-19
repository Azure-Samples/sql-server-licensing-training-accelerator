import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,

  Text,
  Button,
  Input,
  Textarea,
  Dropdown,
  Option,
  DataGrid,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridBody,
  DataGridRow,
  DataGridCell,
  TableColumnDefinition,
  createTableColumn,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogContent,
  DialogBody,
  DialogActions,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { Add24Regular, Edit24Regular, Delete24Regular, Settings24Regular } from '@fluentui/react-icons';
import { apiService } from '../services/api';
import type { Topic } from '../types';

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
  tabsContainer: {
    display: 'flex',
    ...shorthands.gap('8px'),
    marginBottom: '24px',
  },
  tab: {
    ...shorthands.padding('8px', '16px'),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    backgroundColor: tokens.colorNeutralBackground1,
    cursor: 'pointer',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground2,
    },
  },
  activeTab: {
    backgroundColor: tokens.colorBrandBackground,
    color: 'white',
    ':hover': {
      backgroundColor: tokens.colorBrandBackground,
    },
  },
  contentCard: {
    ...shorthands.padding('24px'),
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    ...shorthands.gap('16px'),
    marginBottom: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
  },
  fullWidth: {
    gridColumn: '1 / -1',
  },
  actions: {
    display: 'flex',
    ...shorthands.gap('12px'),
    justifyContent: 'flex-end',
    marginTop: '16px',
  },
  dataGrid: {
    minHeight: '400px',
  },
});

type AdminTab = 'topics' | 'scenarios' | 'pricing' | 'analytics';

export function Admin() {
  const styles = useStyles();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AdminTab>('topics');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Topic | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    tags: '',
    difficulty: 'Beginner',
    estimated_time: 15,
  });

  const { data: topicsData } = useQuery({
    queryKey: ['topics'],
    queryFn: () => apiService.getTopics(),
  });

  const createTopicMutation = useMutation({
    mutationFn: (data: any) => {
      console.log('Creating topic:', data);
      return Promise.resolve(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const updateTopicMutation = useMutation({
    mutationFn: (data: any) => {
      console.log('Updating topic:', data);
      return Promise.resolve(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const deleteTopicMutation = useMutation({
    mutationFn: (id: string) => {
      console.log('Deleting topic:', id);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      content: '',
      tags: '',
      difficulty: 'Beginner',
      estimated_time: 15,
    });
    setEditingItem(null);
  };

  const handleEdit = (topic: Topic) => {
    setEditingItem(topic);
    setFormData({
      title: topic.title,
      description: topic.description,
      content: topic.content,
      tags: topic.tags.join(', '),
      difficulty: topic.difficulty,
      estimated_time: topic.estimated_time,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    const topicData = {
      ...formData,
      tags: formData.tags.split(',').map(tag => tag.trim()),
    };

    if (editingItem) {
      updateTopicMutation.mutate({ ...topicData, id: editingItem.id });
    } else {
      createTopicMutation.mutate({ ...topicData, id: Date.now().toString() });
    }
  };

  const columns: TableColumnDefinition<Topic>[] = [
    createTableColumn<Topic>({
      columnId: 'title',
      compare: (a, b) => a.title.localeCompare(b.title),
      renderHeaderCell: () => 'Title',
      renderCell: (item) => item.title,
    }),
    createTableColumn<Topic>({
      columnId: 'difficulty',
      compare: (a, b) => a.difficulty.localeCompare(b.difficulty),
      renderHeaderCell: () => 'Difficulty',
      renderCell: (item) => item.difficulty,
    }),
    createTableColumn<Topic>({
      columnId: 'estimated_time',
      compare: (a, b) => a.estimated_time - b.estimated_time,
      renderHeaderCell: () => 'Time (min)',
      renderCell: (item) => item.estimated_time.toString(),
    }),
    createTableColumn<Topic>({
      columnId: 'actions',
      renderHeaderCell: () => 'Actions',
      renderCell: (item) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            appearance="subtle"
            icon={<Edit24Regular />}
            size="small"
            onClick={() => handleEdit(item)}
          />
          <Button
            appearance="subtle"
            icon={<Delete24Regular />}
            size="small"
            onClick={() => deleteTopicMutation.mutate(item.id)}
          />
        </div>
      ),
    }),
  ];

  const tabs = [
    { id: 'topics' as AdminTab, label: 'Topics', icon: Settings24Regular },
    { id: 'scenarios' as AdminTab, label: 'Scenarios', icon: Settings24Regular },
    { id: 'pricing' as AdminTab, label: 'Pricing', icon: Settings24Regular },
    { id: 'analytics' as AdminTab, label: 'Analytics', icon: Settings24Regular },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <Text size={800} weight="bold">
            Admin Console
          </Text>
          <Text size={400} style={{ display: 'block', marginTop: '4px' }}>
            Manage content, pricing, and view analytics
          </Text>
        </div>
      </div>

      <div className={styles.tabsContainer}>
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            appearance="subtle"
            className={`${styles.tab} ${activeTab === tab.id ? styles.activeTab : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <Card className={styles.contentCard}>
        {activeTab === 'topics' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <Text size={600} weight="semibold">
                Manage Topics
              </Text>
              <Dialog open={isDialogOpen} onOpenChange={(_, data) => setIsDialogOpen(data.open)}>
                <DialogTrigger disableButtonEnhancement>
                  <Button
                    appearance="primary"
                    icon={<Add24Regular />}
                    onClick={() => {
                      resetForm();
                      setIsDialogOpen(true);
                    }}
                  >
                    Add Topic
                  </Button>
                </DialogTrigger>
                <DialogSurface>
                  <DialogTitle>{editingItem ? 'Edit Topic' : 'Add New Topic'}</DialogTitle>
                  <DialogContent>
                    <DialogBody>
                      <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                          <Text size={300} weight="medium">Title</Text>
                          <Input
                            value={formData.title}
                            onChange={(_, data) => setFormData(prev => ({ ...prev, title: data.value }))}
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <Text size={300} weight="medium">Difficulty</Text>
                          <Dropdown
                            value={formData.difficulty}
                            onOptionSelect={(_, data) => setFormData(prev => ({ ...prev, difficulty: data.optionValue || 'Beginner' }))}
                          >
                            <Option value="Beginner">Beginner</Option>
                            <Option value="Intermediate">Intermediate</Option>
                            <Option value="Advanced">Advanced</Option>
                          </Dropdown>
                        </div>
                        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                          <Text size={300} weight="medium">Description</Text>
                          <Input
                            value={formData.description}
                            onChange={(_, data) => setFormData(prev => ({ ...prev, description: data.value }))}
                          />
                        </div>
                        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                          <Text size={300} weight="medium">Content (Markdown)</Text>
                          <Textarea
                            rows={8}
                            value={formData.content}
                            onChange={(_, data) => setFormData(prev => ({ ...prev, content: data.value }))}
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <Text size={300} weight="medium">Tags (comma-separated)</Text>
                          <Input
                            value={formData.tags}
                            onChange={(_, data) => setFormData(prev => ({ ...prev, tags: data.value }))}
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <Text size={300} weight="medium">Estimated Time (minutes)</Text>
                          <Input
                            type="number"
                            value={formData.estimated_time.toString()}
                            onChange={(_, data) => setFormData(prev => ({ ...prev, estimated_time: parseInt(data.value) || 15 }))}
                          />
                        </div>
                      </div>
                    </DialogBody>
                    <DialogActions>
                      <Button appearance="secondary" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button appearance="primary" onClick={handleSubmit}>
                        {editingItem ? 'Update' : 'Create'}
                      </Button>
                    </DialogActions>
                  </DialogContent>
                </DialogSurface>
              </Dialog>
            </div>

            <DataGrid
              items={topicsData?.topics || []}
              columns={columns}
              sortable
              className={styles.dataGrid}
            >
              <DataGridHeader>
                <DataGridRow>
                  {({ renderHeaderCell }) => (
                    <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                  )}
                </DataGridRow>
              </DataGridHeader>
              <DataGridBody<Topic>>
                {({ item, rowId }) => (
                  <DataGridRow<Topic> key={rowId}>
                    {({ renderCell }) => (
                      <DataGridCell>{renderCell(item)}</DataGridCell>
                    )}
                  </DataGridRow>
                )}
              </DataGridBody>
            </DataGrid>
          </div>
        )}

        {activeTab === 'scenarios' && (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <Text size={500}>Scenario Management</Text>
            <Text size={300} style={{ display: 'block', marginTop: '8px' }}>
              Scenario management interface would be implemented here.
            </Text>
          </div>
        )}

        {activeTab === 'pricing' && (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <Text size={500}>Pricing Management</Text>
            <Text size={300} style={{ display: 'block', marginTop: '8px' }}>
              Pricing configuration interface would be implemented here.
            </Text>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <Text size={500}>Analytics Dashboard</Text>
            <Text size={300} style={{ display: 'block', marginTop: '8px' }}>
              Usage analytics and reporting would be displayed here.
            </Text>
          </div>
        )}
      </Card>
    </div>
  );
}
