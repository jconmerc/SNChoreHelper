import { App } from '@slack/bolt';
import { parseCommand, extractChoreIdFromText } from '../slack/parsing';
import * as choresService from '../services/chores';
import * as settingsService from '../services/settings';
import { helpMessage, errorMessage } from '../slack/messages';
import { ensureUser, getUser } from '../db/queries';
import { getUserDisplayName } from '../slack/resolvers';

export function setupMessageHandlers(app: App): void {
  // Handle DMs
  app.message(async ({ message, client, say }) => {
    // Only handle DMs (message.subtype is undefined for regular messages)
    if (message.subtype || !('user' in message) || !('text' in message)) {
      return;
    }

    const userId = message.user;
    const text = message.text || '';

    // Ensure user exists
    const userInfo = await client.users.info({ user: userId });
    const displayName = userInfo.user?.real_name || userInfo.user?.name || userId;
    await ensureUser(userId, displayName);

    // Check if message has files (PNG proof)
    const files = (message as any).files;
    const hasPngFile = files?.some((f: any) => f.mimetype === 'image/png');

    if (hasPngFile) {
      // Handle proof submission
      const file = files.find((f: any) => f.mimetype === 'image/png');
      const choreId = extractChoreIdFromText(text) || null;
      await choresService.handleProofSubmission(
        client,
        userId,
        file.id,
        file.url_private || null,
        choreId
      );
      return;
    }

    // Parse command
    const parsed = parseCommand(text);
    if (!parsed) {
      await say({
        blocks: errorMessage('Unknown command. Type `help` for available commands.'),
      });
      return;
    }

    switch (parsed.action) {
      case 'help':
        await say({ blocks: helpMessage() });
        break;

      case 'add':
        if (!parsed.title || !parsed.dueAt) {
          await say({
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
        break;

      case 'list':
        await choresService.listChores(client, userId, parsed.listFilter || 'mine');
        break;

      case 'done':
        if (!parsed.choreId) {
          await say({
            blocks: errorMessage('Please specify a chore ID: `done <chore-id>`'),
          });
          return;
        }
        await choresService.markDone(client, userId, parsed.choreId);
        break;

      case 'set':
        if (parsed.setType === 'manager' && parsed.setValue) {
          await settingsService.setManager(client, userId, parsed.setValue);
        } else if (parsed.setType === 'destination' && parsed.setValue) {
          await settingsService.setDestination(client, userId, parsed.setValue);
        } else {
          await say({
            blocks: errorMessage('Invalid set command. Use: `set manager @user` or `set destination #channel`'),
          });
        }
        break;

      default:
        await say({
          blocks: errorMessage('Unknown command. Type `help` for available commands.'),
        });
    }
  });
}
