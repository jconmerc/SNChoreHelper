import type { App } from '@slack/bolt';

// Extract WebClient type from App's client property
export type WebClient = App['client'];
