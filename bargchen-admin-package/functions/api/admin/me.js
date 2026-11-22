import { json, requireAdmin } from './_utils.js';
export async function onRequestGet({request,env}) { const admin=await requireAdmin(request,env); return admin ? json({ok:true,admin}) : json({ok:false},401); }
