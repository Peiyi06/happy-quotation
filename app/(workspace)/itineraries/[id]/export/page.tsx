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
const cleanRouteStop=(value:any)=>{
  const raw=text(value);
  if(!raw) return "";
  return raw
    .replace(/^day\s*\d+[:：-]?/i,"")
    .replace(/\([^)]*\)/g,"")
    .replace(/[｜|]/g,"→")
    .split(/→|>|–|—| - /)
    .map((x:string)=>x.trim())
    .filter(Boolean)[0]||raw;
};

const buildJourneyStops=(departure:any,destination:any,days:any[])=>{
  const candidates=[
    text(departure),
    ...days.slice(0,6).map((d:any)=>cleanRouteStop(d?.title)),
    text(destination)
  ].filter(Boolean);
  const unique:string[]=[];
  for(const item of candidates){
    if(!unique.some(x=>x.toLowerCase()===item.toLowerCase())) unique.push(item);
    if(unique.length===6) break;
  }
  return unique;
};

const ROUTE_GEO_POINTS:Array<{aliases:string[];lat:number;lng:number}>=[
  {aliases:["kuala lumpur","kul","klia","吉隆坡"],lat:3.139,lng:101.687},
  {aliases:["ckg","chongqing jiangbei","重庆江北","重慶江北"],lat:29.7192,lng:106.6417},
  {aliases:["kix","kansai international airport","关西国际机场","關西國際機場"],lat:34.4347,lng:135.2440},
  {aliases:["cnx","chiang mai international airport","清迈国际机场","清邁國際機場"],lat:18.7668,lng:98.9626},
  {aliases:["bkk","suvarnabhumi","bangkok suvarnabhumi"],lat:13.6900,lng:100.7501},
  {aliases:["dmk","don mueang"],lat:13.9126,lng:100.6068},
  {aliases:["han","noi bai","hanoi airport"],lat:21.2187,lng:105.8042},
  {aliases:["kuala lumpur","kul","klia","吉隆坡"],lat:3.139,lng:101.687},
  {aliases:["osaka","大阪"],lat:34.694,lng:135.502},
  {aliases:["kyoto","京都"],lat:35.0116,lng:135.7681},
  {aliases:["nara","奈良"],lat:34.6851,lng:135.8048},
  {aliases:["tokyo","东京","東京","hnd","nrt"],lat:35.6762,lng:139.6503},
  {aliases:["nagoya","名古屋"],lat:35.1815,lng:136.9066},
  {aliases:["fukuoka","福冈","福岡"],lat:33.5902,lng:130.4017},
  {aliases:["sapporo","札幌"],lat:43.0618,lng:141.3545},
  {aliases:["chongqing","重庆","重慶"],lat:29.563,lng:106.5516},
  {aliases:["wulong","武隆"],lat:29.3254,lng:107.7599},
  {aliases:["chengdu","成都"],lat:30.5728,lng:104.0668},
  {aliases:["jiuzhaigou","九寨沟","九寨溝"],lat:33.252,lng:103.9186},
  {aliases:["leshan","乐山","樂山"],lat:29.5521,lng:103.7656},
  {aliases:["emei","峨眉山","mount emei","mt. e'mei"],lat:29.5177,lng:103.3328},
  {aliases:["nanchang","南昌"],lat:28.6829,lng:115.8582},
  {aliases:["lushan","庐山","廬山"],lat:29.5732,lng:115.9928},
  {aliases:["wuyuan","婺源"],lat:29.2483,lng:117.8613},
  {aliases:["jingdezhen","景德镇","景德鎮"],lat:29.2687,lng:117.1784},
  {aliases:["sanqingshan","三清山"],lat:28.9156,lng:118.0644},
  {aliases:["chiang mai","清迈","清邁","cnx"],lat:18.7883,lng:98.9853},
  {aliases:["chiang rai","清莱","清萊"],lat:19.9105,lng:99.8406},
  {aliases:["bangkok","曼谷","bkk","dmk"],lat:13.7563,lng:100.5018},
  {aliases:["hanoi","河内","河內","han"],lat:21.0278,lng:105.8342},
  {aliases:["ho chi minh","胡志明","sgn"],lat:10.8231,lng:106.6297}
];

const normalizeRouteLabel=(value:any)=>text(value).toLowerCase().replace(/[·•,，()（）]/g," ").replace(/\s+/g," ").trim();

