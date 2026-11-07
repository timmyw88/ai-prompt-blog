export type CopyState = 'idle' | 'success' | 'failure';

export function copyLabel(state: CopyState): string {
  if (state === 'success') return 'Copied';
  if (state === 'failure') return 'Copy failed';
  return 'Copy';
}

export function copyStatusMessage(state: CopyState): string {
  if (state === 'success') return 'Copied to the clipboard.';
  if (state === 'failure') return 'Copy failed. Select the prompt and copy it manually.';
  return '';
}

export function accessibleCopyName(state: CopyState, name: string): string {
  return `${copyLabel(state)} ${name}`.trim();
}

export function textToCopy(text: string, mode: 'exact' | 'fenced'): string {
  const normalized = text.replace(/\r\n/g, '\n');
  if (mode === 'exact') return normalized;
  return normalized.replace(/^\n/, '').replace(/\n$/, '');
}

export async function copyWithProviders(
  text: string,
  providers: {
    clipboard?: () => Promise<void>;
    legacy?: () => boolean;
  },
): Promise<CopyState> {
  if (text.length === 0) return 'failure';
  try {
    if (!providers.clipboard) throw new Error('Clipboard API unavailable');
    await providers.clipboard();
    return 'success';
  } catch {
    try {
      if (providers.legacy?.()) return 'success';
    } catch {
      return 'failure';
    }
  }
  return 'failure';
}
