const FRAME_ID = "invoice-print-frame";

/** Loads the invoice into a hidden iframe and opens the print dialog without leaving the current screen. */
export function printInvoice(saleId: string): void {
  document.getElementById(FRAME_ID)?.remove();
  const frame = document.createElement("iframe");
  frame.id = FRAME_ID;
  frame.title = "Invoice print";
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
  frame.src = `/invoice/${saleId}?embed=1`;
  frame.onload = () => {
    const win = frame.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
  };
  document.body.appendChild(frame);
}
