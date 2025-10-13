/**
 * Converts a text string to a slug format suitable for field names.
 * - Converts to lowercase
 * - Replaces spaces with underscores
 * - Removes special characters (keeps alphanumeric and underscores)
 * - Trims leading/trailing underscores
 * @param text - Input text to slugify
 * @returns Slugified string
 * @example
 * slugify('First Name') // 'first_name'
 * slugify('Email Address (Primary)') // 'email_address_primary'
 * slugify('User's Phone #') // 'users_phone'
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/[\s_-]+/g, '_') // Replace spaces/hyphens with underscores
    .replace(/^_+|_+$/g, ''); // Trim underscores from start/end
}
