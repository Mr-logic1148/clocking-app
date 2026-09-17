"use client";

import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button className="mb-6 print:hidden" type="button" onClick={() => window.print()}>
      Print / Save PDF
    </Button>
  );
}
