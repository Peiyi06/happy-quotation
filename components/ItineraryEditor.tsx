"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {useWorkspaceLanguage} from "@/components/WorkspaceLanguage";

type MealInfo={breakfast:string;lunch:string;dinner:string};
type AttractionImage={path:string;url:string;name:string;libraryImageId?:string;libraryPlaceId?:string;source?:string};
type SuggestedFlight={id:string;from:string;to:string;flightNo:string;date:string;departureTime:string;arrivalTime:string;remarks:string};
type HotelItem={id:string;name:string;cityArea:string;starRating:string;stayNights:string;roomSize:number|"";openingYear:string;renovationYear:string;nearbyNotes:string;images:AttractionImage[]};
type AttractionItem={id:string;name:string;images:AttractionImage[]};
type PackageItem={id:string;preset:string;name:string};
type ReminderItem={id:string;preset:string;title:string;description:string};
type DayItem={
  id:string;
  title:string;
  content:string;
  hotel:string;
  meals:MealInfo;
  attractions:AttractionItem[];
  completed:boolean;
  collapsed:boolean;
};

type Props={
  itineraryId?:string;
  initialItinerary?:any;
  currentStaffId:string;
  currentStaffName:string;
  sourceInquiryId?:string;
  sourceInquiryNo?:string;
  sourceInquirySnapshot?:any;
};

const uid=()=>Math.random().toString(36).slice(2,10);
const emptyFlight=():SuggestedFlight=>({id:uid(),from:"",to:"",flightNo:"",date:"",departureTime:"",arrivalTime:"",remarks:""});
const emptyHotel=():HotelItem=>({id:uid(),name:"",cityArea:"",starRating:"",stayNights:"",roomSize:"",openingYear:"",renovationYear:"",nearbyNotes:"",images:[]});
const emptyPackageItem=():PackageItem=>({id:uid(),preset:"other",name:""});
const emptyReminder=():ReminderItem=>({id:uid(),preset:"other",title:"",description:""});
const normalizeReminders=(raw:any):ReminderItem[]=>Array.isArray(raw)?raw.map((item:any)=>(
  typeof item==="string"
    ? {id:uid(),preset:"other",title:"Reminder",description:item}
    : {id:item?.id||uid(),preset:item?.preset||"other",title:item?.title||"",description:item?.description||""}
)):[];
const reminderPresets=[
  ["passport","Passport / Travel Document｜护照 / 旅行证件"],
  ["weather","Weather / Clothing｜天气 / 穿着"],
  ["personal","Personal Expenses｜个人消费"],
  ["insurance","Travel Insurance｜旅游保险"],
  ["baggage","Baggage｜行李"],
  ["activity","Special Activity Notice｜特别活动提醒"],
  ["terms","Terms / Itinerary Change｜条款 / 行程调整"],
  ["other","Other｜其他"]
] as const;
const normalizePackageItems=(raw:any):PackageItem[]=>Array.isArray(raw)?raw.map((item:any)=>(
  typeof item==="string"
    ? {id:uid(),preset:"other",name:item}
    : {id:item?.id||uid(),preset:item?.preset||"other",name:item?.name||""}
)):[];
const includedPresets=[
  ["hotel","Hotel Accommodation｜酒店住宿"],
  ["transport","Transportation｜交通"],
  ["guide","Tour Guide / Driver｜导游 / 司机"],
  ["tickets","Entrance Tickets｜景点门票"],
  ["insurance","Travel Insurance｜旅游保险"],
  ["meals","Meals｜餐食"],
  ["airport","Airport Transfer｜机场接送"],
  ["other","Other｜其他"]
] as const;
const excludedPresets=[
  ["flight","Air Ticket｜机票"],
  ["meals","Meals｜餐食"],
  ["tips","Tips｜小费"],
  ["personal","Personal Expenses｜个人消费"],
  ["luggage","Excess Baggage｜超重行李"],
  ["unmentioned","Unmentioned Items｜行程未注明项目"],
  ["other","Other｜其他"]
] as const;
const emptyDay=():DayItem=>({
  id:uid(),
  title:"",
  content:"",
  hotel:"",
  meals:{breakfast:"",lunch:"",dinner:""},
  attractions:[],
  completed:false,
  collapsed:false
});

const normalizeDay=(raw:any):DayItem=>({
  id:raw?.id||uid(),
  title:raw?.title||"",
  content:raw?.content||"",
  hotel:raw?.hotel||"",
  meals:{
    breakfast:raw?.meals?.breakfast||"",
    lunch:raw?.meals?.lunch||"",
    dinner:raw?.meals?.dinner||""
  },
  attractions:Array.isArray(raw?.attractions)
    ? raw.attractions.map((a:any)=>({
        id:a?.id||uid(),
        name:a?.name||"",
        images:Array.isArray(a?.images)?a.images:(a?.imageUrl?[{path:"",url:a.imageUrl,name:"Legacy image"}]:[])
      }))
    : [],
  completed:Boolean(raw?.completed),
  collapsed:raw?.collapsed===undefined?Boolean(raw?.completed):Boolean(raw?.collapsed)
});

