export const TRAY=[4,1,5,0,3,2] as const;
/** Six authored trapezoids tile a 300×200 board exactly; no random unsolvable layouts. */
const edge=(c:number,row:number)=>c*100+(row===1&&c>0&&c<3?(c===1?-12:12):0);
export const MOSAIC=Array.from({length:6},(_,id)=>{const c=id%3,r=Math.floor(id/3);return {id,points:[[edge(c,r),r*100],[edge(c+1,r),r*100],[edge(c+1,r+1),(r+1)*100],[edge(c,r+1),(r+1)*100]]};});
export function snap(slots:number[],piece:number,slot:number){if(!Number.isInteger(piece)||piece<0||piece>=6||slot!==piece||slots.includes(piece)||slots[slot]!==-1)return false;slots[slot]=piece;return true;}
export class PuzzleDrag {
 owner:number|null=null;piece:number|null=null;
 begin(id:number,piece:number){if(this.owner!==null||!Number.isInteger(piece)||piece<0||piece>=6)return false;this.owner=id;this.piece=piece;return true;}
 end(id:number){if(id!==this.owner)return null;const piece=this.piece;this.owner=null;this.piece=null;return piece;}
 cancel(id?:number){if(id===undefined||id===this.owner){this.owner=null;this.piece=null;}}
}
