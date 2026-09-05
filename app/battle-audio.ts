export class BattleAudio {
  private context:AudioContext|null=null;
  enabled=false;
  async toggle(){
    if(!this.context)this.context=new AudioContext();
    await this.context.resume();this.enabled=!this.enabled;return this.enabled;
  }
  play(kind:"missile"|"clash"|"rout"){
    const c=this.context;if(!c||!this.enabled||c.state!=="running")return;
    const oscillator=c.createOscillator(),gain=c.createGain(),time=c.currentTime;
    oscillator.type=kind==="clash"?"triangle":"sine";
    const start=kind==="missile"?900:kind==="rout"?260:180,end=kind==="missile"?200:kind==="rout"?130:70;
    oscillator.frequency.setValueAtTime(start,time);oscillator.frequency.exponentialRampToValueAtTime(end,time+.16);
    gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(.025,time+.01);gain.gain.exponentialRampToValueAtTime(.0001,time+.2);
    oscillator.connect(gain);gain.connect(c.destination);oscillator.start(time);oscillator.stop(time+.21);
  }
  close(){void this.context?.close();this.context=null;}
}
