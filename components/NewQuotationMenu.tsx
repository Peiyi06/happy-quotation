import Link from "next/link";

export default function NewQuotationMenu({compact=false}:{compact?:boolean}) {
  return <details className={"new-quote-menu "+(compact?"compact":"")}>
    <summary className={compact?"sidebar-new-quote":"btn primary"}>＋ New Quotation</summary>
    <div className="new-quote-options">
      <Link href="/quotations/new" className="new-quote-option active">
        <strong>Outbound Quotation</strong>
        <span>Overseas tour quotation</span>
      </Link>
      <div className="new-quote-option disabled" aria-disabled="true">
        <strong>Inbound Quotation</strong>
        <span>Coming Soon · Setup</span>
      </div>
      <div className="new-quote-option disabled" aria-disabled="true">
        <strong>Island Quotation</strong>
        <span>Coming Soon · Setup</span>
      </div>
    </div>
  </details>;
}
