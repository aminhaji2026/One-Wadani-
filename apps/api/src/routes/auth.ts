import { Router } from 'express'; import bcrypt from 'bcryptjs'; import jwt from 'jsonwebtoken'; import { z } from 'zod'; import { prisma } from '../lib/prisma.js';
const r=Router();
r.post('/login',async(req,res)=>{const p=z.object({email:z.string().email(),password:z.string().min(8)}).safeParse(req.body);if(!p.success)return res.status(400).json({error:p.error.flatten()});const u=await prisma.user.findUnique({where:{email:p.data.email}});if(!u||!(await bcrypt.compare(p.data.password,u.passwordHash)))return res.status(401).json({error:'Invalid credentials'});const token=jwt.sign({sub:u.id},process.env.JWT_SECRET||'dev-secret',{expiresIn:'8h'});res.json({token,user:{id:u.id,name:`${u.firstName} ${u.lastName}`,locale:u.locale}})});
export default r;
