import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
export type AuthRequest = Request & { user?: { id:string; permissions:string[]; officeId?:string|null } };
export async function auth(req:AuthRequest,res:Response,next:NextFunction){
  const token=req.headers.authorization?.replace('Bearer ','');
  if(!token) return res.status(401).json({error:'Authentication required'});
  try{
    const payload=jwt.verify(token,process.env.JWT_SECRET || 'dev-secret') as {sub:string};
    const user=await prisma.user.findUnique({where:{id:payload.sub},include:{roles:{include:{role:{include:{permissions:{include:{permission:true}}}}}}}});
    if(!user || user.status!=='ACTIVE') return res.status(401).json({error:'Account unavailable'});
    const permissions=[...new Set(user.roles.flatMap(r=>r.role.permissions.map(p=>p.permission.code)))];
    req.user={id:user.id,permissions,officeId:user.officeId}; next();
  }catch{ return res.status(401).json({error:'Invalid token'}); }
}
export const permit=(code:string)=>(req:AuthRequest,res:Response,next:NextFunction)=>req.user?.permissions.includes(code)?next():res.status(403).json({error:'Forbidden'});
