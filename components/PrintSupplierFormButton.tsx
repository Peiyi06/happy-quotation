"use client";

function safePart(value:string){
  return String(value||"")
    .replace(/[\\/:*?"<>|]/g," ")
    .replace(/\s+/g," ")
    .trim();
}

export default function PrintSupplierFormButton({
  inquiryNo,
  destination,
  customerName,
  startDate
}:{
  inquiryNo:string;
  destination:string;
  customerName:string;
  startDate:string;
}){
  function handlePrint(){
    const originalTitle=document.title;
    const compactDate=String(startDate||"").replace(/-/g,"");
    const fileName=[
      safePart(inquiryNo),
      safePart(destination),
      customerName?`【${safePart(customerName)}】`:"",
      compactDate
    ].filter(Boolean).join(" - ");
    document.title=fileName||"Supplier Inquiry";
    const restore=()=>{document.title=originalTitle;window.removeEventListener("afterprint",restore);};
    window.addEventListener("afterprint",restore);
    window.print();
    window.setTimeout(()=>{if(document.title!==originalTitle) document.title=originalTitle;},1500);
  }

  return <button className="btn primary supplier-form-print-button" type="button" onClick={handlePrint}>Print / Save as PDF</button>;
}
