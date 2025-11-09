import type { WebClient } from '../types/slack';
import * as queries from '../db/queries';
import { resolveUserId, getUserDisplayName } from '../slack/resolvers';
import { choreAddedMessage, choresListMessage, errorMessage } from '../slack/messages';

export async function addChore(
  client: WebClient,
  userId: string,
  title: string,
  dueAt: Date,
  assigneeMention: string | undefined,
  repeatRule: string | undefined
): Promise<void> {
  let assigneeUserId = userId; // Default to sender

  if (assigneeMention) {
    const resolved = await resolveUserId(client, assigneeMention);
    if (!resolved) {
      await client.chat.postMessage({
        channel: userId,
        blocks: errorMessage(`Could not find user: ${assigneeMention}`),
      });
      return;
    }
    assigneeUserId = resolved;
  }

  // Ensure user exists
  const assigneeName = await getUserDisplayName(client, assigneeUserId);
  await queries.ensureUser(assigneeUserId, assigneeName);
  await queries.ensureUser(userId, await getUserDisplayName(client, userId));

  const chore = await queries.createChore(
    title,
    assigneeUserId,
    dueAt,
    userId,
    repeatRule || null
  );

  await client.chat.postMessage({
    channel: userId,
    blocks: choreAddedMessage(chore.id, title, dueAt, assigneeUserId),
  });
}

export async function listChores(
  client: WebClient,
  userId: string,
  filter: 'mine' | 'all'
): Promise<void> {
  const chores = filter === 'mine'
    ? await queries.getUserChores(userId)
    : await queries.getAllOpenChores();

  // Get display names for all assignees
  const assigneeNames = new Map<string, string>();
  for (const chore of chores) {
    if (!assigneeNames.has(chore.assignee_user_id)) {
      assigneeNames.set(
        chore.assignee_user_id,
        await getUserDisplayName(client, chore.assignee_user_id)
      );
    }
  }

  await client.chat.postMessage({
    channel: userId,
    blocks: choresListMessage(chores, assigneeNames),
  });
}

export async function markDone(
  client: WebClient,
  userId: string,
  choreId: number
): Promise<boolean> {
  const chore = await queries.getChore(choreId);
  if (!chore) {
    await client.chat.postMessage({
      channel: userId,
      blocks: errorMessage(`Chore ${choreId} not found.`),
    });
    return false;
  }

  if (chore.status === 'done') {
    await client.chat.postMessage({
      channel: userId,
      blocks: errorMessage(`Chore ${choreId} is already done.`),
    });
    return false;
  }

  await queries.markChoreDone(choreId);
  await queries.createSubmission(choreId, userId, null, null, 'completed without file');

  // Handle repeat rule
  if (chore.repeat_rule === 'weekly') {
    const nextDue = new Date(chore.due_at);
    nextDue.setDate(nextDue.getDate() + 7);
    await queries.createChore(
      chore.title,
      chore.assignee_user_id,
      nextDue,
      chore.created_by_user_id,
      'weekly'
    );
  }

  // Forward to destination
  await forwardCompletionToDestination(client, chore, userId, false, undefined);

  return true;
}

async function forwardCompletionToDestination(
  client: WebClient,
  chore: queries.Chore,
  submittedByUserId: string,
  hasFile: boolean,
  fileId?: string
): Promise<void> {
  const settings = await queries.getSettings();
  if (!settings.destination_conversation_id) {
    return; // No destination configured
  }

  const assigneeName = await getUserDisplayName(client, chore.assignee_user_id);
  const submittedByName = await getUserDisplayName(client, submittedByUserId);

  const { proofForwardMessage } = await import('../slack/messages');
  const blocks = proofForwardMessage(
    chore.title,
    assigneeName,
    submittedByName,
    new Date(),
    hasFile
  );

  await client.chat.postMessage({
    channel: settings.destination_conversation_id,
    blocks,
  });

  // If file is provided, share it to the destination
  if (hasFile && fileId) {
    try {
      // Share the file to the destination channel
      await client.files.sharedPublicURL({ file: fileId });
      // Post the file separately
      const fileInfo = await client.files.info({ file: fileId });
      if (fileInfo.file?.permalink_public) {
        await client.chat.postMessage({
          channel: settings.destination_conversation_id,
          text: `Proof image: ${chore.title}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Proof Image*`,
              },
              accessory: {
                type: 'image',
                image_url: fileInfo.file.permalink_public,
                alt_text: `Proof for ${chore.title}`,
              },
            },
          ],
        });
      }
    } catch (error) {
      console.error('Error sharing file:', error);
      // Continue - we've already sent the summary
    }
  }
}

export async function handleProofSubmission(
  client: WebClient,
  userId: string,
  fileId: string,
  fileUrl: string | null,
  choreId: number | null
): Promise<void> {
  let targetChoreId = choreId;

  // If no chore ID provided, try to find the user's overdue/open chore
  if (!targetChoreId) {
    const userChores = await queries.getUserChores(userId, 10);
    const overdueChores = userChores.filter(c => new Date(c.due_at) <= new Date());

    if (overdueChores.length === 1) {
      targetChoreId = overdueChores[0].id;
    } else if (overdueChores.length > 1) {
      const { chooseChoreMessage } = await import('../slack/messages');
      await client.chat.postMessage({
        channel: userId,
        blocks: chooseChoreMessage(overdueChores),
      });
      return;
    } else if (userChores.length === 1) {
      targetChoreId = userChores[0].id;
    } else if (userChores.length > 1) {
      const { chooseChoreMessage } = await import('../slack/messages');
      await client.chat.postMessage({
        channel: userId,
        blocks: chooseChoreMessage(userChores),
      });
      return;
    } else {
      await client.chat.postMessage({
        channel: userId,
        blocks: errorMessage('No open chores found. Please specify a chore ID.'),
      });
      return;
    }
  }

  if (!targetChoreId) {
    await client.chat.postMessage({
      channel: userId,
      blocks: errorMessage('Could not determine which chore to mark done.'),
    });
    return;
  }

  const chore = await queries.getChore(targetChoreId);
  if (!chore) {
    await client.chat.postMessage({
      channel: userId,
      blocks: errorMessage(`Chore ${targetChoreId} not found.`),
    });
    return;
  }

  if (chore.status === 'done') {
    await client.chat.postMessage({
      channel: userId,
      blocks: errorMessage(`Chore ${targetChoreId} is already done.`),
    });
    return;
  }

  await queries.markChoreDone(targetChoreId);
  await queries.createSubmission(targetChoreId, userId, fileId, fileUrl, null);

  // Handle repeat rule
  if (chore.repeat_rule === 'weekly') {
    const nextDue = new Date(chore.due_at);
    nextDue.setDate(nextDue.getDate() + 7);
    await queries.createChore(
      chore.title,
      chore.assignee_user_id,
      nextDue,
      chore.created_by_user_id,
      'weekly'
    );
  }

  // Forward to destination with file
  await forwardCompletionToDestination(client, chore, userId, true, fileId);

  await client.chat.postMessage({
    channel: userId,
    blocks: (await import('../slack/messages')).choreDoneMessage(targetChoreId),
  });
}
