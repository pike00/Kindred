import re

# Read the current file
with open('frontend/src/client/types.gen.ts', 'r') as f:
    content = f.read()

# Add snooze_count_30d to ReminderPublic type
reminder_public_pattern = r'(export type ReminderPublic = \{[^}]*created_at: string;)'
match = re.search(reminder_public_pattern, content, re.DOTALL)
if match:
    old_block = match.group(1)
    new_block = old_block + '\n    /**\n     * Number of times this reminder has been snoozed in the last 30 days.\n     */\n    snooze_count_30d?: number;'
    content = content.replace(old_block, new_block, 1)

# Add new types after RemindersSnoozeReminderResponse
new_types = '''
/**
 * Snooze history entry for a reminder.
 */
export type SnoozeHistoryEntry = {
    snoozed_at: string;
    snoozed_until: string;
    reason?: (string | null);
};

/**
 * Snooze stats per reminder.
 */
export type SnoozeStatsEntry = {
    reminder_id: string;
    snooze_count: number;
};

/**
 * Chronic snoozer entry.
 */
export type ChronicSnoozerEntry = {
    contact_id: (string | null);
    reminder_id: string;
    snooze_count: number;
};

/**
 * Snooze history response.
 */
export type RemindersGetSnoozeHistoryResponse = Array<SnoozeHistoryEntry>;

/**
 * Snooze stats response.
 */
export type RemindersGetSnoozeStatsResponse = Array<SnoozeStatsEntry>;

/**
 * Chronic snoozers response.
 */
export type RemindersGetChronicSnoozersResponse = Array<ChronicSnoozerEntry>;
'''

# Find where to insert (after RemindersSnoozeReminderResponse)
insert_pattern = r'(export type RemindersSnoozeReminderResponse = \(unknown\);)'
match = re.search(insert_pattern, content)
if match:
    insert_pos = match.end()
    content = content[:insert_pos] + '\n' + new_types + '\n' + content[insert_pos:]

# Write the updated content
with open('frontend/src/client/types.gen.ts', 'w') as f:
    f.write(content)

print("Updated frontend types.gen.ts")
