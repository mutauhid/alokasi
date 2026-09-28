export class FinanceDomainError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "FinanceDomainError";
  }
}
