import { notFound } from "next/navigation";
import { internalDb, internalToken } from "@/lib/internalSession";
import ItineraryExportToolbar from "@/components/ItineraryExportToolbar";
import styles from "./ItineraryExport.module.css";

const text=(value:any)=>String(value??"").trim();
const list=(value:any)=>Array.isArray(value)?value:[];
const safeFilePart=(value:any)=>text(value).replace(/[\\/:*?"<>|]+/g," ").replace(/\s+/g," ").trim();

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
    overlay:["light","standard","strong"].includes(qd.coverImage?.overlay)?qd.coverImage.overlay:"standard"
  }:null;
  const autoCoverUrl=coverImageFromDays(days)||list(hotels?.[0]?.images).find((img:any)=>text(img?.url))?.url||"";
  const coverImage=manualCover?.url||autoCoverUrl;
  const coverPosition=manualCover?.position||"center";
  const coverOverlay=manualCover?.overlay||"standard";
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

  const fileName=[
    "Happy Express Travel",
    data.destination,
    data.days_count&&data.nights_count?`${data.days_count}D${data.nights_count}N`:"",
    data.customer_name
  ].map(safeFilePart).filter(Boolean).join(" - ");

  return <div className={styles.screen}>
    <ItineraryExportToolbar
      fileName={fileName}
      itineraryId={id}
      basePayload={basePayload}
      initialCover={manualCover}
      autoCoverUrl={autoCoverUrl}
    />
    <main className={styles.document}>

      <section id="itinerary-cover" data-overlay={coverOverlay} className={styles.cover+(coverImage?" "+styles.coverHasImage:"")}>
        <div id="itinerary-cover-media" className={styles.coverMedia} style={coverImage?{backgroundImage:`url("${coverImage}")`,backgroundPosition:coverPosition}:undefined} aria-hidden="true"/>
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

      {flights.length>0&&<section className={styles.overviewPage}>
        <div className={styles.sectionTitle}>
          <span>01</span>
          <div><h2>Trip Overview</h2><p>行程概览与航班资料</p></div>
        </div>

        <div className={styles.tripStrip}>
          <div><span>Route / 路线</span><strong>{qd.departureCity||"—"} → {data.destination||"—"}</strong></div>
          <div><span>Duration / 天数</span><strong>{data.days_count}D{data.nights_count}N</strong></div>
          <div><span>Pax / 人数</span><strong>{qd.pax||"—"}</strong></div>
          <div><span>Tour Type / 团型</span><strong>{qd.tourType||"—"}</strong></div>
        </div>

        <div className={styles.flightList}>
          {flights.map((f:any,i:number)=><article className={styles.flightRow} key={f.id||i}>
            <div className={styles.flightRoute}>
              <small>{i===0?"OUTBOUND":i===flights.length-1?"RETURN":"FLIGHT "+String(i+1).padStart(2,"0")}</small>
              <strong>{f.from||"—"} <em>→</em> {f.to||"—"}</strong>
            </div>
            <div className={styles.flightFacts}>
              <div><span>Flight / 航班</span><b>{f.flightNo||"—"}</b></div>
              <div><span>Date / 日期</span><b>{f.date||"—"}</b></div>
              <div><span>Departure / 起飞</span><b>{f.departureTime||"—"}</b></div>
              <div><span>Arrival / 抵达</span><b>{f.arrivalTime||"—"}</b></div>
            </div>
            {text(f.remarks)&&<div className={styles.flightRemarks}>{f.remarks}</div>}
          </article>)}
        </div>
      </section>}

      <section className={styles.dailySection}>
        <div className={styles.sectionTitle}>
          <span>{flights.length?"02":"01"}</span>
          <div><h2>Daily Itinerary</h2><p>每日行程</p></div>
        </div>

        <div className={styles.dayList}>
          {days.map((day:any,index:number)=>{
            const images=representativeAttractions(day);
            const hotel=text(day?.hotel)&&text(day?.hotel)!=="-"?text(day.hotel):"";
            const date=dayDate(qd.travelStartDate||"",index);
            return <article className={styles.day} key={day?.id||index}>
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

                {images.length>0&&<div className={styles.attractionGrid}>
                  {images.map((img,ii)=><figure className={styles.attractionFigure} key={img.url+ii}>
                    <div className={styles.attractionImage}><img src={img.url} alt={img.name}/></div>
                    <figcaption>{img.name}</figcaption>
                  </figure>)}
                </div>}
              </div>
            </article>;
          })}
        </div>
      </section>

      {hotels.length>0&&<section className={styles.hotelSection}>
        <div className={styles.sectionTitle}>
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

            return <article className={styles.hotelCard} key={hotel?.id||index}>
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

      {(included.length>0||excluded.length>0||reminders.length>0)&&<section className={styles.finalSection}>
        <div className={styles.sectionTitle}>
          <span>+</span>
          <div><h2>Travel Notes</h2><p>配套详情与温馨提醒</p></div>
        </div>

        <div className={styles.finalGrid}>
          {included.length>0&&<div>
            <h3>Included / 配套包含</h3>
            <ul>{included.map((x:any,i:number)=><li key={x?.id||i}>{typeof x==="string"?x:x?.name}</li>)}</ul>
          </div>}
          {excluded.length>0&&<div>
            <h3>Not Included / 配套不包含</h3>
            <ul>{excluded.map((x:any,i:number)=><li key={x?.id||i}>{typeof x==="string"?x:x?.name}</li>)}</ul>
          </div>}
        </div>

        {reminders.length>0&&<div className={styles.reminders}>
          <h3>Friendly Reminder / 温馨提醒</h3>
          {reminders.map((x:any,i:number)=>{
            const title=typeof x==="string"?`Reminder ${i+1}`:(x?.title||`Reminder ${i+1}`);
            const body=typeof x==="string"?x:x?.description;
            return <div key={x?.id||i}><b>{String(i+1).padStart(2,"0")}</b><span><strong>{title}</strong>{text(body)&&<p>{body}</p>}</span></div>;
          })}
        </div>}
      </section>}

      <div className={styles.printFooter} aria-hidden="true">
        <span>Happy Express Travel</span>
        <span>{data.itinerary_no||""}</span>
      </div>
    </main>
  </div>;
}
