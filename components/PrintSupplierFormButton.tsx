"use client";

export default function PrintSupplierFormButton(){
  return <button className="btn primary supplier-form-print-button" type="button" onClick={()=>window.print()}>Print / Save as PDF</button>;
}
