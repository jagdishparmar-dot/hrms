export interface AnnouncementItem {
  id: number;
  title: string;
  description: string;
  timestamp: string;
  category: string;
  icon:
    | 'campaign'
    | 'event-note'
    | 'notifications-active'
    | 'info';
  isUnread?: boolean;
}

export interface DocumentResource {
  id: number;
  title: string;
  fileSize: string;
  category: string;
}

export const SAMPLE_UPDATES: AnnouncementItem[] = [
  {
    id: 1,
    title: 'Office Attendance Policy Reminder',
    description:
      'Please ensure check-ins are recorded within 500m office geofence range before 09:30 AM.',
    timestamp: 'Today • 08:30 AM',
    category: 'HR Policy',
    icon: 'campaign',
    isUnread: true,
  },
  {
    id: 2,
    title: 'Upcoming Public Holiday Notice',
    description:
      'Office will remain closed on Friday, August 15 for Independence Day. Enjoy your long weekend!',
    timestamp: 'Yesterday • 04:15 PM',
    category: 'Holiday',
    icon: 'event-note',
  },
  {
    id: 3,
    title: 'System Update Completed',
    description:
      'New automatic check-out notification features are now enabled on your mobile device.',
    timestamp: 'July 20 • 11:00 AM',
    category: 'App Feature',
    icon: 'notifications-active',
  },
  {
    id: 4,
    title: 'Monthly Townhall Session',
    description:
      'All design & product intern syncs scheduled for Thursday at 03:00 PM in Conference Room A.',
    timestamp: 'July 18 • 02:00 PM',
    category: 'Event',
    icon: 'info',
  },
];

export const SAMPLE_DOCUMENTS: DocumentResource[] = [
  { id: 1, title: 'Employee Handbook 2026.pdf', fileSize: '2.4 MB', category: 'Policy' },
  { id: 2, title: 'IT & Remote Security Policy.pdf', fileSize: '1.1 MB', category: 'IT Security' },
  { id: 3, title: 'Health Insurance Claim Form.pdf', fileSize: '850 KB', category: 'Benefits' },
  { id: 4, title: 'Internship Evaluation Guidelines.pdf', fileSize: '1.8 MB', category: 'Training' },
];

export const LEAVE_BALANCES = [
  { title: 'Casual Leave', remaining: '8 / 12', icon: 'beach-access' as const, color: '#3498DB' },
  { title: 'Sick Leave', remaining: '6 / 7', icon: 'medical-services' as const, color: '#E74C3C' },
  { title: 'Earned Leave', remaining: '10 / 15', icon: 'folder-shared' as const, color: '#F5A623' },
];
