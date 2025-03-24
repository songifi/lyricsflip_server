import { EntityRepository, Repository } from 'typeorm';
import { NotificationPreference } from './notification-preference.entity';
import { NotificationType, NotificationChannel } from './notification.entity';

@EntityRepository(NotificationPreference)
export class NotificationPreferenceRepository extends Repository<NotificationPreference> {
  /**
   * Find user preferences
   */
  async findUserPreferences(userId: string): Promise<NotificationPreference[]> {
    return this.find({
      where: { userId },
      order: { type: 'ASC' }
    });
  }
  
  /**
   * Find preference for a specific notification type
   */
  async findUserPreferenceByType(
    userId: string,
    type: NotificationType
  ): Promise<NotificationPreference | undefined> {
    return this.findOne({
      where: { userId, type }
    });
  }
  
  /**
   * Check if a notification type is enabled for a user and channel
   */
  async isEnabled(
    userId: string,
    type: NotificationType,
    channel: NotificationChannel
  ): Promise<boolean> {
    const preference = await this.findOne({
      where: { userId, type }
    });
    
    if (!preference) {
      // Default to enabled if no preference is set
      return true;
    }
    
    return preference.enabled && preference.enabledChannels.includes(channel);
  }
  
  /**
   * Check if current time is within quiet hours for a user
   */
  async isInQuietHours(userId: string): Promise<boolean> {
    // Get the first preference with quiet hours set
    // (assuming quiet hours are the same for all notification types)
    const preference = await this.findOne({
      where: { userId },
      andWhere: [
        { quietHoursStart: Not(IsNull()) },
        { quietHoursEnd: Not(IsNull()) }
      ]
    });
    
    if (!preference || !preference.quietHoursStart || !preference.quietHoursEnd) {
      return false;
    }
    
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // If quiet hours span overnight (e.g., 22:00 to 07:00)
    if (preference.quietHoursStart > preference.quietHoursEnd) {
      return currentTime >= preference.quietHoursStart || currentTime <= preference.quietHoursEnd;
    }
    
    // Normal case (e.g., 23:00 to 07:00)
    return currentTime >= preference.quietHoursStart && currentTime <= preference.quietHoursEnd;
  }
  
  /**
   * Create default preferences for a user
   */
  async createDefaultPreferences(userId: string): Promise<NotificationPreference[]> {
    const defaultPreferences = [
      {
        userId,
        type: NotificationType.NEW_FOLLOWER,
        enabled: true,
        enabledChannels: [
          NotificationChannel.IN_APP,
          NotificationChannel.PUSH,
          NotificationChannel.EMAIL
        ],
        emailDigest: true,
        digestFrequency: 'daily'
      },
      {
        userId,
        type: NotificationType.NEW_LIKE,
        enabled: true,
        enabledChannels: [
          NotificationChannel.IN_APP,
          NotificationChannel.PUSH
        ],
        emailDigest: true,
        digestFrequency: 'daily'
      },
      {
        userId,
        type: NotificationType.NEW_COMMENT,
        enabled: true,
        enabledChannels: [
          NotificationChannel.IN_APP,
          NotificationChannel.PUSH,
          NotificationChannel.EMAIL
        ],
        emailDigest: true,
        digestFrequency: 'daily'
      },
      {
        userId,
        type: NotificationType.MENTION,
        enabled: true,
        enabledChannels: [
          NotificationChannel.IN_APP,
          NotificationChannel.PUSH,
          NotificationChannel.EMAIL
        ],
        emailDigest: true,
        digestFrequency: 'daily'
      },
      {
        userId,
        type: NotificationType.NEW_MESSAGE,
        enabled: true,
        enabledChannels: [
          NotificationChannel.IN_APP,
          NotificationChannel.PUSH,
          NotificationChannel.EMAIL
        ],
        emailDigest: false,
        digestFrequency: 'never'
      },
      {
        userId,
        type: NotificationType.FRIEND_REQUEST,
        enabled: true,
        enabledChannels: [
          NotificationChannel.IN_APP,
          NotificationChannel.PUSH,
          NotificationChannel.EMAIL
        ],
        emailDigest: true,
        digestFrequency: 'daily'
      },
      {
        userId,
        type: NotificationType.FRIEND_ACCEPT,
        enabled: true,
        enabledChannels: [
          NotificationChannel.IN_APP,
          NotificationChannel.PUSH
        ],
        emailDigest: true,
        digestFrequency: 'daily'
      },
      {
        userId,
        type: NotificationType.SYSTEM,
        enabled: true,
        enabledChannels: [
          NotificationChannel.IN_APP,
          NotificationChannel.EMAIL
        ],
        emailDigest: false,
        digestFrequency: 'never'
      }
    ];
    
    // Save all preferences
    return this.save(defaultPreferences);
  }
}

// Make TypeORM operators available
import { Not, IsNull } from 'typeorm';
