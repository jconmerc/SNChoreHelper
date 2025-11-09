import { App } from '@slack/bolt';
import express from 'express';
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

const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

// Setup handlers
setupMessageHandlers(slackApp);
setupSlashHandlers(slackApp);
setupActionHandlers(slackApp);

// Start reminder job
const reminderIntervalMinutes = parseInt(process.env.REMINDER_INTERVAL_MINUTES || '15', 10);
startReminderJob(slackApp, reminderIntervalMinutes);

// Create Express app for health checks (required by Render)
const httpApp = express();
const PORT = process.env.PORT || 3000;

httpApp.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'chorebot' });
});

httpApp.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    service: 'chorebot',
    message: 'Chore Bot is running. This is a Socket Mode app - no HTTP endpoints needed.'
  });
});

// Start HTTP server for Render health checks
const server = httpApp.listen(PORT, () => {
  console.log(`HTTP server listening on port ${PORT} for health checks`);
});

// Start the Slack app
(async () => {
  try {
    await slackApp.start();
    console.log('⚡️ Chore Bot is running!');
  } catch (error) {
    console.error('Failed to start app:', error);
    process.exit(1);
  }
})();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  server.close(() => {
    console.log('HTTP server closed');
  });
  await slackApp.stop();
  process.exit(0);
});
