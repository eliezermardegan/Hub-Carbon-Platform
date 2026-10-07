import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { DataIntakeService } from "../../../packages/data-intake/src/service.ts";
import { InMemoryDataIntakePersistence } from "../../../packages/data-intake/src/persistence.ts";

export interface ApiDependencies {
  service: DataIntakeService;
}

export function createIntakeApi(deps: ApiDependencies) {
  return createServer(async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader("content-type","application/json");
    if (req.method === "GET" && req.url === "/health") return send(res,200,{status:"ok",service:"data-intake"});
    if (req.method !== "POST") return send(res,405,{error:"method_not_allowed"});
    const body = await readJson(req);
    if (req.url === "/activities") {
      const tenantId = String(req.headers["x-tenant-id"] ?? "");
      const actorId = String(req.headers["x-actor-id"] ?? "");
      if (!tenantId || !actorId) return send(res,401,{error:"tenant_context_required"});
      try {
        const result = await deps.service.ingestActivity(body,{tenantId,actorId,methodologyVersion:String(req.headers["x-methodology-version"] ?? "v1")});
        return send(res,200,result);
      } catch (error) { return send(res,400,{error:error instanceof Error ? error.message : "invalid_request"}); }
    }
    return send(res,404,{error:"not_found"});
  });
}
function send(res:ServerResponse,status:number,payload:unknown){res.statusCode=status;res.end(JSON.stringify(payload));}
async function readJson(req:IncomingMessage):Promise<any>{
 return await new Promise((resolve,reject)=>{let data="";req.on("data",c=>data+=c);req.on("end",()=>{try{resolve(JSON.parse(data||"{}"))}catch{reject(new Error("invalid_json"))}});req.on("error",reject)});
}
