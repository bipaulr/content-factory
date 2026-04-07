export type FormattedElement = 
  | { type: 'h1' | 'h2' | 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'li'; text: string }
  | { type: 'spacer' };

/**
 * Format content by converting markdown-like syntax to structured elements
 */
export function formatMarkdownContent(content: string): FormattedElement[] {
  if (!content) return [];

  const lines = content.split('\n');
  const elements: FormattedElement[] = [];
  let lastWasSpaced = false;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const trimmed = line.trim();

    // Skip completely empty lines
    if (!trimmed) {
      if (!lastWasSpaced && elements.length > 0) {
        elements.push({ type: 'spacer' });
        lastWasSpaced = true;
      }
      continue;
    }

    lastWasSpaced = false;

    // Headings: # Heading, ## Heading, ### Heading
    if (trimmed.startsWith('###')) {
      elements.push({ type: 'h3', text: trimmed.substring(3).trim() });
    } else if (trimmed.startsWith('##')) {
      elements.push({ type: 'h2', text: trimmed.substring(2).trim() });
    } else if (trimmed.startsWith('#')) {
      elements.push({ type: 'h1', text: trimmed.substring(1).trim() });
    }
    // Bullet lists: -, *, •
    else if (/^[-*•]\s/.test(trimmed)) {
      elements.push({ type: 'li', text: trimmed.substring(1).trim() });
    }
    // Regular paragraphs
    else {
      elements.push({ type: 'p', text: trimmed });
    }
  }

  return elements;
}

/**
 * Format social media content with better post separation
 */
export function formatSocialPosts(content: string): Array<{ number: number; content: string; platform?: string }> {
  if (!content || content.trim().length === 0) {
    return [];
  }

  let posts: Array<{ number: number; content: string; platform?: string }> = [];

  // Try numbered format first: "1. post content\n2. post content\n..."
  const numberedMatch = content.match(/^\s*\d+\./m);
  if (numberedMatch) {
    // Find all numbered posts
    const lines = content.split('\n');
    let currentPost = '';
    let postNumber = 0;

    for (const line of lines) {
      const lineMatch = line.match(/^\s*(\d+)\.\s*(.*)/);
      if (lineMatch) {
        // Save previous post if exists
        if (currentPost.trim() && postNumber > 0) {
          posts.push({
            number: postNumber,
            content: currentPost.trim(),
            platform: detectPlatform(currentPost)
          });
        }
        // Start new post
        postNumber = parseInt(lineMatch[1], 10);
        currentPost = lineMatch[2];
      } else if (postNumber > 0) {
        // Continue current post
        if (line.trim()) {
          currentPost += (currentPost.trim() ? '\n' : '') + line.trim();
        }
      }
    }

    // Don't forget the last post
    if (currentPost.trim() && postNumber > 0) {
      posts.push({
        number: postNumber,
        content: currentPost.trim(),
        platform: detectPlatform(currentPost)
      });
    }
  }

  // Fallback: split by double newlines if numbered parsing didn't work
  if (posts.length === 0) {
    const postTexts = content.split(/\n\n+/).filter(p => p.trim());
    if (postTexts.length > 1) {
      posts = postTexts.map((post, idx) => ({
        number: idx + 1,
        content: post.trim(),
        platform: detectPlatform(post)
      }));
    } else {
      // Single post
      posts = [{
        number: 1,
        content: content.trim(),
        platform: detectPlatform(content)
      }];
    }
  }

  return posts;
}

/**
 * Detect social media platform from content
 */
function detectPlatform(content: string): string {
  const length = content.length;
  const lines = content.split('\n').length;
  const hasHashtags = /#\w+/.test(content);
  const hasMentions = /@\w+/.test(content);
  const hasEmojis = /\p{Emoji}/u.test(content);

  if (length > 280 && lines > 3) return '📝 Long-form Post';
  if (length <= 280 && hasHashtags) return '𝕏 Twitter/X';
  if (hasEmojis && length < 200) return '📸 Instagram';
  if (hasMentions) return '💼 LinkedIn';
  return '📱 Social Post';
}
