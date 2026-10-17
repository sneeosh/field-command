import { memo } from "react";

// Battlefield weather in two layers: ground effects beneath the troops (puddles and
// ripples, sun-bleached earth) and air effects above them (sheets of rain, drifting
// fog banks, rising heat shimmer). Purely visual; the battle rules already account
// for weather.
type Weather="Clear"|"Rain"|"Fog"|"Heat";

const PUDDLES=[[14,22,9,4],[31,71,12,5],[47,38,7,3],[58,82,10,4],[71,27,11,5],[86,61,8,4],[22,88,9,3],[90,14,7,3]];
const BANKS=[[0,18,62],[30,52,70],[8,80,58],[55,30,66]];

function WeatherLayerView({weather}:{weather:Weather}){
  if(weather==="Clear")return null;
  return <>
    <div className={`weather-ground ${weather.toLowerCase()}`} aria-hidden="true">
      {weather==="Rain"&&PUDDLES.map(([x,y,w,h],i)=><span key={i} className="puddle" style={{left:`${x}%`,top:`${y}%`,width:`${w}%`,height:`${h}%`}}>
        <i style={{animationDelay:`${-i*.37}s`}}/><i style={{animationDelay:`${-i*.37-.9}s`}}/>
      </span>)}
    </div>
    <div className={`weather-sky ${weather.toLowerCase()}`} aria-hidden="true">
      {weather==="Rain"&&<><span className="rain-sheet near"/><span className="rain-sheet far"/></>}
      {weather==="Fog"&&BANKS.map(([x,y,w],i)=><span key={i} className="fog-bank" style={{left:`${x}%`,top:`${y}%`,width:`${w}%`,animationDelay:`${-i*9}s`}}/>)}
      {weather==="Heat"&&<><span className="heat-haze"/><span className="heat-haze late"/></>}
    </div>
  </>;
}
export const WeatherLayer=memo(WeatherLayerView);
