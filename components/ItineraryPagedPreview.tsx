"use client";

import {useEffect, useRef} from "react";

export default function ItineraryPagedPreview({sourceId}:{sourceId:string}){
  const hostRef=useRef<HTMLDivElement|null>(null);

  useEffect(()=>{
    let raf=0;

    const build=()=>{
      cancelAnimationFrame(raf);
      raf=requestAnimationFrame(()=>{
        const host=hostRef.current;
        const source=document.getElementById(sourceId);
        if(!host||!source) return;
        host.innerHTML="";

        const footerSource=source.querySelector<HTMLElement>("[data-preview-footer]");
        const cover=source.querySelector<HTMLElement>('[data-preview-page="cover"]');
        if(cover){
          const shell=createPage(host,1,footerSource);
          shell.inner.appendChild(sanitizeClone(cover));
        }

        const blocks=Array.from(source.querySelectorAll<HTMLElement>("[data-preview-block]"));
        let pageNo=cover?2:1;
        let page=createPage(host,pageNo,footerSource);

        const newPage=()=>{
          pageNo++;
          page=createPage(host,pageNo,footerSource);
        };

        const appendClone=(node:HTMLElement)=>{
          const clone=sanitizeClone(node);
          clone.classList.add("itinerary-preview-clone-block");
          page.inner.appendChild(clone);
          return clone;
        };

        for(let i=0;i<blocks.length;i++){
          const block=blocks[i];
          const keepNext=block.dataset.keepNext==="true";
          const forceNewPage=block.dataset.previewNewPage==="true";

          if(forceNewPage&&page.inner.children.length>0){
            newPage();
          }

          const clone=appendClone(block);
          let nextClone:HTMLElement|null=null;

          if(keepNext&&i+1<blocks.length){
            nextClone=appendClone(blocks[i+1]);
          }

          const overflow=page.inner.scrollHeight>page.inner.clientHeight;
          const movableChildren=keepNext?2:1;

          if(overflow&&page.inner.children.length>movableChildren){
            clone.remove();
            nextClone?.remove();
            newPage();
            page.inner.appendChild(clone);
            if(nextClone) page.inner.appendChild(nextClone);
          }

          if(keepNext&&nextClone) i++;
        }

        Array.from(host.querySelectorAll<HTMLElement>(".itinerary-preview-page")).forEach(p=>{
          const inner=p.querySelector<HTMLElement>(".itinerary-preview-page-inner");
          if(inner&&inner.children.length===0) p.remove();
        });

        const pages=Array.from(host.querySelectorAll<HTMLElement>(".itinerary-preview-page"));
        pages.forEach((p,index)=>{
          const label=p.querySelector<HTMLElement>(".itinerary-preview-page-label");
          if(label) label.textContent="Page "+(index+1)+" / "+pages.length;
        });
      });
    };

    const ro=typeof ResizeObserver!=="undefined"?new ResizeObserver(build):null;
    const source=document.getElementById(sourceId);
    if(source&&ro) ro.observe(source);

    build();
    window.addEventListener("resize",build);
    window.addEventListener("itinerary-preview-refresh",build as EventListener);

    const images=source?Array.from(source.querySelectorAll("img")):[];
    images.forEach(img=>img.addEventListener("load",build));

    return ()=>{
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("resize",build);
      window.removeEventListener("itinerary-preview-refresh",build as EventListener);
      images.forEach(img=>img.removeEventListener("load",build));
    };
  },[sourceId]);

  return <div ref={hostRef} className="itinerary-paged-preview no-print" aria-label="A4 PDF page preview"/>;
}

function sanitizeClone(node:HTMLElement){
  const clone=node.cloneNode(true) as HTMLElement;
  if(clone.id) clone.removeAttribute("id");
  clone.querySelectorAll<HTMLElement>("[id]").forEach(el=>el.removeAttribute("id"));
  return clone;
}

function createPage(
  host:HTMLDivElement,
  pageNo:number,
  footerSource:HTMLElement|null
){
  const page=document.createElement("section");
  page.className="itinerary-preview-page";
  page.dataset.page=String(pageNo);

  const label=document.createElement("div");
  label.className="itinerary-preview-page-label";
  label.textContent="Page "+pageNo;

  const inner=document.createElement("div");
  inner.className="itinerary-preview-page-inner";

  const footer=footerSource?sanitizeClone(footerSource):null;
  if(footer){
    footer.classList.add("itinerary-preview-print-footer");
  }

  page.appendChild(label);
  page.appendChild(inner);
  if(footer) page.appendChild(footer);
  host.appendChild(page);
  return {page,inner};
}
