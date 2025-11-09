import { App } from '@slack/bolt';
import dotenv from 'dotenv';
import { setupMessageHandlers } from './handlers/messages';
import { setupSlashHandlers } from './handlers/slash';
import { setupActionHandlers } from './handlers/actions';
import { startReminderJob } from './jobs/reminder';

dotenv.config();

// Validate environment variables
if (!process.env.SLACK_BOT_TOKEN) {
  throw new Error('SLACK_BOT_TOKEN environment variable is required');
}
if (!process.env.SLACK_APP_TOKEN) {
  throw new Error('SLACK_APP_TOKEN environment variable is required');
}

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

// Setup handlers
setupMessageHandlers(app);
setupSlashHandlers(app);
setupActionHandlers(app);

// Start reminder job
const reminderIntervalMinutes = parseInt(process.env.REMINDER_INTERVAL_MINUTES || '15', 10);
startReminderJob(app, reminderIntervalMinutes);

// Start the app
(async () => {
  try {
    await app.start();
    console.log('⚡️ Chore Bot is running!');
  } catch (error) {
    console.error('Failed to start app:', error);
    process.exit(1);
  }
})();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await app.stop();
  process.exit(0);
});
