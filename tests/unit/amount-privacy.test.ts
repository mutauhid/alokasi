import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AmountPrivacyToggle,
  SensitiveAmount,
} from "@/components/amount-privacy";

describe("amount privacy", () => {
  it("masks monetary content during server rendering", () => {
    const html = renderToStaticMarkup(
      createElement(SensitiveAmount, null, "Rp1.250.000"),
    );

    expect(html).not.toContain("Rp1.250.000");
    expect(html).toContain("••••••");
    expect(html).toContain("Nominal disembunyikan");
  });

  it("renders an accessible global toggle during server rendering", () => {
    const html = renderToStaticMarkup(createElement(AmountPrivacyToggle));

    expect(html).toContain('aria-label="Tampilkan semua nominal"');
    expect(html).toContain('aria-pressed="true"');
  });
});
