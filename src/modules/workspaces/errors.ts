export class WorkspaceDomainError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "WorkspaceDomainError";
  }
}
