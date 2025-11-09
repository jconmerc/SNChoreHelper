export interface ParsedCommand {
  action: 'add' | 'list' | 'done' | 'set' | 'help';
  title?: string;
  dueAt?: Date;
  assignee?: string;
  repeatRule?: string;
  choreId?: number;
  listFilter?: 'mine' | 'all';
  setType?: 'manager' | 'destination';
  setValue?: string;
}

export function parseCommand(text: string): ParsedCommand | null {
  const trimmed = text.trim().toLowerCase();

  if (!trimmed || trimmed === 'help') {
    return { action: 'help' };
  }

  // List command
  if (trimmed.startsWith('list')) {
    const parts = trimmed.split(/\s+/);
    if (parts[1] === 'mine') {
      return { action: 'list', listFilter: 'mine' };
    } else if (parts[1] === 'all') {
      return { action: 'list', listFilter: 'all' };
    }
    return { action: 'list', listFilter: 'mine' };
  }

  // Done command
  if (trimmed.startsWith('done')) {
    const match = trimmed.match(/done\s+(\d+)/);
    if (match) {
      return { action: 'done', choreId: parseInt(match[1], 10) };
    }
    return { action: 'done' };
  }

  // Set command
  if (trimmed.startsWith('set')) {
    const match = trimmed.match(/set\s+(manager|destination)\s+(.+)/);
    if (match) {
      return {
        action: 'set',
        setType: match[1] as 'manager' | 'destination',
        setValue: match[2].trim(),
      };
    }
  }

  // Add command
  if (trimmed.startsWith('add')) {
    return parseAddCommand(text);
  }

  return null;
}

function parseAddCommand(text: string): ParsedCommand | null {
  // Try to extract quoted title
  const quotedTitleMatch = text.match(/add\s+"([^"]+)"/i);
  let title: string | undefined;
  let remainingText: string;

  if (quotedTitleMatch) {
    title = quotedTitleMatch[1];
    remainingText = text.substring(quotedTitleMatch[0].length).trim();
  } else {
    // No quotes, take until "due"
    const dueIndex = text.toLowerCase().indexOf(' due ');
    if (dueIndex === -1) {
      return null;
    }
    title = text.substring(4, dueIndex).trim();
    remainingText = text.substring(dueIndex + 5).trim();
  }

  // Parse due date
  const dueMatch = remainingText.match(/due\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/i);
  if (!dueMatch) {
    return null;
  }

  const dueAt = parseDate(dueMatch[1]);
  if (!dueAt) {
    return null;
  }

  remainingText = remainingText.substring(dueMatch[0].length).trim();

  // Parse assignee (for @user)
  let assignee: string | undefined;
  const assigneeMatch = remainingText.match(/for\s+@(\w+)/i);
  if (assigneeMatch) {
    assignee = assigneeMatch[1];
    remainingText = remainingText.substring(assigneeMatch[0].length).trim();
  }

  // Parse repeat rule
  let repeatRule: string | undefined;
  const repeatMatch = remainingText.match(/repeat\s+(\w+)/i);
  if (repeatMatch) {
    repeatRule = repeatMatch[1];
  }

  return {
    action: 'add',
    title,
    dueAt,
    assignee,
    repeatRule,
  };
}

function parseDate(dateStr: string): Date | null {
  // Expected format: YYYY-MM-DD HH:MM
  const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match;
  const date = new Date(
    parseInt(year, 10),
    parseInt(month, 10) - 1,
    parseInt(day, 10),
    parseInt(hour, 10),
    parseInt(minute, 10)
  );

  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export function extractChoreIdFromText(text: string): number | null {
  const match = text.match(/done\s+(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}
