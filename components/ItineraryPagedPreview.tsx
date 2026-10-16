"use client";

import {useEffect, useRef} from "react";

const LOW_DENSITY=0.55;
const TARGET_DENSITY=0.85;

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

        const cover=source.querySelector<HTMLElement>('[data-preview-page="cover"]');
        if(cover){
          const shell=createPage(host,1);
          shell.inner.appendChild(cover.cloneNode(true));
        }

        const blocks=Array.from(source.querySelectorAll<HTMLElement>("[data-preview-block]"));
        let pageNo=cover?2:1;
        let page=createPage(host,pageNo);

        const newPage=()=>{
          pageNo++;
          page=createPage(host,pageNo);
          return page;
        };

        const density=()=>page.inner.scrollHeight/Math.max(1,page.inner.clientHeight);

        const appendClone=(node:HTMLElement)=>{
          const clone=node.cloneNode(true) as HTMLElement;
          clone.classList.add("itinerary-preview-clone-block");
          page.inner.appendChild(clone);
          return clone;
        };

        const addContinuation=(block:HTMLElement)=>{
          if(block.dataset.previewBlock!=="gallery-row") return null;
          const row=Number(block.dataset.galleryRow||"0");
          if(row===0) return null;
          const el=document.createElement("div");
          el.className="itinerary-preview-continuation";
          el.textContent="DAY "+(block.dataset.dayNumber||"")+" · "+(block.dataset.dayTitle||"")+" · Gallery";
          page.inner.appendChild(el);
          return el;
        };

        for(let i=0;i<blocks.length;i++){
          const block=blocks[i];
          const type=block.dataset.previewBlock||"";
          const keepNext=block.dataset.keepNext==="true";

          // If the current page is already visually full, start the next logical block on a new page.
          if(page.inner.children.length>0 && density()>=TARGET_DENSITY && (type==="day-core"||type==="hotel"||type==="final")){
            newPage();
          }

          let continuation=addContinuation(block);
          let clone=appendClone(block);

          let nextClone:HTMLElement|null=null;
          if(keepNext&&i+1<blocks.length){
            nextClone=appendClone(blocks[i+1]);
          }

          if(page.inner.scrollHeight>page.inner.clientHeight){
            clone.remove();
            if(nextClone) nextClone.remove();
            if(continuation) continuation.remove();

            // Keep short pages productive, but never force an overflowing block.
            newPage();
            continuation=addContinuation(block);
            clone=appendClone(block);
            if(keepNext&&i+1<blocks.length) nextClone=appendClone(blocks[i+1]);
          }

          if(keepNext&&nextClone) i++;

          // A short text-only day should invite the next block onto the same page.
          // A gallery row may also share the page while density remains below the target.
          if((type==="day-core"||type==="gallery-row") && density()<LOW_DENSITY){
            continue;
          }
        }

        const pages=Array.from(host.querySelectorAll<HTMLElement>(".itinerary-preview-page"));
        pages.forEach((p,index)=>{
          const label=p.querySelector<HTMLElement>(".itinerary-preview-page-label");
          if(label) label.textContent="Page "+(index+1)+" / "+pages.length;
        });
      });
    };

    const ro=typeof ResizeObserver!=="undefined"?new ResizeObserver(()=>build()):null;
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

function createPage(host:HTMLDivElement,pageNo:number){
  const page=document.createElement("section");
  page.className="itinerary-preview-page";
  page.dataset.page=String(pageNo);

  const label=document.createElement("div");
  label.className="itinerary-preview-page-label";
  label.textContent="Page "+pageNo;

  const inner=document.createElement("div");
  inner.className="itinerary-preview-page-inner";

  page.appendChild(label);
  page.appendChild(inner);
  host.appendChild(page);
  return {page,inner};
}
