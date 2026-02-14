// Simple suggestion engine for prefixes. Replace/extend with a better trie if needed.
const COMMON_WORDS = [
  'what', 'when', 'where', 'who', 'why', 'which', 'how',
  'hello', 'help', 'home', 'good', 'morning', 'evening', 'night',
  'you', 'your', 'yours', 'are', 'am', 'is', 'we', 'they',
  'time', 'today', 'tomorrow', 'yesterday', 'person', 'please', 'thanks', 'thank',
  'yes', 'no', 'okay', 'alright', 'fine', 'sorry', 'welcome'
];

export function getSuggestions(prefix, limit = 5) {
  if (!prefix) return [];
  const p = prefix.toLowerCase();
  const scored = COMMON_WORDS
    .filter(w => w.startsWith(p))
    .map(w => ({ w, score: w === p ? 2 : (w.startsWith(p) ? 1 : 0) }));
  scored.sort((a, b) => b.score - a.score || a.w.length - b.w.length || a.w.localeCompare(b.w));
  return scored.slice(0, limit).map(x => x.w);
}

export function nextSuggestion(current, prefix) {
  const list = getSuggestions(prefix, 10);
  if (list.length === 0) return null;
  if (!current) return list[0];
  const idx = list.indexOf(current);
  return list[(idx + 1) % list.length];
}