const routeParts=(value:any)=>text(value)
  .replace(/^day\s*\d+[:：-]?/i,"")
  .replace(/\([^)]*\)/g,"")
  .replace(/[｜|]/g,"→")
  .split(/→|>|–|—| - /)
  .map((x:string)=>x.trim())
  .filter(Boolean);

const canonicalRouteLabel=(value:any)=>{
  const raw=text(value);
  const key=normalizeRouteLabel(raw).replace(/^中国\s*/,"").replace(/^china\s*/,"");
  if(!key) return "";
  const geo=ROUTE_GEO_POINTS.find(item=>item.aliases.some(alias=>{
    const a=normalizeRouteLabel(alias);
    return key===a||key.includes(a)||a.includes(key);
  }));
  if(!geo) return raw.replace(/^中国\s*/,"").replace(/^China\s*/i,"").trim();
  const preferred=geo.aliases.find(a=>/^[A-Z]{3}$/.test(a))||geo.aliases.find(a=>/[\u4e00-\u9fff]/.test(a))||geo.aliases[0];
  return preferred.toUpperCase()===preferred?preferred:preferred;
};

const buildLocalJourneyStops=(flights:any[],days:any[],destination:any)=>{
  const arrival=text(flights?.[0]?.to);
  const departure=text(flights?.[flights.length-1]?.from);
  const origin=text(flights?.[0]?.from);

  const dayParts=days.flatMap((d:any)=>routeParts(d?.title));
  const candidates=[arrival,...dayParts,text(destination),departure].filter(Boolean);
  const originKey=normalizeRouteLabel(origin);
  const seen:string[]=[];
  const cleaned:string[]=[];

  for(const candidate of candidates){
    const canonical=canonicalRouteLabel(candidate);
    const key=normalizeRouteLabel(canonical).replace(/^中国\s*/,"").replace(/^china\s*/,"");
    if(!key) continue;
    if(originKey && (key===originKey || key.includes(originKey) || originKey.includes(key))) continue;
    if(seen.some(existing=>existing===key||existing.includes(key)||key.includes(existing))) continue;
    seen.push(key);
    cleaned.push(canonical);
  }

  const arrivalLabel=arrival?canonicalRouteLabel(arrival):"";
  const departureLabel=departure?canonicalRouteLabel(departure):"";
  const local=cleaned.filter(x=>{
    const k=normalizeRouteLabel(x);
    return k!==normalizeRouteLabel(arrivalLabel)&&k!==normalizeRouteLabel(departureLabel);
  });

  const result:Array<{label:string;geoLabel:string;kind:"arrival"|"stop"|"departure"}>=[];
  if(arrivalLabel) result.push({label:`${arrivalLabel} Arrival`,geoLabel:arrivalLabel,kind:"arrival"});
  for(const stop of local.slice(0,6)) result.push({label:stop,geoLabel:stop,kind:"stop"});
  if(departureLabel) result.push({label:`${departureLabel} Departure`,geoLabel:departureLabel,kind:"departure"});
  return result;
};


const routeGeoForStop=(label:string)=>{
  const key=normalizeRouteLabel(label);
  if(!key) return null;
  for(const item of ROUTE_GEO_POINTS){
    if(item.aliases.some(alias=>key===alias||key.includes(alias)||alias.includes(key))){
      return {lat:item.lat,lng:item.lng};
    }
  }
  return null;
};

const buildRouteMapPoints=(stops:string[])=>{
  const resolved=stops.map((label,index)=>({label,index,geo:routeGeoForStop(label)}));
  const geos=resolved.filter((x:any)=>x.geo);
  if(geos.length>=2){
    const minLat=Math.min(...geos.map((x:any)=>x.geo.lat));
    const maxLat=Math.max(...geos.map((x:any)=>x.geo.lat));
    const minLng=Math.min(...geos.map((x:any)=>x.geo.lng));
    const maxLng=Math.max(...geos.map((x:any)=>x.geo.lng));
    const latSpan=Math.max(maxLat-minLat,.8);
    const lngSpan=Math.max(maxLng-minLng,.8);
    const project=(lat:number,lng:number)=>({
      x:12+((lng-(minLng-lngSpan*.16))/(lngSpan*1.32))*76,
      y:12+(((maxLat+latSpan*.16)-lat)/(latSpan*1.32))*68
    });
    return resolved.map((item:any,i:number)=>{
      if(item.geo) return {...item,...project(item.geo.lat,item.geo.lng),mode:"geo"};
      const prev=[...resolved.slice(0,i)].reverse().find((x:any)=>x.geo);
      const next=resolved.slice(i+1).find((x:any)=>x.geo);
      if(prev?.geo&&next?.geo){
        const a=project(prev.geo.lat,prev.geo.lng),b=project(next.geo.lat,next.geo.lng);
        const ratio=(i-prev.index)/(next.index-prev.index);
        return {...item,x:a.x+(b.x-a.x)*ratio,y:a.y+(b.y-a.y)*ratio,mode:"interpolated"};
      }
      return {...item,x:18+(i/Math.max(stops.length-1,1))*64,y:42+Math.sin(i*1.6)*12,mode:"fallback"};
    });
  }
  return stops.map((label,index)=>({
    label,index,
    x:14+(index/Math.max(stops.length-1,1))*72,
    y:44+Math.sin(index*1.55)*13,
    mode:"fallback"
  }));
};

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

