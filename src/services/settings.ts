import type { WebClient } from '../types/slack';
import * as queries from '../db/queries';
import { resolveUserId, resolveConversationId, getUserDisplayName, getChannelDisplayName } from '../slack/resolvers';
import { settingsUpdatedMessage, errorMessage } from '../slack/messages';

export async function setManager(
  client: WebClient,
  userId: string,
  managerMention: string
): Promise<void> {
  const managerUserId = await resolveUserId(client, managerMention);
  if (!managerUserId) {
    await client.chat.postMessage({
      channel: userId,
      blocks: errorMessage(`Could not find user: ${managerMention}`),
    });
    return;
  }

  // Ensure user exists
  const managerName = await getUserDisplayName(client, managerUserId);
  await queries.ensureUser(managerUserId, managerName);

  await queries.updateManager(managerUserId);
  await client.chat.postMessage({
    channel: userId,
    blocks: settingsUpdatedMessage('manager', `<@${managerUserId}>`),
  });
}

export async function setDestination(
  client: WebClient,
  userId: string,
  destinationValue: string
): Promise<void> {
  const resolved = await resolveConversationId(client, destinationValue);
  if (!resolved) {
    await client.chat.postMessage({
      channel: userId,
      blocks: errorMessage(`Could not find channel or user: ${destinationValue}`),
    });
    return;
  }

  await queries.updateDestination(resolved.id);

  const displayName = resolved.type === 'user'
    ? `<@${resolved.id}>`
    : await getChannelDisplayName(client, resolved.id);

  await client.chat.postMessage({
    channel: userId,
    blocks: settingsUpdatedMessage('destination', displayName),
  });
}
