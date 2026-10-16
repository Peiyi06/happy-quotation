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

        const cover=source.querySelector<HTMLElement>('[data-preview-page="cover"]');
        if(cover){
          const shell=createPage(host,1);
          shell.inner.appendChild(cover.cloneNode(true));
        }

        const blocks=Array.from(source.querySelectorAll<HTMLElement>("[data-preview-block]"));
        let pageNo=cover?2:1;
        let page=createPage(host,pageNo);
        const maxHeight=page.inner.clientHeight;

        const appendBlock=(node:HTMLElement)=>{
          const clone=node.cloneNode(true) as HTMLElement;
          clone.classList.add("itinerary-preview-clone-block");
          page.inner.appendChild(clone);
          return clone;
        };

        for(let i=0;i<blocks.length;i++){
          const block=blocks[i];
          const keepNext=block.dataset.keepNext==="true";
          const clone=appendBlock(block);

          let nextClone:HTMLElement|null=null;
          if(keepNext&&i+1<blocks.length){
            nextClone=appendBlock(blocks[i+1]);
          }

          if(page.inner.scrollHeight>maxHeight&&page.inner.children.length>(keepNext?2:1)){
            clone.remove();
            if(nextClone) nextClone.remove();
            pageNo++;
            page=createPage(host,pageNo);
            page.inner.appendChild(clone);
            if(nextClone) page.inner.appendChild(nextClone);
          }

          if(keepNext&&nextClone) i++;
        }

        const pages=Array.from(host.querySelectorAll<HTMLElement>(".itinerary-preview-page"));
        pages.forEach((p,index)=>{
          const label=p.querySelector<HTMLElement>(".itinerary-preview-page-label");
          if(label) label.textContent="Page "+(index+1)+" / "+pages.length;
        });
      });
    };

    const createResizeObserver=typeof ResizeObserver!=="undefined"?new ResizeObserver(()=>build()):null;
    const source=document.getElementById(sourceId);
    if(source&&createResizeObserver) createResizeObserver.observe(source);

    build();
    window.addEventListener("resize",build);
    window.addEventListener("itinerary-preview-refresh",build as EventListener);

    const images=source?Array.from(source.querySelectorAll("img")):[];
    images.forEach(img=>img.addEventListener("load",build));

    return ()=>{
      cancelAnimationFrame(raf);
      createResizeObserver?.disconnect();
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
