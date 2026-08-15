const BASE=import.meta.env.VITE_API_URL||'http://localhost:4000/api';
export const token=()=>localStorage.getItem('waddani_token');
export async function api(path:string,options:RequestInit={}){const res=await fetch(`${BASE}${path}`,{...options,headers:{'Content-Type':'application/json',...(token()?{Authorization:`Bearer ${token()}`}:{ }),...(options.headers||{})}});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||'Request failed');return data;}
export async function login(email:string,password:string){const d=await api('/auth/login',{method:'POST',body:JSON.stringify({email,password})});localStorage.setItem('waddani_token',d.token);return d;}
