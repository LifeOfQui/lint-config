import './format.css'

export function formatName(first: string, last?: string): string {
  return last ? `${first} ${last}` : first
}
