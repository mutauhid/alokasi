export class UserDomainError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "UserDomainError";
  }
}
