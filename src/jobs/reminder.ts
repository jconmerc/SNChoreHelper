import cron from 'node-cron';
import { App } from '@slack/bolt';
import * as remindersService from '../services/reminders';

export function startReminderJob(app: App, intervalMinutes: number): void {
  // Run every intervalMinutes
  const cronExpression = `*/${intervalMinutes} * * * *`;

  cron.schedule(cronExpression, async () => {
    console.log(`[Reminder Job] Running at ${new Date().toISOString()}`);
    try {
      await remindersService.sendReminders(app.client, intervalMinutes);
    } catch (error) {
      console.error('[Reminder Job] Error:', error);
    }
  });

  console.log(`[Reminder Job] Started - running every ${intervalMinutes} minutes`);
}
