import 'dotenv/config'; import express from 'express'; import cors from 'cors'; import helmet from 'helmet'; import morgan from 'morgan';
import authRoutes from './routes/auth.js'; import extendedRoutes from './routes/extended.js'; import crudRoutes from './routes/crud.js'; import paymentRoutes from './routes/payments.js'; import analyticsRoutes from './routes/analytics.js';
const app=express(); app.use(helmet()); app.use(cors({origin:process.env.WEB_ORIGIN?.split(',')||true,credentials:true})); app.use(express.json({limit:'2mb'})); app.use(morgan('combined'));
app.get('/health',(_,res)=>res.json({ok:true,service:'waddani-api'})); app.use('/api/auth',authRoutes); app.use('/api',crudRoutes); app.use('/api',extendedRoutes); app.use('/api',paymentRoutes); app.use('/api/analytics',analyticsRoutes);
app.use((err:any,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{console.error(err);res.status(err?.name==='ZodError'?400:500).json({error:err?.message||'Server error'});});
const port=Number(process.env.PORT||process.env.API_PORT||4000); app.listen(port,'0.0.0.0',()=>console.log(`Waddani API listening on ${port}`));
