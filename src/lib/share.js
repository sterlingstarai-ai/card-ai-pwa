export async function shareOrCopy({ title, text, url, onCopied }) {
  const shareData = { title, text, url };

  if (navigator.share) {
    await navigator.share(shareData);
    return 'shared';
  }

  await navigator.clipboard.writeText(url);
  if (onCopied) onCopied();
  return 'copied';
}
