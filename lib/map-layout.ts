export type Point={x:number;y:number};
export type MapRect=Point&{width:number;height:number};
const overlap=(a:MapRect,b:MapRect)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));

/** Deterministic screen-space layout. Geographic anchors never move. */
export function layoutMap(cities:(Point&{id:number;name:string})[],armies:{id:number;cityId:number}[],width:number,height:number){
  const anchors=cities.map(c=>({...c,x:c.x/100*width,y:c.y/100*height}));
  const occupied:MapRect[]=anchors.map(c=>({x:c.x-13,y:c.y-13,width:26,height:26}));
  const tokens=new Map<number,Point>(),labels=new Map<number,Point>();
  for(const army of [...armies].sort((a,b)=>a.id-b.id)){
    const city=anchors.find(c=>c.id===army.cityId);if(!city)continue;
    const candidates=[34,54,78,104].flatMap(radius=>Array.from({length:12},(_,i)=>({x:city.x+Math.cos(i*Math.PI/6)*radius,y:city.y+Math.sin(i*Math.PI/6)*radius})));
    const score=(p:Point)=>occupied.reduce((sum,r)=>sum+overlap({x:p.x-17,y:p.y-17,width:34,height:34},r)*100,0)+Math.hypot(p.x-city.x,p.y-city.y);
    const best=candidates.sort((a,b)=>score(a)-score(b))[0];tokens.set(army.id,best);occupied.push({x:best.x-17,y:best.y-17,width:34,height:34});
  }
  for(const city of anchors){
    const w=Math.max(58,city.name.length*7+16),h=24;
    const candidates=[{x:city.x-w/2,y:city.y+17},{x:city.x-w/2,y:city.y-41},{x:city.x+19,y:city.y-12},{x:city.x-w-19,y:city.y-12},{x:city.x+19,y:city.y+20},{x:city.x-w-19,y:city.y+20},{x:city.x-w/2,y:city.y+55}];
    const score=(p:Point)=>occupied.reduce((sum,r)=>sum+overlap({...p,width:w,height:h},r),0);
    const best=candidates.sort((a,b)=>score(a)-score(b))[0];labels.set(city.id,best);occupied.push({...best,width:w,height:h});
  }
  return {anchors,tokens,labels};
}

export function clampPan(p:Point,width:number,height:number,viewport:Point):Point{
  const limitX=Math.max(0,(width-viewport.x)/2+60),limitY=Math.max(0,(height-viewport.y)/2+60);
  return {x:Math.max(-limitX,Math.min(limitX,p.x)),y:Math.max(-limitY,Math.min(limitY,p.y))};
}
