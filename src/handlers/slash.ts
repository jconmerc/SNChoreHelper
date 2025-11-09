import { App } from '@slack/bolt';
import { parseCommand } from '../slack/parsing';
import * as choresService from '../services/chores';
import * as settingsService from '../services/settings';
import { helpMessage, errorMessage } from '../slack/messages';
import { ensureUser } from '../db/queries';

export function setupSlashHandlers(app: App): void {
  app.command('/chore', async ({ command, ack, client, respond }) => {
    await ack();

    const userId = command.user_id;
    const text = command.text || '';

    // Ensure user exists
    const userInfo = await client.users.info({ user: userId });
    const displayName = userInfo.user?.real_name || userInfo.user?.name || userId;
    await ensureUser(userId, displayName);

    // If no text, show help
    if (!text.trim()) {
      await respond({ blocks: helpMessage() });
      return;
    }

    // Parse command
    const parsed = parseCommand(text);
    if (!parsed) {
      await respond({
        blocks: errorMessage('Unknown command. Type `help` for available commands.'),
      });
      return;
    }

    switch (parsed.action) {
      case 'help':
        await respond({ blocks: helpMessage() });
        break;

      case 'add':
        if (!parsed.title || !parsed.dueAt) {
          await respond({
            blocks: errorMessage(
              'Invalid format. Expected: `add "<title>" due YYYY-MM-DD HH:MM for @user [repeat weekly]`'
            ),
          });
          return;
        }
        await choresService.addChore(
          client,
          userId,
          parsed.title,
          parsed.dueAt,
          parsed.assignee,
          parsed.repeatRule
        );
        await respond({ text: 'Chore added! Check your DMs for confirmation.' });
        break;

      case 'list':
        await choresService.listChores(client, userId, parsed.listFilter || 'mine');
        await respond({ text: 'Check your DMs for the list.' });
        break;

      case 'done':
        if (!parsed.choreId) {
          await respond({
            blocks: errorMessage('Please specify a chore ID: `done <chore-id>`'),
          });
          return;
        }
        const success = await choresService.markDone(client, userId, parsed.choreId);
        if (success) {
          await respond({ text: 'Chore marked as done!' });
        }
        break;

      case 'set':
        if (parsed.setType === 'manager' && parsed.setValue) {
          await settingsService.setManager(client, userId, parsed.setValue);
          await respond({ text: 'Settings updated! Check your DMs for confirmation.' });
        } else if (parsed.setType === 'destination' && parsed.setValue) {
          await settingsService.setDestination(client, userId, parsed.setValue);
          await respond({ text: 'Settings updated! Check your DMs for confirmation.' });
        } else {
          await respond({
            blocks: errorMessage('Invalid set command. Use: `set manager @user` or `set destination #channel`'),
          });
        }
        break;

      default:
        await respond({
          blocks: errorMessage('Unknown command. Type `help` for available commands.'),
        });
    }
  });
}
