import { App } from '@slack/bolt';
import * as choresService from '../services/chores';
import { choreDoneMessage, errorMessage } from '../slack/messages';

export function setupActionHandlers(app: App): void {
  app.action('mark_done', async ({ action, ack, client, respond, body }) => {
    await ack();

    if (!('value' in action)) {
      await respond({
        blocks: errorMessage('Invalid action.'),
      });
      return;
    }

    const choreId = parseInt(action.value as string, 10);
    const userId = (body as any).user.id;

    const success = await choresService.markDone(client, userId, choreId);
    if (success) {
      await respond({
        blocks: choreDoneMessage(choreId),
        replace_original: true,
      });
    }
  });
}
