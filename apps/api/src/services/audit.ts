import type { Request } from 'express';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';
export async function audit(req:Request, action:string, entity:string, entityId?:string, oldValue?:unknown, newValue?:unknown){
 const a=req as AuthRequest;
 await prisma.auditLog.create({data:{actorId:a.user?.id,action,entity,entityId,ip:req.ip,userAgent:req.headers['user-agent'],oldValue:oldValue as any,newValue:newValue as any}});
}
