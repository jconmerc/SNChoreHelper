import { Block, KnownBlock } from '@slack/bolt';
import { Chore } from '../db/queries';

export function helpMessage(): Block[] {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Chore Bot Commands*\n\n' +
          '• `add "<title>" due YYYY-MM-DD HH:MM for @user [repeat weekly]` - Add a chore\n' +
          '• `list [mine|all]` - List chores (default: mine)\n' +
          '• `done <chore-id>` - Mark a chore as done\n' +
          '• `set manager @user` - Set the house manager\n' +
          '• `set destination #channel` or `set destination @user` - Set destination for proof\n' +
          '• `help` - Show this help message\n\n' +
          'You can also reply to a reminder with "done" and attach a PNG as proof.',
      },
    },
  ];
}

export function choreAddedMessage(choreId: number, title: string, dueAt: Date, assignee: string): Block[] {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `✅ *Chore added*\n\n*ID:* ${choreId}\n*Title:* ${title}\n*Due:* ${formatDate(dueAt)}\n*Assignee:* <@${assignee}>`,
      },
    },
  ];
}

export function choresListMessage(chores: Chore[], assigneeNames: Map<string, string>): Block[] {
  if (chores.length === 0) {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'No open chores found.',
        },
      },
    ];
  }

  const blocks: Block[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Open Chores (${chores.length})*`,
      },
    },
    {
      type: 'divider',
    },
  ];

  for (const chore of chores) {
    const assigneeName = assigneeNames.get(chore.assignee_user_id) || chore.assignee_user_id;
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${chore.id}* - ${chore.title}\n` +
          `Assignee: <@${chore.assignee_user_id}>\n` +
          `Due: ${formatDate(chore.due_at)}`,
      },
    });
  }

  return blocks;
}

export function reminderMessage(chore: Chore): Block[] {
  const isOverdue = new Date(chore.due_at) < new Date();
  const statusText = isOverdue ? '*OVERDUE*' : 'Due soon';

  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🔔 *${statusText}*\n\n*${chore.title}*\n` +
          `Due: ${formatDate(chore.due_at)}\n` +
          `Chore ID: ${chore.id}\n\n` +
          'Reply with a PNG to attach proof, or click the button below.',
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Mark done',
          },
          style: 'primary',
          action_id: 'mark_done',
          value: chore.id.toString(),
        },
      ],
    },
  ];
}

export function choreDoneMessage(choreId: number): Block[] {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `✅ Chore ${choreId} marked as done!`,
      },
    },
  ];
}

export function settingsUpdatedMessage(type: 'manager' | 'destination', value: string): Block[] {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `✅ Settings updated: ${type} set to ${value}`,
      },
    },
  ];
}

export function errorMessage(text: string): Block[] {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `❌ ${text}`,
      },
    },
  ];
}

export function proofForwardMessage(
  choreTitle: string,
  assigneeName: string,
  submittedByName: string,
  submittedAt: Date,
  hasFile: boolean
): Block[] {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `✅ *Chore Completed*\n\n` +
          `*Title:* ${choreTitle}\n` +
          `*Assignee:* ${assigneeName}\n` +
          `*Completed by:* ${submittedByName}\n` +
          `*Completed at:* ${formatDate(submittedAt)}\n` +
          (hasFile ? `*Proof:* Attached below` : ''),
      },
    },
  ];
}

export function chooseChoreMessage(chores: Chore[]): Block[] {
  const blocks: Block[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'Multiple open chores found. Please specify which one:\n\n' +
          chores.map(c => `*${c.id}* - ${c.title} (due ${formatDate(c.due_at)})`).join('\n'),
      },
    },
  ];
  return blocks;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
