import TravelMediaLibrary from "@/components/TravelMediaLibrary";

export default function TravelMediaLibraryPage(){
  return <div>
    <div className="page-head page-compact-header">
      <div>
        <span className="page-kicker">COMPANY KNOWLEDGE LIBRARY</span>
        <h1>Travel Media Library</h1>
        <p>上传历史行程、报价、酒店资料、景点资料与图片，让 AI 整理成可复用的公司旅游知识库。</p>
      </div>
    </div>
    <TravelMediaLibrary/>
  </div>;
}
