import type{ReactNode}from'react';
export const Card=({title,children}:{title:string;children:ReactNode})=><section className="card"><h3>{title}</h3>{children}</section>;
export const Stat=({label,value,sub}:{label:string;value:string|number;sub?:string})=><div className="stat"><small>{label}</small><strong>{value}</strong>{sub&&<span>{sub}</span>}</div>;
export const Empty=({text}:{text:string})=><div className="empty">{text}</div>;
export function Table({headers,rows}:{headers:string[];rows:(string|number|ReactNode)[][]}){return <div className="tableWrap"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j}>{c}</td>)}</tr>)}</tbody></table></div>}
