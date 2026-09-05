"use client";
import { useEffect, useRef, type ReactNode } from 'react';

/** Native top-layer modal: the battlefield cannot paint over it or receive clicks behind it. */
export function BattleDialog({title,onCancel,children}:{title:string;onCancel?:()=>void;children:ReactNode}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const el=ref.current;if(el&&!el.open)el.showModal();return()=>el?.close()},[]);
  return <dialog ref={ref} className="battle-dialog" aria-label={title} onCancel={e=>{e.preventDefault();onCancel?.()}}>
    <div className="battle-dialog-content">{children}</div>
  </dialog>;
}
