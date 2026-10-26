export function duplicateSaveCallbackData(
  draftId: string,
  confirmation: string,
) {
  return `force:${draftId}:${confirmation}`;
}