export default async function ItineraryCustomerExportPage({params,searchParams}:{params:Promise<{id:string}>;searchParams?:Promise<Record<string,string|string[]|undefined>>}){
  const {id}=await params;
  const resolvedSearchParams=searchParams?await searchParams:{};
  const requestedStyle=Array.isArray(resolvedSearchParams?.pdfStyle)?resolvedSearchParams.pdfStyle[0]:resolvedSearchParams?.pdfStyle;
  const pdfStyle=(["basic","concept-a","concept-b","concept-c"] as const).includes(requestedStyle as any)?requestedStyle as "basic"|"concept-a"|"concept-b"|"concept-c":"basic";
  const isBasicPdf=pdfStyle==="basic"; // Frozen production baseline: do not attach concept-only visual classes.
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

  const journeyStops=buildJourneyStops(qd.departureCity,data.destination,days);
  const localJourneyStops=buildLocalJourneyStops(flights,days,data.destination);
  const localJourneyLabels=localJourneyStops.map((x:any)=>x.geoLabel);
  const journeyMapPoints=buildRouteMapPoints(localJourneyLabels).map((p:any,i:number)=>({...p,label:localJourneyStops[i]?.label||p.label,kind:localJourneyStops[i]?.kind||"stop"}));
  const journeyMapPath=journeyMapPoints.map((p:any,i:number)=>`${i===0?"M":"L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
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
      pdfStyle={pdfStyle}
    />
    <ItineraryPagedPreview sourceId="itinerary-print-source"/>
    <main id="itinerary-print-source" data-pdf-foundation={isBasicPdf?"basic-locked":pdfStyle} className={styles.document}>

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

      {pdfStyle==="concept-a"?<section data-preview-block="overview" data-preview-new-page="true" className={styles.conceptAOverviewPage}>
        <div className={styles.conceptAOverviewTitle}>
          <div className={styles.conceptAOverviewIndex}>01</div>
          <div><h2>Journey Overview</h2><p>行程总览</p></div>
          <span>HAPPY EXPRESS TRAVEL</span>
        </div>

        <div className={styles.conceptAOverviewStack}>
          <div className={styles.conceptAOverviewFlights}>
            <div className={styles.conceptAOverviewBlockHead}>
              <div><small>FLIGHT INFORMATION</small><strong>航班资料</strong></div>
              <span>{flights.length} Flight{flights.length===1?"":"s"}</span>
            </div>
            <div className={styles.conceptACompactFlightList}>
              {flights.length>0?flights.map((f:any,i:number)=><article className={styles.conceptACompactFlight} key={f.id||i}>
                <div className={styles.conceptACompactFlightRoute}>
                  <small>{i===0?"OUTBOUND":i===flights.length-1?"RETURN":"FLIGHT "+String(i+1).padStart(2,"0")}</small>
                  <strong>{f.from||"—"} <em>→</em> {f.to||"—"}</strong>
                </div>
                <div className={styles.conceptACompactFlightFacts}>
                  <div><span>Flight</span><b>{f.flightNo||"—"}</b></div>
                  <div><span>Date</span><b>{f.date||"—"}</b></div>
                  <div><span>Depart</span><b>{f.departureTime||"—"}</b></div>
                  <div><span>Arrive</span><b>{f.arrivalTime||"—"}</b></div>
                </div>
              </article>):<div className={styles.conceptAOverviewEmpty}>Flight information will appear here once added.</div>}
            </div>
          </div>

          {localJourneyStops.length>1&&<div className={styles.conceptAOverviewJourney}>
            <div className={styles.conceptAJourneyHead}>
              <div><small>JOURNEY ROUTE</small><strong>行程路线</strong></div>
              <span>{localJourneyStops.length} Stops</span>
            </div>
            <div className={styles.conceptAJourneyTrack}>
              {localJourneyStops.map((item:any,i:number)=><div className={styles.conceptAJourneyStop} key={item.label+"-overview-"+i}>
                <span className={styles.conceptAJourneyNode}>{String(i+1).padStart(2,"0")}</span>
                <strong>{item.label}</strong>
                {i<localJourneyStops.length-1&&<i aria-hidden="true"/>}
              </div>)}
            </div>
          </div>}

          <div className={styles.conceptAOverviewMapCard}>
            <div className={styles.conceptAOverviewBlockHead}>
              <div><small>ROUTE MAP</small><strong>路线地图</strong></div>
              <span>{journeyMapPoints.some((p:any)=>p.mode==="geo")?"Geo-based":"Schematic"}</span>
            </div>
            <div className={styles.conceptARouteMap}>
              <svg viewBox="0 0 100 70" role="img" aria-label="Journey route map">
                <defs>
                  <linearGradient id="routeMapBg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#EEF5F2"/>
                    <stop offset="100%" stopColor="#DDEDE7"/>
                  </linearGradient>
                  <filter id="routeNodeShadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="#0B2340" floodOpacity=".18"/>
                  </filter>
                </defs>
                <rect x="1" y="1" width="98" height="68" rx="6" fill="url(#routeMapBg)"/>
                <path d="M7 53 C17 31,30 17,44 15 C59 13,70 19,82 16 C92 14,96 25,93 37 C89 51,76 60,59 62 C41 65,22 62,7 53 Z" fill="#BBD8CF" opacity=".78"/>
                <path d="M8 22 C25 26,38 21,53 26 C67 31,79 28,94 20" fill="none" stroke="#FFFFFF" strokeWidth=".6" opacity=".65"/>
                <path d={journeyMapPath} fill="none" stroke="#D6A75A" strokeWidth="1.25" strokeDasharray="2.2 1.5" strokeLinecap="round" strokeLinejoin="round"/>
                {journeyMapPoints.map((p:any,i:number)=><g key={p.label+"-map-"+i} transform={`translate(${p.x} ${Math.min(p.y,64)})`}>
                  <circle r={p.kind==="stop"?3.3:3.8} fill="#FFFFFF" filter="url(#routeNodeShadow)"/>
                  <circle r={p.kind==="stop"?2.25:2.65} fill={p.kind==="stop"?"#0B2340":"#D6A75A"} stroke="#0B2340" strokeWidth=".8"/>
                  <text x="0" y=".85" textAnchor="middle" fontSize="2.35" fontWeight="800" fill={p.kind==="stop"?"#FFFFFF":"#0B2340"}>{i+1}</text>
                  <text x={p.x>72?-4:4} y={p.y<20?5:-4} textAnchor={p.x>72?"end":"start"} fontSize="3.05" fontWeight="800" fill="#0B2340">{p.label}</text>
                </g>)}
              </svg>
            </div>
            <div className={styles.conceptAMapLegend}>
              <span><i className={styles.conceptAMapLegendNode}/>Major stop</span>
              <span><i className={styles.conceptAMapLegendLine}/>Route sequence</span>
              <small>Map positions use geographic coordinates when recognised; otherwise the route falls back to schematic placement.</small>
            </div>
          </div>
        </div>
      </section>:flights.length>0&&<section data-preview-block="overview" className={styles.overviewPage}>
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
        <div data-preview-block="daily-title" data-keep-next="true" className={styles.sectionTitle+(pdfStyle==="concept-a"?" "+styles.conceptASectionTitle:"")}>
          <span>{flights.length?"02":"01"}</span>
          <div><h2>Daily Itinerary</h2><p>每日行程</p></div>
        </div>

        <div className={styles.dayList}>
          {days.map((day:any,index:number)=>{
            const images=representativeAttractions(day);
            const hotel=text(day?.hotel)&&text(day?.hotel)!=="-"?text(day.hotel):"";
            const date=dayDate(qd.travelStartDate||"",index);
            const conceptAPilot=pdfStyle==="concept-a"&&index<2;
            const highlightNames=conceptAPilot?list(day?.attractions).map((a:any)=>text(a?.name)).filter(Boolean).slice(0,3):[];
            return <article className={styles.day+(pdfStyle==="concept-a"?" "+styles.conceptADay:"")+(conceptAPilot?" "+styles.conceptAPilotDay:"")} key={day?.id||index}>
              <div data-preview-block="day-core" className={styles.dayCore+(pdfStyle==="concept-a"?" "+styles.conceptADayCore:"")}>
                <header className={styles.dayHeader+(pdfStyle==="concept-a"?" "+styles.conceptADayHeader:"")+(conceptAPilot?" "+styles.conceptAPilotHeader:"")}>
                  <div className={styles.dayNumber+(pdfStyle==="concept-a"?" "+styles.conceptADayNumber:"")}><small>DAY</small><b>{String(index+1).padStart(2,"0")}</b></div>
                  <div>
                    <h3>{day?.title||`Day ${index+1}`}</h3>
                    {date&&<span>{date}</span>}
                  </div>
                </header>

                <div className={styles.dayBody+(pdfStyle==="concept-a"?" "+styles.conceptADayBody:"")}>
                  {text(day?.content)&&<p className={styles.dayCopy+(pdfStyle==="concept-a"?" "+styles.conceptADayCopy:"")}>{day.content}</p>}
                  {highlightNames.length>0&&<div className={styles.conceptAHighlights}>
                    <span className={styles.conceptAHighlightsLabel}>Highlights</span>
                    <div>{highlightNames.map((name:string)=><span className={styles.conceptAHighlightChip} key={name}>{name}</span>)}</div>
                  </div>}
                  <div className={styles.dayMeta+(pdfStyle==="concept-a"?" "+styles.conceptADayMeta:"")}>
                    <div><span>Breakfast / 早餐</span><strong>{day?.meals?.breakfast||"—"}</strong></div>
                    <div><span>Lunch / 午餐</span><strong>{day?.meals?.lunch||"—"}</strong></div>
                    <div><span>Dinner / 晚餐</span><strong>{day?.meals?.dinner||"—"}</strong></div>
                    {hotel&&<div className={styles.hotelMeta}><span>Hotel / 酒店</span><strong>{hotel}</strong></div>}
                  </div>
                </div>
              </div>

              {images.length>0&&<div className={styles.attractionGallery}>
                {conceptAPilot?<>
                  <div
                    data-preview-block="gallery-row"
                    data-day-number={String(index+1).padStart(2,"0")}
                    data-day-title={day?.title||`Day ${index+1}`}
                    data-gallery-row="hero"
                    className={styles.conceptAHeroGallery}
                  >
                    <figure className={styles.conceptAHeroFigure}>
                      <div className={styles.conceptAHeroImage}><img src={images[0].url} alt={images[0].name}/></div>
                      <figcaption><span>Featured Stop</span><strong>{images[0].name}</strong></figcaption>
                    </figure>
                  </div>
                  {images.length>1&&<div
                    data-preview-block="gallery-row"
                    data-day-number={String(index+1).padStart(2,"0")}
                    data-day-title={day?.title||`Day ${index+1}`}
                    data-gallery-row="support"
                    className={styles.conceptASupportGallery}
                  >
                    {images.slice(1,3).map((img,ii)=><figure className={styles.conceptASupportFigure} key={img.url+ii}>
                      <div className={styles.conceptASupportImage}><img src={img.url} alt={img.name}/></div>
                      <figcaption>{img.name}</figcaption>
                    </figure>)}
                  </div>}
                </>:Array.from({length:Math.ceil(images.length/2)},(_,rowIndex)=>{
                  const row=images.slice(rowIndex*2,rowIndex*2+2);
                  return <div
                    data-preview-block="gallery-row"
                    data-day-number={String(index+1).padStart(2,"0")}
                    data-day-title={day?.title||`Day ${index+1}`}
                    data-gallery-row={String(rowIndex)}
                    className={styles.attractionGrid+(pdfStyle==="concept-a"?" "+styles.conceptAAttractionGrid:"")}
                    key={"gallery-"+index+"-"+rowIndex}
                  >
                    <div className={styles.galleryContinuation}>
                      DAY {String(index+1).padStart(2,"0")} · Gallery
                    </div>
                    {row.map((img,ii)=><figure className={styles.attractionFigure+(pdfStyle==="concept-a"?" "+styles.conceptAAttractionFigure:"")} key={img.url+ii}>
                      <div className={styles.attractionImage+(pdfStyle==="concept-a"?" "+styles.conceptAAttractionImage:"")}><img src={img.url} alt={img.name}/></div>
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
        <div data-preview-block="hotel-title" data-keep-next="true" data-preview-new-page="true" className={styles.sectionTitle}>
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

    </main>
  </div>;
}