export default function ItineraryEditor({itineraryId,initialItinerary,currentStaffId,currentStaffName,sourceInquiryId="",sourceInquiryNo="",sourceInquirySnapshot}:Props){
  const router=useRouter();
  const {language}=useWorkspaceLanguage();
  const t=(en:string,zh:string)=>language==="zh"?zh:en;
  const uiPresetLabel=(label:string)=>{const [en,zh]=label.split("｜");return language==="zh"?(zh||en):en;};
  const data=initialItinerary?.itinerary_data||{};
  const resolvedSourceInquiryId=sourceInquiryId||initialItinerary?.source_inquiry_id||data.sourceInquiryId||"";
  const resolvedSourceInquiryNo=sourceInquiryNo||data.sourceInquiryNo||"";
  const resolvedSourceInquirySnapshot=sourceInquirySnapshot||data.sourceInquirySnapshot||null;
  const initialDays:Array<DayItem>=Array.isArray(data.days)&&data.days.length
    ? data.days.map(normalizeDay)
    : [emptyDay()];

  const [title,setTitle]=useState(initialItinerary?.title||"New Itinerary");
  const [destination,setDestination]=useState(initialItinerary?.destination||"");
  const [daysCount,setDaysCount]=useState(Number(initialItinerary?.days_count)||initialDays.length||1);
  const [nightsCount,setNightsCount]=useState(Number(initialItinerary?.nights_count)||0);
  const [customerName,setCustomerName]=useState(initialItinerary?.customer_name||"");
  const [status,setStatus]=useState(initialItinerary?.status||"draft");
  const [departureCity,setDepartureCity]=useState(data.departureCity||"");
  const [travelStartDate,setTravelStartDate]=useState(data.travelStartDate||"");
  const [travelEndDate,setTravelEndDate]=useState(data.travelEndDate||"");
  const [pax,setPax]=useState<number|"">(data.pax??"");
  const [tourType,setTourType]=useState(data.tourType||"");
  const [suggestedFlights,setSuggestedFlights]=useState<SuggestedFlight[]>(
    Array.isArray(data.suggestedFlights)?data.suggestedFlights.map((f:any)=>({
      id:f?.id||uid(),from:f?.from||"",to:f?.to||"",flightNo:f?.flightNo||"",date:f?.date||"",
      departureTime:f?.departureTime||"",arrivalTime:f?.arrivalTime||"",remarks:f?.remarks||""
    })):[]
  );
  const [days,setDays]=useState<DayItem[]>(initialDays);
  const [hotels,setHotels]=useState<HotelItem[]>(
    Array.isArray(data.hotels)?data.hotels.map((h:any)=>({
      id:h?.id||uid(),name:h?.name||"",cityArea:h?.cityArea||"",starRating:h?.starRating||"",
      stayNights:h?.stayNights||"",roomSize:h?.roomSize??"",openingYear:h?.openingYear||"",
      renovationYear:h?.renovationYear||"",nearbyNotes:h?.nearbyNotes||"",
      images:Array.isArray(h?.images)?h.images:[]
    })):[]
  );
  const [includedItems,setIncludedItems]=useState<PackageItem[]>(normalizePackageItems(data.includedItems));
  const [notIncludedItems,setNotIncludedItems]=useState<PackageItem[]>(normalizePackageItems(data.notIncludedItems));
  const [reminders,setReminders]=useState<ReminderItem[]>(normalizeReminders(data.reminders));
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");
  const [uploadingAttraction,setUploadingAttraction]=useState<string|null>(null);
  const [uploadingHotel,setUploadingHotel]=useState<string|null>(null);
  const [expandedAttractions,setExpandedAttractions]=useState<Set<string>>(
    ()=>new Set(initialDays.flatMap(day=>day.attractions.filter(a=>!a.name.trim()).map(a=>a.id)))
  );
  const [expandedHotels,setExpandedHotels]=useState<Set<string>>(
    ()=>new Set(hotels.filter(h=>!h.name.trim()).map(h=>h.id))
  );
  const [expandedPackageItems,setExpandedPackageItems]=useState<Set<string>>(
    ()=>new Set([
      ...includedItems.filter(item=>!item.name.trim()).map(item=>"included:"+item.id),
      ...notIncludedItems.filter(item=>!item.name.trim()).map(item=>"excluded:"+item.id)
    ])
  );
  const [expandedReminders,setExpandedReminders]=useState<Set<string>>(
    ()=>new Set(reminders.filter(item=>!item.title.trim()&&!item.description.trim()).map(item=>item.id))
  );
  const [pendingHref,setPendingHref]=useState<string|null>(null);
  const [isDirty,setIsDirty]=useState(false);
  const baselineRef=useRef("");
  const mediaHydratedRef=useRef(false);

  const op=initialItinerary?.owner_name||data.op||currentStaffName;
  const label=useMemo(()=>`${daysCount}D${nightsCount}N`,[daysCount,nightsCount]);

  async function lookupTravelMedia(type:"attraction"|"hotel",name:string,cityArea=""){
    const q=name.trim();
    if(!q) return null;
    try{
      const res=await fetch("/api/internal-travel-media?type="+encodeURIComponent(type)+"&q="+encodeURIComponent(q)+"&limit=3",{cache:"no-store"});
      const data=await res.json().catch(()=>({}));
      const best=data?.ok&&Array.isArray(data.matches)&&data.matches.length?data.matches[0]:null;
      const threshold=type==="hotel"?0.72:0.58;
      if(best&&Number(best.score||0)>=threshold&&Array.isArray(best.images)&&best.images.length) return {...best,matchMethod:"fuzzy"};

      const semanticRes=await fetch("/api/internal-travel-media",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          action:"semantic_match",
          type,
          query:q,
          destination,
          cityArea
        })
      });
      const semantic=await semanticRes.json().catch(()=>({}));
      if(!semanticRes.ok||!semantic?.ok||!semantic?.match||!Array.isArray(semantic.match.images)||!semantic.match.images.length) return null;
      return semantic.match;
    }catch{return null;}
  }

  async function registerTravelMedia(type:"attraction"|"hotel",name:string,image:AttractionImage,cityArea=""){
    if(!name.trim()||!image.path||!image.url) return image;
    try{
      const res=await fetch("/api/internal-travel-media",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          type,name,path:image.path,url:image.url,originalName:image.name,
          destination,cityArea
        })
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok) return image;
      return {...image,libraryImageId:data.image_id,libraryPlaceId:data.place_id,source:"library"};
    }catch{return image;}
  }

  async function autoMatchAttraction(dayId:string,attractionId:string,name:string){
    if(!name.trim()) return;
    const current=days.find(d=>d.id===dayId)?.attractions.find(a=>a.id===attractionId);
    if(!current||current.images.length) return;
    const match=await lookupTravelMedia("attraction",name);
    if(!match) return;
    setDays(items=>items.map(d=>d.id===dayId?{
      ...d,
      attractions:d.attractions.map(a=>a.id===attractionId&&a.images.length===0
        ?{...a,images:match.images.slice(0,3)}
        :a)
    }:d));
  }

  async function autoMatchHotel(hotelId:string,name:string){
    if(!name.trim()) return;
    const current=hotels.find(h=>h.id===hotelId);
    if(!current||current.images.length) return;
    const match=await lookupTravelMedia("hotel",name,current.cityArea);
    if(!match) return;
    setHotels(items=>items.map(h=>h.id===hotelId&&h.images.length===0
      ?{...h,images:match.images.slice(0,5)}
      :h));
  }

  useEffect(()=>{
    if(mediaHydratedRef.current) return;
    mediaHydratedRef.current=true;

    void (async()=>{
      const attractionTasks:Promise<void>[]=[];
      for(const day of initialDays){
        for(const attraction of day.attractions){
          if(attraction.name.trim()&&attraction.images.length===0){
            attractionTasks.push((async()=>{
              const match=await lookupTravelMedia("attraction",attraction.name);
              if(!match) return;
              setDays(items=>items.map(d=>d.id===day.id?{
                ...d,
                attractions:d.attractions.map(a=>a.id===attraction.id&&a.images.length===0
                  ?{...a,images:match.images.slice(0,3)}
                  :a)
              }:d));
            })());
          }
        }
      }

      const hotelTasks:Promise<void>[]=[];
      for(const hotel of hotels){
        if(hotel.name.trim()&&hotel.images.length===0){
          hotelTasks.push((async()=>{
            const match=await lookupTravelMedia("hotel",hotel.name,hotel.cityArea);
            if(!match) return;
            setHotels(items=>items.map(h=>h.id===hotel.id&&h.images.length===0
              ?{...h,images:match.images.slice(0,5)}
              :h));
          })());
        }
      }

      await Promise.all([...attractionTasks,...hotelTasks]);
    })();
  },[]);

  useEffect(()=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(travelStartDate)||!/^\d{4}-\d{2}-\d{2}$/.test(travelEndDate)) return;
    const [sy,sm,sd]=travelStartDate.split("-").map(Number);
    const [ey,em,ed]=travelEndDate.split("-").map(Number);
    const start=Date.UTC(sy,sm-1,sd);
    const end=Date.UTC(ey,em-1,ed);
    if(end<start) return;
    const tripDays=Math.floor((end-start)/86400000)+1;
    setDaysCount(tripDays);
    setNightsCount(Math.max(0,tripDays-1));
  },[travelStartDate,travelEndDate]);

  function addFlight(){
    setSuggestedFlights(items=>[...items,emptyFlight()]);
  }

  function patchFlight(id:string,patch:Partial<SuggestedFlight>){
    setSuggestedFlights(items=>items.map(f=>f.id===id?{...f,...patch}:f));
  }

  function removeFlight(id:string){
    setSuggestedFlights(items=>items.filter(f=>f.id!==id));
  }

  function addHotel(){
    const hotel=emptyHotel();
    setHotels(items=>[...items,hotel]);
    setExpandedHotels(items=>new Set(items).add(hotel.id));
  }

  function toggleHotelEditor(id:string){
    setExpandedHotels(items=>{
      const next=new Set(items);
      if(next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function patchHotel(id:string,patch:Partial<HotelItem>){
    setHotels(items=>items.map(h=>h.id===id?{...h,...patch}:h));
  }

  function moveHotel(index:number,dir:-1|1){
    setHotels(items=>{
      const target=index+dir;
      if(target<0||target>=items.length) return items;
      const next=[...items];
      [next[index],next[target]]=[next[target],next[index]];
      return next;
    });
  }

  function duplicateHotel(index:number){
    setHotels(items=>{
      const src=items[index];
      const copy={...src,id:uid(),images:src.images.map(img=>({...img}))};
      setExpandedHotels(open=>new Set(open).add(copy.id));
      const next=[...items];
      next.splice(index+1,0,copy);
      return next;
    });
  }

  async function removeHotel(index:number){
    const hotel=hotels[index];
    if(!hotel) return;
    for(const image of hotel.images){
      if(!image.path||image.source==="library"||image.libraryImageId) continue;
      const form=new FormData();
      form.set("action","delete");
      form.set("path",image.path);
      await fetch("/api/internal-itinerary-images",{method:"POST",body:form}).catch(()=>null);
    }
    setHotels(items=>items.filter((_,i)=>i!==index));
    setExpandedHotels(items=>{
      const next=new Set(items);
      next.delete(hotel.id);
      return next;
    });
  }

  async function uploadHotelImages(hotelId:string,files:FileList|null){
    if(!files?.length) return;
    const hotel=hotels.find(h=>h.id===hotelId);
    if(!hotel?.name.trim()){alert(t("Enter the hotel name before uploading images so the system can save them to the Media Library.","请先填写酒店名称，再上传图片。这样系统才能把照片存入 Media Library。"));return;}
    const remaining=Math.max(0,5-(hotel?.images.length||0));
    if(remaining<=0){alert(t("A maximum of 5 images is allowed per hotel.","每间酒店最多上传 5 张图片。"));return;}
    const selected=Array.from(files).slice(0,remaining);
    if(files.length>remaining) alert(t("A maximum of 5 images is allowed per hotel. Extra images will not be uploaded.","每间酒店最多上传 5 张图片，多余图片不会上传。"));

    setUploadingHotel(hotelId);
    try{
      for(const file of selected){
        const form=new FormData();
        form.set("action","upload");
        form.set("file",file);
        const res=await fetch("/api/internal-itinerary-images",{method:"POST",body:form});
        const data=await res.json().catch(()=>({}));
        if(!res.ok||!data?.ok){alert(data?.error||"Unable to upload hotel image.");continue;}
        const rawImage:AttractionImage={path:data.path,url:data.url,name:data.name||file.name};
        const savedImage=await registerTravelMedia("hotel",hotel.name,rawImage,hotel.cityArea);
        setHotels(items=>items.map(h=>h.id===hotelId?{
          ...h,images:[...h.images,savedImage]
        }:h));
      }
    } finally {setUploadingHotel(null);}
  }

  async function deleteHotelImage(hotelId:string,imageIndex:number){
    const hotel=hotels.find(h=>h.id===hotelId);
    const image=hotel?.images[imageIndex];
    if(!image) return;
    if(image.path&&image.source!=="library"&&!image.libraryImageId){
      const form=new FormData();
      form.set("action","delete");
      form.set("path",image.path);
      const res=await fetch("/api/internal-itinerary-images",{method:"POST",body:form});
      if(!res.ok){
        const data=await res.json().catch(()=>({}));
        alert(data?.error||"Unable to delete hotel image.");
        return;
      }
    }
    setHotels(items=>items.map(h=>h.id===hotelId?{
      ...h,images:h.images.filter((_,i)=>i!==imageIndex)
    }:h));
  }

  function presetLabel(kind:"included"|"excluded",preset:string){
    const list=kind==="included"?includedPresets:excludedPresets;
    return list.find(([value])=>value===preset)?.[1]||"";
  }

  function addPackageItem(kind:"included"|"excluded"){
    const setter=kind==="included"?setIncludedItems:setNotIncludedItems;
    const item=emptyPackageItem();
    setter(items=>[...items,item]);
    setExpandedPackageItems(items=>new Set(items).add(kind+":"+item.id));
  }

  function togglePackageItem(kind:"included"|"excluded",id:string){
    const key=kind+":"+id;
    setExpandedPackageItems(items=>{
      const next=new Set(items);
      if(next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function patchPackageItem(kind:"included"|"excluded",id:string,patch:Partial<PackageItem>){
    const setter=kind==="included"?setIncludedItems:setNotIncludedItems;
    setter(items=>items.map(item=>item.id===id?{...item,...patch}:item));
  }

  function selectPackagePreset(kind:"included"|"excluded",id:string,preset:string){
    const label=presetLabel(kind,preset);
    patchPackageItem(kind,id,{preset,name:preset==="other"?"":label});
  }

  function movePackageItem(kind:"included"|"excluded",index:number,dir:-1|1){
    const setter=kind==="included"?setIncludedItems:setNotIncludedItems;
    setter(items=>{
      const target=index+dir;
      if(target<0||target>=items.length) return items;
      const next=[...items];
      [next[index],next[target]]=[next[target],next[index]];
      return next;
    });
  }

  function duplicatePackageItem(kind:"included"|"excluded",index:number){
    const setter=kind==="included"?setIncludedItems:setNotIncludedItems;
    setter(items=>{
      const src=items[index];
      const copy={...src,id:uid()};
      setExpandedPackageItems(open=>new Set(open).add(kind+":"+copy.id));
      const next=[...items];
      next.splice(index+1,0,copy);
      return next;
    });
  }

  function removePackageItem(kind:"included"|"excluded",id:string){
    const setter=kind==="included"?setIncludedItems:setNotIncludedItems;
    setter(items=>items.filter(item=>item.id!==id));
    setExpandedPackageItems(items=>{
      const next=new Set(items);
      next.delete(kind+":"+id);
      return next;
    });
  }

  function reminderPresetTitle(preset:string){
    return reminderPresets.find(([value])=>value===preset)?.[1]||"";
  }

  function addReminder(){
    const item=emptyReminder();
    setReminders(items=>[...items,item]);
    setExpandedReminders(items=>new Set(items).add(item.id));
  }

  function toggleReminder(id:string){
    setExpandedReminders(items=>{
      const next=new Set(items);
      if(next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function patchReminder(id:string,patch:Partial<ReminderItem>){
    setReminders(items=>items.map(item=>item.id===id?{...item,...patch}:item));
  }

  function selectReminderPreset(id:string,preset:string){
    patchReminder(id,{preset,title:preset==="other"?"":reminderPresetTitle(preset)});
  }

  function moveReminder(index:number,dir:-1|1){
    setReminders(items=>{
      const target=index+dir;
      if(target<0||target>=items.length) return items;
      const next=[...items];
      [next[index],next[target]]=[next[target],next[index]];
      return next;
    });
  }

  function duplicateReminder(index:number){
    setReminders(items=>{
      const src=items[index];
      const copy={...src,id:uid()};
      setExpandedReminders(open=>new Set(open).add(copy.id));
      const next=[...items];
      next.splice(index+1,0,copy);
      return next;
    });
  }

  function removeReminder(id:string){
    setReminders(items=>items.filter(item=>item.id!==id));
    setExpandedReminders(items=>{
      const next=new Set(items);
      next.delete(id);
      return next;
    });
  }

  function syncDays(){
    const target=Math.max(1,Number(daysCount)||1);
    setDays(current=>{
      if(current.length===target) return current;
      if(current.length>target) return current.slice(0,target);
      const next=[...current];
      while(next.length<target) next.push(emptyDay());
      return next;
    });
  }

  function patchDay(id:string,patch:Partial<DayItem>){
    setDays(items=>items.map(x=>x.id===id?{...x,...patch}:x));
  }

  function patchMeal(dayId:string,key:keyof MealInfo,value:string){
    setDays(items=>items.map(day=>day.id===dayId?{
      ...day,
      meals:{...day.meals,[key]:value}
    }:day));
  }

  function addAttraction(dayId:string){
    const attraction:AttractionItem={id:uid(),name:"",images:[]};
    setDays(items=>items.map(day=>day.id===dayId?{
      ...day,
      attractions:[...day.attractions,attraction]
    }:day));
    setExpandedAttractions(items=>new Set(items).add(attraction.id));
  }

  function toggleAttractionEditor(id:string){
    setExpandedAttractions(items=>{
      const next=new Set(items);
      if(next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function patchAttraction(dayId:string,attractionId:string,patch:Partial<AttractionItem>){
    setDays(items=>items.map(day=>day.id===dayId?{
      ...day,
      attractions:day.attractions.map(a=>a.id===attractionId?{...a,...patch}:a)
    }:day));
  }

  function removeAttraction(dayId:string,attractionId:string){
    setDays(items=>items.map(day=>day.id===dayId?{
      ...day,
      attractions:day.attractions.filter(a=>a.id!==attractionId)
    }:day));
    setExpandedAttractions(items=>{
      const next=new Set(items);
      next.delete(attractionId);
      return next;
    });
  }

  async function uploadAttractionImages(dayId:string,attractionId:string,files:FileList|null){
    if(!files?.length) return;
    const day=days.find(d=>d.id===dayId);
    const attraction=day?.attractions.find(a=>a.id===attractionId);
    if(!attraction?.name.trim()){alert(t("Enter the attraction name before uploading images so the system can save them to the Media Library.","请先填写景点名称，再上传图片。这样系统才能把照片存入 Media Library。"));return;}
    const remaining=Math.max(0,3-(attraction?.images.length||0));
    if(remaining<=0){alert(t("A maximum of 3 images is allowed per attraction.","每个景点最多上传 3 张图片。"));return;}
    const selected=Array.from(files).slice(0,remaining);
    if(files.length>remaining) alert(t("A maximum of 3 images is allowed per attraction. Extra images will not be uploaded.","每个景点最多上传 3 张图片，多余图片不会上传。"));

    setUploadingAttraction(attractionId);
    try{
      for(const file of selected){
        const form=new FormData();
        form.set("action","upload");
        form.set("file",file);
        const res=await fetch("/api/internal-itinerary-images",{method:"POST",body:form});
        const data=await res.json().catch(()=>({}));
        if(!res.ok||!data?.ok){alert(data?.error||"Unable to upload image.");continue;}
        const rawImage:AttractionImage={path:data.path,url:data.url,name:data.name||file.name};
        const savedImage=await registerTravelMedia("attraction",attraction.name,rawImage);
        setDays(items=>items.map(d=>d.id===dayId?{
          ...d,
          attractions:d.attractions.map(a=>a.id===attractionId?{
            ...a,
            images:[...a.images,savedImage]
          }:a)
        }:d));
      }
    } finally {setUploadingAttraction(null);}
  }

  async function deleteAttractionImage(dayId:string,attractionId:string,imageIndex:number){
    const day=days.find(d=>d.id===dayId);
    const attraction=day?.attractions.find(a=>a.id===attractionId);
    const image=attraction?.images[imageIndex];
    if(!image) return;
    if(image.path&&image.source!=="library"&&!image.libraryImageId){
      const form=new FormData();
      form.set("action","delete");
      form.set("path",image.path);
      const res=await fetch("/api/internal-itinerary-images",{method:"POST",body:form});
      if(!res.ok){
        const data=await res.json().catch(()=>({}));
        alert(data?.error||"Unable to delete image.");
        return;
      }
    }
    setDays(items=>items.map(d=>d.id===dayId?{
      ...d,
      attractions:d.attractions.map(a=>a.id===attractionId?{
        ...a,
        images:a.images.filter((_,i)=>i!==imageIndex)
      }:a)
    }:d));
  }

  function moveAttraction(dayId:string,index:number,dir:-1|1){
    setDays(items=>items.map(day=>{
      if(day.id!==dayId) return day;
      const target=index+dir;
      if(target<0||target>=day.attractions.length) return day;
      const next=[...day.attractions];
      [next[index],next[target]]=[next[target],next[index]];
      return {...day,attractions:next};
    }));
  }

  function moveDay(index:number,dir:-1|1){
    setDays(items=>{
      const target=index+dir;
      if(target<0||target>=items.length) return items;
      const next=[...items];
      [next[index],next[target]]=[next[target],next[index]];
      return next;
    });
  }

  function duplicateDay(index:number){
    setDays(items=>{
      const src=items[index];
      const copy:DayItem={
        ...src,
        id:uid(),
        completed:false,
        collapsed:false,
        meals:{...src.meals},
        attractions:src.attractions.map(a=>({...a,id:uid()}))
      };
      const next=[...items];
      next.splice(index+1,0,copy);
      setDaysCount(next.length);
      return next;
    });
  }

  function removeDay(index:number){
    setDays(items=>{
      if(items.length<=1) return items;
      const next=items.filter((_,i)=>i!==index);
      setDaysCount(next.length);
      return next;
    });
  }

  function addDay(){
    setDays(items=>{
      const next=[...items,emptyDay()];
      setDaysCount(next.length);
      return next;
    });
  }

  const currentSnapshot=JSON.stringify({
    title,destination,daysCount,nightsCount,customerName,status,
    departureCity,travelStartDate,travelEndDate,pax,tourType,suggestedFlights,days,hotels,includedItems,notIncludedItems,reminders
  });

  useEffect(()=>{
    if(!baselineRef.current){
      baselineRef.current=currentSnapshot;
      setIsDirty(false);
      return;
    }
    setIsDirty(currentSnapshot!==baselineRef.current);
  },[currentSnapshot]);

  useEffect(()=>{
    const beforeUnload=(event:BeforeUnloadEvent)=>{
      if(!isDirty) return;
      event.preventDefault();
      event.returnValue="";
    };

    const guardNavigation=(event:MouseEvent)=>{
      if(!isDirty||pendingHref) return;
      const target=event.target as HTMLElement|null;
      const anchor=target?.closest("a") as HTMLAnchorElement|null;
      if(!anchor||anchor.target==="_blank"||anchor.hasAttribute("download")) return;

      const url=new URL(anchor.href,window.location.href);
      if(url.origin!==window.location.origin) return;
      if(url.pathname===window.location.pathname&&url.search===window.location.search) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingHref(url.pathname+url.search+url.hash);
    };

    window.addEventListener("beforeunload",beforeUnload);
    document.addEventListener("click",guardNavigation,true);
    return ()=>{
      window.removeEventListener("beforeunload",beforeUnload);
      document.removeEventListener("click",guardNavigation,true);
    };
  },[isDirty,pendingHref]);

  async function save():Promise<boolean>{
    setSaving(true); setMessage("");
    try{
      const payload={
        source_inquiry_id:resolvedSourceInquiryId||"",
        title,destination,
        days_count:Math.max(1,Number(daysCount)||1),
        nights_count:Math.max(0,Number(nightsCount)||0),
        customer_name:customerName,
        status,
        itinerary_data:{
          departureCity,travelStartDate,travelEndDate,pax,tourType,suggestedFlights,
          days,hotels,includedItems,notIncludedItems,reminders,op,opStaffId:initialItinerary?.owner_id||currentStaffId,
          sourceInquiryId:resolvedSourceInquiryId,sourceInquiryNo:resolvedSourceInquiryNo,sourceInquirySnapshot:resolvedSourceInquirySnapshot
        }
      };
      const res=await fetch("/api/internal-itineraries",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({id:itineraryId||null,payload})
      });
      const result=await res.json().catch(()=>({}));
      if(!res.ok||!result?.ok){setMessage(result?.error||t("Unable to save itinerary.","无法保存行程。"));return false;}
      baselineRef.current=currentSnapshot;
      setIsDirty(false);
      if(!itineraryId&&result.id){router.replace("/itineraries/"+result.id+"/edit");}
      else router.refresh();
      setMessage(t("Saved","已保存"));
      return true;
    } finally {setSaving(false);}
  }

  async function saveAndLeave(){
    const href=pendingHref;
    if(!href) return;
    const ok=await save();
    if(ok){
      setPendingHref(null);
      window.location.href=href;
    }
  }

  function leaveWithoutSaving(){
    const href=pendingHref;
    if(!href) return;
    baselineRef.current=currentSnapshot;
    setIsDirty(false);
    setPendingHref(null);
    window.location.href=href;
  }

  return <div className="itinerary-editor">
    {resolvedSourceInquiryId&&<section className="quote-source-inquiry">
      <div>
        <span>{t("SOURCE INQUIRY","来源询价")}</span>
        <strong>{resolvedSourceInquiryNo||"Linked Inquiry"}</strong>
        {resolvedSourceInquirySnapshot&&<small>{[resolvedSourceInquirySnapshot.destination,resolvedSourceInquirySnapshot.daysCount&&resolvedSourceInquirySnapshot.nightsCount?`${resolvedSourceInquirySnapshot.daysCount}D${resolvedSourceInquirySnapshot.nightsCount}N`:"",resolvedSourceInquirySnapshot.pax?`${resolvedSourceInquirySnapshot.pax} Pax`:""].filter(Boolean).join(" · ")}</small>}
      </div>
      <button className="btn" type="button" onClick={()=>isDirty?setPendingHref("/inquiries/"+resolvedSourceInquiryId):router.push("/inquiries/"+resolvedSourceInquiryId)}>{t("Open Inquiry","打开询价")}</button>
    </section>}
    <div className="page-head itinerary-editor-head">
      <div className="itinerary-editor-title-block">
        <h1>{itineraryId?t("Edit Itinerary","编辑行程"):t("New Itinerary","新建行程")}</h1>
        <div className="itinerary-editor-meta-line">
          <span>{initialItinerary?.itinerary_no||t("New Draft","新草稿")}</span>
          <span className={"status status-"+status}>{status==="ready"?t("Ready","已就绪"):status==="confirmed"?t("Confirmed","已确认"):status==="archived"?t("Archived","已归档"):t("Draft","草稿")}</span>
        </div>
      </div>
      <div className="detail-actions itinerary-editor-actions">
        {isDirty&&<span className="unsaved-badge">{t("Unsaved changes","尚未保存")}</span>}
        <button className="btn itinerary-editor-back" onClick={()=>isDirty?setPendingHref("/itineraries"):router.push("/itineraries")}>{t("← Back","← 返回")}</button>
        <button className="btn primary" onClick={()=>void save()} disabled={saving}>{saving?t("Saving...","保存中..."):t("Save Itinerary","保存行程")}</button>
      </div>
    </div>

    <section className="panel itinerary-editor-basics">
      <div className="panel-head"><h2>{t("Basic Information","基本资料")}</h2><span className="itinerary-code-preview">{label}</span></div>

      <div className="itinerary-basic-group">
        <div className="itinerary-basic-group-head"><strong>{t("Trip","行程")}</strong><span>{t("Route, dates and trip duration","路线、日期与行程天数")}</span></div>
        <div className="itinerary-basic-grid itinerary-basic-trip">
          <label className="field"><span>{t("Departure City","出发城市")}</span><input value={departureCity} onChange={e=>setDepartureCity(e.target.value)} placeholder="Kuala Lumpur"/></label>
          <label className="field"><span>{t("Destination","目的地")}</span><input value={destination} onChange={e=>setDestination(e.target.value)} placeholder="Chongqing / Japan / Thailand"/></label>
          <label className="field"><span>{t("Travel Start Date","出发日期")}</span><input type="date" value={travelStartDate} onChange={e=>setTravelStartDate(e.target.value)}/></label>
          <label className="field"><span>{t("Travel End Date","返程日期")}</span><input type="date" value={travelEndDate} onChange={e=>setTravelEndDate(e.target.value)}/></label>
          <div className="itinerary-duration-control">
            <div><span>{t("Duration","行程天数")}</span><strong>{label}</strong></div>
            <label className="field"><span>{t("Days","天")}</span><input type="number" min="1" value={daysCount} onChange={e=>setDaysCount(Math.max(1,Number(e.target.value)||1))}/></label>
            <label className="field"><span>{t("Nights","晚")}</span><input type="number" min="0" value={nightsCount} onChange={e=>setNightsCount(Math.max(0,Number(e.target.value)||0))}/></label>
            <button type="button" className="btn itinerary-sync-btn" onClick={syncDays}>{t(`Sync ${daysCount} Day${daysCount===1?"":"s"}`,`同步为 ${daysCount} 天`)}</button>
          </div>
        </div>
      </div>

      <div className="itinerary-basic-group">
        <div className="itinerary-basic-group-head"><strong>{t("Booking","预订资料")}</strong><span>{t("Traveller and ownership details","旅客及负责人资料")}</span></div>
        <div className="itinerary-basic-grid itinerary-basic-booking">
          <label className="field"><span>{t("Pax","人数")}</span><input type="number" min="1" value={pax} onChange={e=>setPax(e.target.value===""?"":Math.max(1,Number(e.target.value)||1))} placeholder="20"/></label>
          <label className="field"><span>{t("Tour Type","团型")}</span><input value={tourType} onChange={e=>setTourType(e.target.value)} placeholder={t("Private Tour / Company Trip","私人定制团 / 公司团")}/></label>
          <label className="field"><span>{t("Customer / Company","客户 / 公司")}</span><input value={customerName} onChange={e=>setCustomerName(e.target.value)}/></label>
          <label className="field"><span>OP</span><input value={op} readOnly className="system-fixed-input"/></label>
        </div>
      </div>

      <div className="itinerary-basic-group">
        <div className="itinerary-basic-group-head"><strong>{t("Document","文件")}</strong><span>{t("Itinerary naming and document state","行程名称与文件状态")}</span></div>
        <div className="itinerary-basic-grid itinerary-basic-document">
          <label className="field"><span>{t("Itinerary Title","行程标题")}</span><input value={title} onChange={e=>setTitle(e.target.value)}/></label>
          <label className="field"><span>{t("Status","状态")}</span><select value={status} onChange={e=>setStatus(e.target.value)}><option value="draft">{t("Draft","草稿")}</option><option value="ready">{t("Ready","已就绪")}</option><option value="confirmed">{t("Confirmed","已确认")}</option><option value="archived">{t("Archived","已归档")}</option></select></label>
        </div>
      </div>
    </section>

    <section className="panel">
      <div className="panel-head">
        <div><h2>{t("Suggested Flights","建议航班")}</h2><p className="panel-subtext">{t("Optional. This section is hidden from exports when empty.","选填。没有填写航班时，导出文件会自动隐藏此区块。")}</p></div>
        <button className="btn itinerary-add-action" type="button" onClick={addFlight}>{t("+ Add Flight","+ 新增航班")}</button>
      </div>
      {suggestedFlights.length>0 ? <div className="table-wrap"><table className="itinerary-flight-table">
        <thead><tr><th>{t("Route","路线")}</th><th>{t("Flight No.","航班号")}</th><th>{t("Date","日期")}</th><th>{t("Departure","起飞")}</th><th>{t("Arrival","抵达")}</th><th>{t("Remarks","备注")}</th><th>{t("Action","操作")}</th></tr></thead>
        <tbody>{suggestedFlights.map(f=><tr key={f.id}>
          <td><div className="itinerary-flight-route">
            <input maxLength={3} value={f.from} onChange={e=>patchFlight(f.id,{from:e.target.value.toUpperCase().replace(/[^A-Z]/g,"").slice(0,3)})} placeholder="KUL"/>
            <span>→</span>
            <input maxLength={3} value={f.to} onChange={e=>patchFlight(f.id,{to:e.target.value.toUpperCase().replace(/[^A-Z]/g,"").slice(0,3)})} placeholder="CKG"/>
          </div></td>
          <td><input value={f.flightNo} onChange={e=>patchFlight(f.id,{flightNo:e.target.value.toUpperCase()})} placeholder="3U3774"/></td>
          <td><input type="date" value={f.date} onChange={e=>patchFlight(f.id,{date:e.target.value})}/></td>
          <td><input type="time" value={f.departureTime} onChange={e=>patchFlight(f.id,{departureTime:e.target.value})}/></td>
          <td><input type="time" value={f.arrivalTime} onChange={e=>patchFlight(f.id,{arrivalTime:e.target.value})}/></td>
          <td><input value={f.remarks} onChange={e=>patchFlight(f.id,{remarks:e.target.value})} placeholder="Sichuan Airlines"/></td>
          <td><button type="button" className="danger-link" onClick={()=>removeFlight(f.id)}>{t("Delete","删除")}</button></td>
        </tr>)}</tbody>
      </table></div> : <div className="itinerary-attraction-empty itinerary-editor-empty">{t("No suggested flights yet. Add one when needed.","尚未填写建议航班。需要时可新增航班。")}</div>}
    </section>

    <section className="panel">
      <div className="panel-head">
        <div><h2>{t("Daily Itinerary","每日行程")}</h2><p className="panel-subtext">{t("Add the route, itinerary content, hotel, meals and attractions for each day.","填写每天的路线、行程内容、酒店、餐食及景点。")}</p></div>
        <button className="btn itinerary-add-action" type="button" onClick={addDay}>{t("+ Add Day","+ 新增一天")}</button>
      </div>

      <div className="itinerary-day-list">
        {days.map((day,index)=><article className="itinerary-day-card" key={day.id}>
          <div className="itinerary-day-head">
            <div className="itinerary-day-title-wrap">
              <div><span>{t("DAY","第")} {String(index+1).padStart(2,"0")}</span><strong>{t(`Day ${index+1}`,`第 ${index+1} 天`)}</strong></div>
              <span className={"itinerary-day-status "+(day.completed?"completed":"draft")}>{day.completed?t("✓ Completed","✓ 已完成"):t("Draft","草稿")}</span>
            </div>
            <div className="itinerary-day-actions">
              {day.completed
                ? <button type="button" className="day-status-btn" onClick={()=>patchDay(day.id,{completed:false})}>{t("Mark as Draft","标记为草稿")}</button>
                : <button type="button" className="day-complete-btn" onClick={()=>patchDay(day.id,{completed:true,collapsed:true})}>{t("✓ Complete","✓ 完成")}</button>}
              <button type="button" className="day-collapse-btn" onClick={()=>patchDay(day.id,{collapsed:!day.collapsed})}>{day.collapsed?t("Expand","展开"):t("Collapse","收起")}</button>
              <details className="itinerary-more-menu">
                <summary aria-label={t("More day actions","更多每日行程操作")} title={t("More actions","更多操作")}>•••</summary>
                <div className="itinerary-more-menu-popover">
                  <button type="button" onClick={()=>moveDay(index,-1)} disabled={index===0}>{t("Move Up","上移")}</button>
                  <button type="button" onClick={()=>moveDay(index,1)} disabled={index===days.length-1}>{t("Move Down","下移")}</button>
                  <button type="button" onClick={()=>duplicateDay(index)}>{t("Duplicate","复制")}</button>
                  <button type="button" className="danger-link" onClick={()=>removeDay(index)} disabled={days.length<=1}>{t("Delete","删除")}</button>
                </div>
              </details>
            </div>
          </div>

          {day.collapsed ? <div className="itinerary-day-collapsed-summary">
            <div className="day-summary-primary">
              <strong>{day.title||t("Route title not entered","未填写路线标题")}</strong>
              <span>{day.hotel||t("Hotel not entered","尚未填写酒店")}</span>
            </div>
            <div className="day-summary-meta">
              {[day.meals.breakfast&&day.meals.breakfast!=="-"?`${t("Breakfast","早餐")}: ${day.meals.breakfast}`:"",day.meals.lunch&&day.meals.lunch!=="-"?`${t("Lunch","午餐")}: ${day.meals.lunch}`:"",day.meals.dinner&&day.meals.dinner!=="-"?`${t("Dinner","晚餐")}: ${day.meals.dinner}`:"",day.attractions.length?t(`${day.attractions.length} Attraction${day.attractions.length===1?"":"s"}`,`${day.attractions.length} 个景点`):"",day.attractions.reduce((sum,a)=>sum+a.images.length,0)?t(`${day.attractions.reduce((sum,a)=>sum+a.images.length,0)} Photo${day.attractions.reduce((sum,a)=>sum+a.images.length,0)===1?"":"s"}`,`${day.attractions.reduce((sum,a)=>sum+a.images.length,0)} 张图片`):""].filter(Boolean).join(" · ")||t("No meals or attractions added","尚未填写餐食或景点")}
            </div>
          </div> : <>

          <div className="itinerary-day-main-grid">
            <label className="field itinerary-route-field">
              <span>{t("Route / Title","路线标题")}</span>
              <input value={day.title} onChange={e=>patchDay(day.id,{title:e.target.value})} placeholder={t("Singapore → Chongqing","新加坡 → 重庆")}/>
            </label>
            <label className="field">
              <span>{t("Hotel","酒店")}</span>
              <input value={day.hotel} onChange={e=>patchDay(day.id,{hotel:e.target.value})} placeholder={t("Hotel name","酒店名称")}/>
            </label>
          </div>

          <label className="field">
            <span>{t("Itinerary Content","行程内容")}</span>
            <textarea value={day.content} onChange={e=>patchDay(day.id,{content:e.target.value})} placeholder={t("Enter the day's itinerary, transport, attractions and check-in arrangements...","输入当天行程内容，例如集合、交通、景点、入住安排...")}/>
          </label>

          <div className="itinerary-meal-section">
            <div className="itinerary-subhead"><strong>{t("Meals","餐食")}</strong></div>
            <div className="itinerary-meal-grid">
              <label className="field"><span>{t("Breakfast","早餐")}</span><input value={day.meals.breakfast} onChange={e=>patchMeal(day.id,"breakfast",e.target.value)} placeholder="Hotel Breakfast / -"/></label>
              <label className="field"><span>{t("Lunch","午餐")}</span><input value={day.meals.lunch} onChange={e=>patchMeal(day.id,"lunch",e.target.value)} placeholder="Lunch / Meal On Board / -"/></label>
              <label className="field"><span>{t("Dinner","晚餐")}</span><input value={day.meals.dinner} onChange={e=>patchMeal(day.id,"dinner",e.target.value)} placeholder="Dinner / Hotpot / -"/></label>
            </div>
          </div>

          <div className="itinerary-attraction-section">
            <div className="itinerary-subhead">
              <div><strong>{t("Attractions","景点")}</strong><span>{t("Each attraction can have its own name and images.","每个景点可以独立填写名称及图片。")}</span></div>
              <button type="button" className="btn itinerary-add-action" onClick={()=>addAttraction(day.id)}>{t("+ Add Attraction","+ 新增景点")}</button>
            </div>

            {day.attractions.length>0 && <div className="itinerary-attraction-list">
              {day.attractions.map((attraction,aIndex)=>{
                const expanded=expandedAttractions.has(attraction.id);
                return <div className={"itinerary-attraction-row "+(expanded?"expanded":"collapsed")} key={attraction.id}>
                  <div className="itinerary-attraction-summary">
                    <div className="itinerary-attraction-index">{String(aIndex+1).padStart(2,"0")}</div>
                    {attraction.images[0]
                      ? <img className="itinerary-attraction-summary-image" src={attraction.images[0].url} alt={attraction.name||"Attraction"}/>
                      : <div className="itinerary-attraction-summary-image placeholder" aria-label="No image">▧</div>}
                    <div className="itinerary-attraction-summary-copy">
                      <strong>{attraction.name||"New Attraction"}</strong>
                      <span>{attraction.images.length} photo{attraction.images.length===1?"":"s"}</span>
                    </div>
                    <div className="itinerary-attraction-summary-actions">
                      <button type="button" className="disclosure-action" onClick={()=>toggleAttractionEditor(attraction.id)}>{expanded?t("Done","完成"):t("Edit","编辑")}</button>
                      <details className="itinerary-more-menu">
                        <summary aria-label={t("More attraction actions","更多景点操作")} title={t("More actions","更多操作")}>•••</summary>
                        <div className="itinerary-more-menu-popover">
                          <button type="button" onClick={()=>moveAttraction(day.id,aIndex,-1)} disabled={aIndex===0}>{t("Move Up","上移")}</button>
                          <button type="button" onClick={()=>moveAttraction(day.id,aIndex,1)} disabled={aIndex===day.attractions.length-1}>{t("Move Down","下移")}</button>
                          <button type="button" className="danger-link" onClick={()=>removeAttraction(day.id,attraction.id)}>{t("Delete","删除")}</button>
                        </div>
                      </details>
                    </div>
                  </div>
                  {expanded&&<div className="itinerary-attraction-editor">
                    <label className="field">
                      <span>{t("Attraction Name","景点名称")}</span>
                      <input value={attraction.name} onChange={e=>patchAttraction(day.id,attraction.id,{name:e.target.value})} onBlur={e=>void autoMatchAttraction(day.id,attraction.id,e.target.value)} placeholder={t("Attraction name","景点名称")}/>
                    </label>
                    <div className="field itinerary-upload-field">
                      <span>{t("Upload Images","上传景点图片")}</span>
                      <label className="itinerary-upload-control">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                          multiple
                          disabled={uploadingAttraction===attraction.id||attraction.images.length>=3}
                          onChange={e=>{void uploadAttractionImages(day.id,attraction.id,e.target.files);e.currentTarget.value="";}}
                        />
                        <b>{uploadingAttraction===attraction.id?t("Uploading...","上传中..."):attraction.images.length>=3?t("Maximum 3 Images","最多 3 张图片"):t("+ Attach Images","+ 添加图片")}</b>
                        <small>{attraction.images.length}/3 · JPG, PNG, WEBP, HEIC · Max 10MB each</small>
                      </label>
                    </div>
                    {attraction.images.length>0&&<div className="itinerary-attraction-previews">
                      {attraction.images.map((image,imageIndex)=><div className="itinerary-attraction-preview" key={image.path||image.url||imageIndex}>
                        <img src={image.url} alt={attraction.name||image.name||"Attraction"}/>
                        <button className="icon-action-btn icon-action-remove" type="button" aria-label="Delete image" onClick={()=>void deleteAttractionImage(day.id,attraction.id,imageIndex)}>×</button>
                      </div>)}
                    </div>}
                  </div>}
                </div>;
              })}
            </div>}

            {!day.attractions.length && <div className="itinerary-attraction-empty itinerary-editor-empty">{t("No attractions added for this day.","当天尚未加入景点。")}</div>}
          </div>
          </>}
        </article>)}
      </div>
    </section>

    <section className="panel">
      <div className="panel-head">
        <div><h2>{t("Hotel Introduction","酒店介绍")}</h2><p className="panel-subtext">{t("Optional. Add multiple hotels when needed; empty sections are hidden from exports.","选填。可加入多间酒店；未填写时导出文件会自动隐藏。")}</p></div>
        <button className="btn itinerary-add-action" type="button" onClick={addHotel}>{t("+ Add Hotel","+ 新增酒店")}</button>
      </div>

      {hotels.length>0 ? <div className="itinerary-hotel-list">
        {hotels.map((hotel,index)=>{
          const expanded=expandedHotels.has(hotel.id);
          const summaryMeta=[hotel.cityArea,hotel.starRating,hotel.stayNights,hotel.images.length?hotel.images.length+" Photos":""].filter(Boolean).join(" · ");
          return <article className={"itinerary-hotel-card "+(expanded?"expanded":"collapsed")} key={hotel.id}>
            <div className="itinerary-hotel-head">
              <div className="itinerary-hotel-summary-copy">
                <span>HOTEL {String(index+1).padStart(2,"0")}</span>
                <strong>{hotel.name||t("New Hotel","新酒店")}</strong>
                <small>{summaryMeta||t("Hotel details not completed","酒店资料尚未完成")}</small>
              </div>
              <div className="itinerary-day-actions">
                <button type="button" className="disclosure-action" onClick={()=>toggleHotelEditor(hotel.id)}>{expanded?t("Done","完成"):t("Edit","编辑")}</button>
                <details className="itinerary-more-menu">
                  <summary aria-label={t("More hotel actions","更多酒店操作")} title={t("More actions","更多操作")}>•••</summary>
                  <div className="itinerary-more-menu-popover">
                    <button type="button" onClick={()=>moveHotel(index,-1)} disabled={index===0}>{t("Move Up","上移")}</button>
                    <button type="button" onClick={()=>moveHotel(index,1)} disabled={index===hotels.length-1}>{t("Move Down","下移")}</button>
                    <button type="button" onClick={()=>duplicateHotel(index)}>{t("Duplicate","复制")}</button>
                    <button type="button" className="danger-link" onClick={()=>void removeHotel(index)}>{t("Delete","删除")}</button>
                  </div>
                </details>
              </div>
            </div>

            {!expanded&&hotel.images.length>0&&<div className="itinerary-hotel-summary-images">
              {hotel.images.slice(0,3).map((image,imageIndex)=><img key={image.path||image.url||imageIndex} src={image.url} alt={hotel.name||"Hotel"}/>)}
              {hotel.images.length>3&&<span>+{hotel.images.length-3}</span>}
            </div>}

            {expanded&&<div className="itinerary-hotel-editor">
              <div className="itinerary-hotel-grid">
                <label className="field"><span>{t("Hotel Name","酒店名称")}</span><input value={hotel.name} onChange={e=>patchHotel(hotel.id,{name:e.target.value})} onBlur={e=>void autoMatchHotel(hotel.id,e.target.value)} placeholder={t("Hotel name","酒店名称")}/></label>
                <label className="field"><span>{t("City / Area","城市 / 地区")}</span><input value={hotel.cityArea} onChange={e=>patchHotel(hotel.id,{cityArea:e.target.value})} placeholder="Chongqing / Guanyinqiao"/></label>
                <label className="field"><span>{t("Star Rating","星级")}</span><input value={hotel.starRating} onChange={e=>patchHotel(hotel.id,{starRating:e.target.value})} placeholder={t("4 Star","4 星级")}/></label>
                <label className="field"><span>{t("Stay Nights","入住晚数")}</span><input value={hotel.stayNights} onChange={e=>patchHotel(hotel.id,{stayNights:e.target.value})} placeholder="Night 1 / 3 / 4 / 5"/></label>
                <label className="field"><span>{t("Room Size","房间面积")}</span><div className="unit-input-wrap"><input type="number" min="0" step="0.1" value={hotel.roomSize} onChange={e=>patchHotel(hotel.id,{roomSize:e.target.value===""?"":Math.max(0,Number(e.target.value))})} placeholder="28"/><b>m²</b></div></label>
                <label className="field"><span>{t("Opening Year","开业年份")}</span><input inputMode="numeric" value={hotel.openingYear} onChange={e=>patchHotel(hotel.id,{openingYear:e.target.value.replace(/\D/g,"").slice(0,4)})} placeholder="2013"/></label>
                <label className="field"><span>{t("Renovation Year","装修年份")}</span><input inputMode="numeric" value={hotel.renovationYear} onChange={e=>patchHotel(hotel.id,{renovationYear:e.target.value.replace(/\D/g,"").slice(0,4)})} placeholder={t("2024 / optional","2024 / 留空")}/></label>
              </div>

              <label className="field">
                <span>{t("Nearby / Location Notes","周边 / 地理位置说明")}</span>
                <textarea value={hotel.nearbyNotes} onChange={e=>patchHotel(hotel.id,{nearbyNotes:e.target.value})} placeholder={t("e.g. 2 km from the city centre, around 15 minutes on foot.","例如：距离市中心约 2km，步行约 15 分钟。")}/>
              </label>

              <div className="itinerary-hotel-images">
                <div className="field itinerary-upload-field">
                  <span>{t("Hotel Images","酒店图片")}</span>
                  <label className="itinerary-upload-control">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                      multiple
                      disabled={uploadingHotel===hotel.id||hotel.images.length>=5}
                      onChange={e=>{void uploadHotelImages(hotel.id,e.target.files);e.currentTarget.value="";}}
                    />
                    <b>{uploadingHotel===hotel.id?t("Uploading...","上传中..."):hotel.images.length>=5?t("Maximum 5 Images","最多 5 张图片"):t("+ Attach Hotel Images","+ 添加酒店图片")}</b>
                    <small>{hotel.images.length}/5 · JPG, PNG, WEBP, HEIC · Max 10MB each</small>
                  </label>
                </div>

                {hotel.images.length>0&&<div className="itinerary-hotel-image-grid">
                  {hotel.images.map((image,imageIndex)=><div className="itinerary-hotel-image" key={image.path||image.url||imageIndex}>
                    <img src={image.url} alt={hotel.name||image.name||"Hotel"}/>
                    <button className="icon-action-btn icon-action-remove" type="button" aria-label="Delete image" onClick={()=>void deleteHotelImage(hotel.id,imageIndex)}>×</button>
                  </div>)}
                </div>}
              </div>
            </div>}
          </article>;
        })}
      </div> : <div className="itinerary-attraction-empty itinerary-editor-empty">{t("No hotel details yet. Add a hotel when needed.","尚未加入酒店资料。需要时可新增酒店。")}</div>}
    </section>

    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>{t("Included / Not Included","配套包含与不包含")}</h2>
          <p className="panel-subtext">{t("Use presets or choose Other to enter a custom item.","使用常用项目快速加入，也可选择其他并手动输入。")}</p>
        </div>
      </div>

      <div className="itinerary-package-columns">
        <div className="itinerary-package-card included">
          <div className="itinerary-package-head">
            <div><strong>{t("Included","配套包含")}</strong><span>{includedItems.length} {t(includedItems.length===1?"item":"items","项")}</span></div>
            <button className="btn itinerary-add-action" type="button" onClick={()=>addPackageItem("included")}>{t("+ Add Item","+ 新增项目")}</button>
          </div>
          {includedItems.length>0 ? <div className="itinerary-package-list">
            {includedItems.map((item,index)=>{
              const expanded=expandedPackageItems.has("included:"+item.id);
              return <div className={"itinerary-package-row "+(expanded?"expanded":"collapsed")} key={item.id}>
                <div className="itinerary-package-summary">
                  <div className="itinerary-package-index">{String(index+1).padStart(2,"0")}</div>
                  <div className="itinerary-package-summary-copy">
                    <strong>{item.name||"New Included Item"}</strong>
                    <span>{item.preset==="other"?t("Custom item","自定义项目"):uiPresetLabel(presetLabel("included",item.preset))}</span>
                  </div>
                  <div className="itinerary-package-actions">
                    <button type="button" className="disclosure-action" onClick={()=>togglePackageItem("included",item.id)}>{expanded?t("Done","完成"):t("Edit","编辑")}</button>
                    <button type="button" aria-label="Move item up" onClick={()=>movePackageItem("included",index,-1)} disabled={index===0}>↑</button>
                    <button type="button" aria-label="Move item down" onClick={()=>movePackageItem("included",index,1)} disabled={index===includedItems.length-1}>↓</button>
                    <button type="button" onClick={()=>duplicatePackageItem("included",index)}>{t("Duplicate","复制")}</button>
                    <button type="button" className="danger-link" onClick={()=>removePackageItem("included",item.id)}>{t("Delete","删除")}</button>
                  </div>
                </div>
                {expanded&&<div className="itinerary-package-editor">
                  <label className="field">
                    <span>{t("Preset","常用项目")}</span>
                    <select value={item.preset} onChange={e=>selectPackagePreset("included",item.id,e.target.value)}>
                      {includedPresets.map(([value,label])=><option key={value} value={value}>{uiPresetLabel(label)}</option>)}
                    </select>
                  </label>
                  <label className="field itinerary-package-name">
                    <span>{t("Item Name","项目名称")}</span>
                    <input value={item.name} onChange={e=>patchPackageItem("included",item.id,{name:e.target.value})} placeholder={item.preset==="other"?t("Enter item name","手动输入项目名称"):t("Edit item name if needed","可继续修改项目名称")}/>
                  </label>
                </div>}
              </div>;
            })}
          </div> : <div className="itinerary-attraction-empty itinerary-editor-empty">{t("No included items yet.","尚未加入配套包含项目。")}</div>}
        </div>

        <div className="itinerary-package-card excluded">
          <div className="itinerary-package-head">
            <div><strong>{t("Not Included","配套不包含")}</strong><span>{notIncludedItems.length} {t(notIncludedItems.length===1?"item":"items","项")}</span></div>
            <button className="btn itinerary-add-action" type="button" onClick={()=>addPackageItem("excluded")}>{t("+ Add Item","+ 新增项目")}</button>
          </div>
          {notIncludedItems.length>0 ? <div className="itinerary-package-list">
            {notIncludedItems.map((item,index)=>{
              const expanded=expandedPackageItems.has("excluded:"+item.id);
              return <div className={"itinerary-package-row "+(expanded?"expanded":"collapsed")} key={item.id}>
                <div className="itinerary-package-summary">
                  <div className="itinerary-package-index">{String(index+1).padStart(2,"0")}</div>
                  <div className="itinerary-package-summary-copy">
                    <strong>{item.name||"New Not Included Item"}</strong>
                    <span>{item.preset==="other"?t("Custom item","自定义项目"):uiPresetLabel(presetLabel("excluded",item.preset))}</span>
                  </div>
                  <div className="itinerary-package-actions">
                    <button type="button" className="disclosure-action" onClick={()=>togglePackageItem("excluded",item.id)}>{expanded?t("Done","完成"):t("Edit","编辑")}</button>
                    <button type="button" aria-label="Move item up" onClick={()=>movePackageItem("excluded",index,-1)} disabled={index===0}>↑</button>
                    <button type="button" aria-label="Move item down" onClick={()=>movePackageItem("excluded",index,1)} disabled={index===notIncludedItems.length-1}>↓</button>
                    <button type="button" onClick={()=>duplicatePackageItem("excluded",index)}>{t("Duplicate","复制")}</button>
                    <button type="button" className="danger-link" onClick={()=>removePackageItem("excluded",item.id)}>{t("Delete","删除")}</button>
                  </div>
                </div>
                {expanded&&<div className="itinerary-package-editor">
                  <label className="field">
                    <span>{t("Preset","常用项目")}</span>
                    <select value={item.preset} onChange={e=>selectPackagePreset("excluded",item.id,e.target.value)}>
                      {excludedPresets.map(([value,label])=><option key={value} value={value}>{uiPresetLabel(label)}</option>)}
                    </select>
                  </label>
                  <label className="field itinerary-package-name">
                    <span>{t("Item Name","项目名称")}</span>
                    <input value={item.name} onChange={e=>patchPackageItem("excluded",item.id,{name:e.target.value})} placeholder={item.preset==="other"?t("Enter item name","手动输入项目名称"):t("Edit item name if needed","可继续修改项目名称")}/>
                  </label>
                </div>}
              </div>;
            })}
          </div> : <div className="itinerary-attraction-empty itinerary-editor-empty">{t("No excluded items yet.","尚未加入配套不包含项目。")}</div>}
        </div>
      </div>
    </section>

    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>{t("Friendly Reminder","温馨提醒")}</h2>
          <p className="panel-subtext">{t("Optional. Reminders appear only when content is added.","选填。只有填写内容后才会显示提醒。")}</p>
        </div>
        <button className="btn itinerary-add-action" type="button" onClick={addReminder}>{t("+ Add Reminder","+ 新增提醒")}</button>
      </div>

      {reminders.length>0 ? <div className="itinerary-reminder-list">
        {reminders.map((item,index)=>{
          const expanded=expandedReminders.has(item.id);
          return <article className={"itinerary-reminder-row "+(expanded?"expanded":"collapsed")} key={item.id}>
            <div className="itinerary-reminder-summary">
              <div className="itinerary-reminder-index">{String(index+1).padStart(2,"0")}</div>
              <div className="itinerary-reminder-summary-copy">
                <strong>{item.title||t("New Reminder","新提醒")}</strong>
                <span>{item.description||uiPresetLabel(reminderPresetTitle(item.preset))||t("No description yet","尚未填写内容")}</span>
              </div>
              <div className="itinerary-reminder-actions">
                <button type="button" className="disclosure-action" onClick={()=>toggleReminder(item.id)}>{expanded?t("Done","完成"):t("Edit","编辑")}</button>
                <button type="button" aria-label="Move reminder up" onClick={()=>moveReminder(index,-1)} disabled={index===0}>↑</button>
                <button type="button" aria-label="Move reminder down" onClick={()=>moveReminder(index,1)} disabled={index===reminders.length-1}>↓</button>
                <button type="button" onClick={()=>duplicateReminder(index)}>{t("Duplicate","复制")}</button>
                <button type="button" className="danger-link" onClick={()=>removeReminder(item.id)}>{t("Delete","删除")}</button>
              </div>
            </div>
            {expanded&&<div className="itinerary-reminder-editor">
              <label className="field">
                <span>{t("Preset","常用提醒")}</span>
                <select value={item.preset} onChange={e=>selectReminderPreset(item.id,e.target.value)}>
                  {reminderPresets.map(([value,label])=><option key={value} value={value}>{uiPresetLabel(label)}</option>)}
                </select>
              </label>
              <label className="field">
                <span>{t("Reminder Title","提醒标题")}</span>
                <input value={item.title} onChange={e=>patchReminder(item.id,{title:e.target.value})} placeholder={item.preset==="other"?t("Enter reminder title","手动输入提醒标题"):t("Edit reminder title if needed","可继续修改提醒标题")}/>
              </label>
              <label className="field itinerary-reminder-description">
                <span>{t("Description","提醒内容")}</span>
                <textarea value={item.description} onChange={e=>patchReminder(item.id,{description:e.target.value})} placeholder={t("Enter the reminder content...","输入需要提醒旅客的内容...")}/>
              </label>
            </div>}
          </article>;
        })}
      </div> : <div className="itinerary-attraction-empty itinerary-editor-empty">{t("No reminders yet.","尚未加入温馨提醒。")}</div>}
    </section>

    {message&&<div className="save-message">{message}</div>}

    {pendingHref&&<div className="unsaved-overlay" role="dialog" aria-modal="true">
      <div className="unsaved-dialog">
        <div className="unsaved-icon">!</div>
        <div>
          <h3>{t("Unsaved itinerary","当前行程尚未存档")}</h3>
          <p>{t("You have unsaved changes. Save before leaving?","你已经修改了这份行程。离开之前要先保存吗？")}</p>
        </div>
        <div className="unsaved-actions">
          <button className="btn primary" onClick={saveAndLeave} disabled={saving}>{saving?t("Saving...","保存中..."):t("Save & Continue","保存并继续")}</button>
          <button className="btn leave-btn" onClick={leaveWithoutSaving} disabled={saving}>{t("Leave Without Saving","不保存离开")}</button>
          <button className="btn" onClick={()=>setPendingHref(null)} disabled={saving}>{t("Cancel","取消")}</button>
        </div>
      </div>
    </div>}
  </div>;
}
