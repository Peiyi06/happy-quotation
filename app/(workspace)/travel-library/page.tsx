import TravelMediaLibrary from "@/components/TravelMediaLibrary";
import {UiText} from "@/components/WorkspaceLanguage";

export default function TravelMediaLibraryPage(){
  return <div>
    <div className="page-head workspace-flat-head travel-library-page-head">
      <div>
        <h1><UiText en="Travel Media Library" zh="旅游媒体资料库" /></h1>
        <p><UiText en="Upload past itineraries, quotations, hotel and attraction information, and images so AI can organize them into reusable company travel knowledge." zh="上传历史行程、报价、酒店资料、景点资料与图片，让 AI 整理成可复用的公司旅游知识库。" /></p>
      </div>
    </div>
    <TravelMediaLibrary/>
  </div>;
}
