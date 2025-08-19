import { NotificationService } from '../../services/NotificationService';

// Mock AWS clients
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');
jest.mock('@aws-sdk/client-ses');
jest.mock('../../services/WebSocketService');
jest.mock('../../services/TemplateService');

describe('NotificationService - Simple Tests', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    notificationService = new NotificationService();
  });

  it('should be instantiated', () => {
    expect(notificationService).toBeDefined();
    expect(notificationService).toBeInstanceOf(NotificationService);
  });

  it('should have required methods', () => {
    expect(typeof notificationService.sendNotification).toBe('function');
    expect(typeof notificationService.getUserNotifications).toBe('function');
    expect(typeof notificationService.markNotificationAsRead).toBe('function');
    expect(typeof notificationService.getUserPreferences).toBe('function');
    expect(typeof notificationService.updateUserPreferences).toBe('function');
    expect(typeof notificationService.unsubscribeUser).toBe('function');
    expect(typeof notificationService.notifyProjectMilestone).toBe('function');
    expect(typeof notificationService.notifyStatusChange).toBe('function');
    expect(typeof notificationService.sendBulkNotifications).toBe('function');
  });
});