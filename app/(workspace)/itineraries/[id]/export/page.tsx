import { notFound } from "next/navigation";
import { internalDb, internalToken } from "@/lib/internalSession";
import ItineraryExportToolbar from "@/components/ItineraryExportToolbar";
import ItineraryPagedPreview from "@/components/ItineraryPagedPreview";
import styles from "./ItineraryExport.module.css";

export const dynamic="force-dynamic";
export const revalidate=0;

const text=(value:any)=>String(value??"").trim();
const list=(value:any)=>Array.isArray(value)?value:[];
const safeFilePart=(value:any)=>text(value).replace(/[\\/:*?"<>|]+/g," ").replace(/\s+/g," ").trim();
const compactDestination=(value:any)=>{
  const raw=text(value);
  if(!raw) return "";
  return raw.split(/[，,]/)[0]?.trim()||raw;
};

const dayDate=(start:string,index:number)=>{
  if(!start) return "";
  const d=new Date(start+"T00:00:00");
  if(Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate()+index);
  return d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
};

const representativeAttractions=(day:any)=>{
  const result:Array<{name:string;url:string}>=[];
  for(const attraction of list(day?.attractions)){
    const first=list(attraction?.images).find((img:any)=>text(img?.url));
    if(first?.url) result.push({name:text(attraction?.name)||"Attraction",url:first.url});
    if(result.length===4) break;
  }
  return result;
};


const coverImageFromDays=(days:any[])=>{
  const ranked=days
    .map((day:any,index:number)=>{
      const images=representativeAttractions(day);
      return {index,images};
    })
    .filter((x:any)=>x.images.length>0)
    .sort((a:any,b:any)=>{
      const aRich=a.images.length>=3?1:0;
      const bRich=b.images.length>=3?1:0;
      if(aRich!==bRich) return bRich-aRich;
      return a.index-b.index;
    });
  return ranked[0]?.images?.[0]?.url||"";
};

export default async function ItineraryCustomerExportPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const token=await internalToken();
  if(!token) notFound();
  const db=internalDb();
  const {data,error}=await db.rpc("staff_get_itinerary",{p_token:token,p_id:id});
  if(error||!data?.id) notFound();

  const qd=data.itinerary_data||{};
  const flights=list(qd.suggestedFlights).filter((f:any)=>[f?.from,f?.to,f?.flightNo,f?.date,f?.departureTime,f?.arrivalTime].some(text));
  const days=list(qd.days);
  const hotels=list(qd.hotels).filter((h:any)=>text(h?.name)||list(h?.images).some((img:any)=>text(img?.url)));
  const included=list(qd.includedItems).filter((x:any)=>text(typeof x==="string"?x:x?.name));
  const excluded=list(qd.notIncludedItems).filter((x:any)=>text(typeof x==="string"?x:x?.name));
  const reminders=list(qd.reminders).filter((x:any)=>text(typeof x==="string"?x:x?.title)||text(x?.description));
  const manualCover=qd.coverImage&&text(qd.coverImage?.url)?{
    path:text(qd.coverImage?.path),
    url:text(qd.coverImage?.url),
    name:text(qd.coverImage?.name),
    position:["left","center","right"].includes(qd.coverImage?.position)?qd.coverImage.position:"center",
    overlay:["light","standard","strong"].includes(qd.coverImage?.overlay)?qd.coverImage.overlay:"standard",
    brightness:Math.min(130,Math.max(70,Number(qd.coverImage?.brightness)||100))
  }:null;
  const autoCoverUrl=coverImageFromDays(days)||list(hotels?.[0]?.images).find((img:any)=>text(img?.url))?.url||"";
  const coverImage=manualCover?.url||autoCoverUrl;
  const coverPosition=manualCover?.position||"center";
  const coverOverlay=manualCover?.overlay||"standard";
  const coverBrightness=manualCover?.brightness||100;
  const basePayload={
    source_inquiry_id:data.source_inquiry_id||qd.sourceInquiryId||"",
    title:data.title||"",
    destination:data.destination||"",
    days_count:data.days_count||days.length||1,
    nights_count:data.nights_count||0,
    customer_name:data.customer_name||"",
    status:data.status||"draft",
    itinerary_data:qd
  };

  const destinationLabel=compactDestination(data.destination);
  const durationLabel=data.days_count&&data.nights_count?`${data.days_count}D${data.nights_count}N`:"";
  const customerLabel=safeFilePart(data.customer_name);
  const itineraryLabel=safeFilePart(data.itinerary_no);
  const fileName=[
    "Happy Express Travel",
    [destinationLabel,durationLabel].filter(Boolean).join(" "),
    "行程确认",
    customerLabel,
    itineraryLabel||(!customerLabel?"Itinerary":"")
  ].map(safeFilePart).filter(Boolean).join("｜");

  return <div className={styles.screen}>
    <ItineraryExportToolbar
      fileName={fileName}
      itineraryId={id}
      basePayload={basePayload}
      initialCover={manualCover}
      autoCoverUrl={autoCoverUrl}
    />
    <ItineraryPagedPreview sourceId="itinerary-print-source"/>
    <main id="itinerary-print-source" className={styles.document}>

      <section id="itinerary-cover" data-preview-page="cover" data-overlay={coverOverlay} className={styles.cover+(coverImage?" "+styles.coverHasImage:"")}>
        <div id="itinerary-cover-media" className={styles.coverMedia} style={coverImage?{backgroundImage:`url("${coverImage}")`,backgroundPosition:coverPosition,filter:`brightness(${coverBrightness/100})`}:undefined} aria-hidden="true"/>
        <div className={styles.coverOverlay} aria-hidden="true"/>

        <div className={styles.coverContent}>
          <div className={styles.coverTop}>
            <div>
              <div className={styles.brand}>HAPPY EXPRESS TRAVEL</div>
              <div className={styles.documentType}>TRAVEL ITINERARY · 行程确认</div>
            </div>
            <div className={styles.logoSpace} aria-label="Logo area"/>
          </div>

          <div className={styles.coverHero}>
            <div className={styles.route}>{qd.departureCity||"Departure"} → {data.destination||"Destination"}</div>
            <h1>{data.title||data.destination||"Travel Itinerary"}</h1>
            <div className={styles.goldRule}/>
            <p>
              {[qd.travelStartDate&&qd.travelEndDate?`${qd.travelStartDate} → ${qd.travelEndDate}`:(qd.travelStartDate||""),data.days_count&&data.nights_count?`${data.days_count}D${data.nights_count}N`:"",qd.pax?`${qd.pax} Pax`:"",qd.tourType||""].filter(Boolean).join(" · ")}
            </p>
          </div>

          <div className={styles.coverBottom}>
            <span>{data.destination||"Travel Itinerary"}</span>
            <strong>{data.itinerary_no||""}</strong>
          </div>
        </div>
      </section>

      {flights.length>0&&<section data-preview-block="overview" className={styles.overviewPage}>
        <div className={styles.sectionTitle}>
          <span>01</span>
          <div><h2>Flight Information</h2><p>航班资料</p></div>
        </div>

        <div className={styles.flightList}>
          {flights.map((f:any,i:number)=><article className={styles.flightRow} key={f.id||i}>
            <div className={styles.flightRoute}>
              <small>{i===0?"OUTBOUND":i===flights.length-1?"RETURN":"FLIGHT "+String(i+1).padStart(2,"0")}</small>
              <strong>{f.from||"—"} <em>→</em> {f.to||"—"}</strong>
              {text(f.remarks)&&<span className={styles.flightCarrier}>{f.remarks}</span>}
            </div>
            <div className={styles.flightFacts}>
              <div><span>Flight / 航班</span><b>{f.flightNo||"—"}</b></div>
              <div><span>Date / 日期</span><b>{f.date||"—"}</b></div>
              <div><span>Departure / 起飞</span><b>{f.departureTime||"—"}</b></div>
              <div><span>Arrival / 抵达</span><b>{f.arrivalTime||"—"}</b></div>
            </div>
          </article>)}
        </div>
      </section>}

      <section className={styles.dailySection}>
        <div data-preview-block="daily-title" data-keep-next="true" className={styles.sectionTitle}>
          <span>{flights.length?"02":"01"}</span>
          <div><h2>Daily Itinerary</h2><p>每日行程</p></div>
        </div>

        <div className={styles.dayList}>
          {days.map((day:any,index:number)=>{
            const images=representativeAttractions(day);
            const hotel=text(day?.hotel)&&text(day?.hotel)!=="-"?text(day.hotel):"";
            const date=dayDate(qd.travelStartDate||"",index);
            return <article className={styles.day} key={day?.id||index}>
              <div data-preview-block="day-core" className={styles.dayCore}>
                <header className={styles.dayHeader}>
                  <div className={styles.dayNumber}><small>DAY</small><b>{String(index+1).padStart(2,"0")}</b></div>
                  <div>
                    <h3>{day?.title||`Day ${index+1}`}</h3>
                    {date&&<span>{date}</span>}
                  </div>
                </header>

                <div className={styles.dayBody}>
                  {text(day?.content)&&<p className={styles.dayCopy}>{day.content}</p>}
                  <div className={styles.dayMeta}>
                    <div><span>Breakfast / 早餐</span><strong>{day?.meals?.breakfast||"—"}</strong></div>
                    <div><span>Lunch / 午餐</span><strong>{day?.meals?.lunch||"—"}</strong></div>
                    <div><span>Dinner / 晚餐</span><strong>{day?.meals?.dinner||"—"}</strong></div>
                    {hotel&&<div className={styles.hotelMeta}><span>Hotel / 酒店</span><strong>{hotel}</strong></div>}
                  </div>
                </div>
              </div>

              {images.length>0&&<div className={styles.attractionGallery}>
                {Array.from({length:Math.ceil(images.length/2)},(_,rowIndex)=>{
                  const row=images.slice(rowIndex*2,rowIndex*2+2);
                  return <div
                    data-preview-block="gallery-row"
                    data-day-number={String(index+1).padStart(2,"0")}
                    data-day-title={day?.title||`Day ${index+1}`}
                    data-gallery-row={String(rowIndex)}
                    className={styles.attractionGrid}
                    key={"gallery-"+index+"-"+rowIndex}
                  >
                    <div className={styles.galleryContinuation}>
                      DAY {String(index+1).padStart(2,"0")} · Gallery
                    </div>
                    {row.map((img,ii)=><figure className={styles.attractionFigure} key={img.url+ii}>
                      <div className={styles.attractionImage}><img src={img.url} alt={img.name}/></div>
                      <figcaption>{img.name}</figcaption>
                    </figure>)}
                  </div>;
                })}
              </div>}
            </article>;
          })}
        </div>
      </section>

      {hotels.length>0&&<section className={styles.hotelSection}>
        <div data-preview-block="hotel-title" data-keep-next="true" className={styles.sectionTitle}>
          <span>H</span>
          <div><h2>Hotel Introduction</h2><p>酒店介绍</p></div>
        </div>

        <div className={styles.hotelList}>
          {hotels.map((hotel:any,index:number)=>{
            const images=list(hotel?.images).filter((img:any)=>text(img?.url)).slice(0,4);
            const compactMeta=[
              text(hotel?.cityArea),
              text(hotel?.stayNights)?`${hotel.stayNights} Night${String(hotel.stayNights)==="1"?"":"s"}`:"",
              hotel?.roomSize!==""&&hotel?.roomSize!=null?`${hotel.roomSize} m²`:""
            ].filter(Boolean).join(" · ");

            return <article data-preview-block="hotel" className={styles.hotelCard} key={hotel?.id||index}>
              <header>
                <div>
                  <small>HOTEL {String(index+1).padStart(2,"0")}</small>
                  <h3>{hotel?.name||"Hotel"}</h3>
                  {compactMeta&&<p>{compactMeta}</p>}
                </div>
                {text(hotel?.starRating)&&<strong>{hotel.starRating}</strong>}
              </header>

              {text(hotel?.nearbyNotes)&&<p className={styles.hotelNote}>{hotel.nearbyNotes}</p>}

              {images.length>0&&<div className={styles.hotelImages}>
                {images.map((img:any,ii:number)=><div className={styles.hotelImage} key={img?.path||img?.url||ii}><img src={img.url} alt={hotel?.name||"Hotel"}/></div>)}
              </div>}
            </article>;
          })}
        </div>
      </section>}

      {reminders.length>0&&<section data-preview-block="final" className={styles.finalSection}>
        <div className={styles.sectionTitle}>
          <span>+</span>
          <div><h2>Travel Notes</h2><p>温馨提醒</p></div>
        </div>

        <div className={styles.reminders}>
          {reminders.map((x:any,i:number)=>{
            const title=typeof x==="string"?`Reminder ${i+1}`:(x?.title||`Reminder ${i+1}`);
            const body=typeof x==="string"?x:x?.description;
            return <div key={x?.id||i}><b>{String(i+1).padStart(2,"0")}</b><span><strong>{title}</strong>{text(body)&&<p>{body}</p>}</span></div>;
          })}
        </div>
      </section>}

      <div className={styles.printFooter} aria-hidden="true">
        <span>Happy Express Travel</span>
        <span>{data.itinerary_no||""}</span>
      </div>
    </main>
  </div>;
}
