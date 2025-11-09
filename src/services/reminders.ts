import { WebClient } from '@slack/bolt';
import * as queries from '../db/queries';
import { reminderMessage } from '../slack/messages';
import { logEvent } from '../db/queries';

const REMINDER_SENT_MEMORY = new Map<number, Date>(); // chore_id -> last_sent_at

export async function sendReminders(client: WebClient, intervalMinutes: number): Promise<void> {
  const chores = await queries.getOverdueAndImminentChores(intervalMinutes);
  const now = new Date();

  for (const chore of chores) {
    // Avoid spamming - only send reminder if we haven't sent one in the last interval
    const lastSent = REMINDER_SENT_MEMORY.get(chore.id);
    if (lastSent && (now.getTime() - lastSent.getTime()) < intervalMinutes * 60 * 1000) {
      continue;
    }

    try {
      await client.chat.postMessage({
        channel: chore.assignee_user_id,
        blocks: reminderMessage(chore),
      });

      REMINDER_SENT_MEMORY.set(chore.id, now);
      await logEvent('reminder_sent', {
        chore_id: chore.id,
        assignee: chore.assignee_user_id,
        due_at: chore.due_at,
      });
    } catch (error) {
      console.error(`Error sending reminder for chore ${chore.id}:`, error);
      await logEvent('reminder_error', {
        chore_id: chore.id,
        error: String(error),
      });
    }
  }

  // Clean up memory for done chores
  for (const [choreId] of REMINDER_SENT_MEMORY.entries()) {
    const chore = await queries.getChore(choreId);
    if (!chore || chore.status === 'done') {
      REMINDER_SENT_MEMORY.delete(choreId);
    }
  }
}
