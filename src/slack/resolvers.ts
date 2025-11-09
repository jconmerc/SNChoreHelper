import { WebClient } from '@slack/bolt';

export async function resolveUserId(client: WebClient, mention: string): Promise<string | null> {
  // Remove @ if present
  const username = mention.replace(/^@/, '');

  try {
    const result = await client.users.list();
    const user = result.members?.find(
      (m) => m.name === username || m.real_name?.toLowerCase() === username.toLowerCase()
    );
    return user?.id || null;
  } catch (error) {
    console.error('Error resolving user:', error);
    return null;
  }
}

export async function resolveChannelId(client: WebClient, channelName: string): Promise<string | null> {
  // Remove # if present
  const name = channelName.replace(/^#/, '');

  try {
    const result = await client.conversations.list({ types: 'public_channel,private_channel' });
    const channel = result.channels?.find(
      (c) => c.name === name
    );
    return channel?.id || null;
  } catch (error) {
    console.error('Error resolving channel:', error);
    return null;
  }
}

export async function resolveConversationId(
  client: WebClient,
  value: string
): Promise<{ type: 'user' | 'channel'; id: string } | null> {
  if (value.startsWith('@')) {
    const userId = await resolveUserId(client, value);
    return userId ? { type: 'user', id: userId } : null;
  } else if (value.startsWith('#')) {
    const channelId = await resolveChannelId(client, value);
    return channelId ? { type: 'channel', id: channelId } : null;
  } else {
    // Try both
    const userId = await resolveUserId(client, value);
    if (userId) return { type: 'user', id: userId };

    const channelId = await resolveChannelId(client, value);
    if (channelId) return { type: 'channel', id: channelId };
  }

  return null;
}

export async function getUserDisplayName(client: WebClient, userId: string): Promise<string> {
  try {
    const result = await client.users.info({ user: userId });
    return result.user?.real_name || result.user?.name || userId;
  } catch (error) {
    console.error('Error getting user display name:', error);
    return userId;
  }
}

export async function getChannelDisplayName(client: WebClient, channelId: string): Promise<string> {
  try {
    const result = await client.conversations.info({ channel: channelId });
    return `#${result.channel?.name || channelId}`;
  } catch (error) {
    console.error('Error getting channel display name:', error);
    return channelId;
  }
}
