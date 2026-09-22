const board=document.querySelector('#board'),status=document.querySelector('#status');
const symbols=['★','●','▲','◆','☀','☂','♫','♥'];
let open=[],pairs=0,attempts=0,locked=false,timeout;
function stats(){document.querySelector('#attempts').textContent=attempts;document.querySelector('#pairs').textContent=pairs;}
function reveal(card,shown){card.textContent=shown?card.dataset.symbol:'?';card.classList.toggle('revealed',shown);card.setAttribute('aria-label',shown?`Kort ${card.dataset.index}: ${card.dataset.symbol}`:`Kort ${card.dataset.index}, dolt`);}
function flip(card){
  if(locked || card.dataset.matched==='true' || open.includes(card))return;
  reveal(card,true);open.push(card);
  if(open.length<2)return;
  attempts++;stats();
  if(open[0].dataset.symbol===open[1].dataset.symbol){
    for(const match of open){match.dataset.matched='true';match.classList.add('matched');match.setAttribute('aria-label',`Matchat par: ${match.dataset.symbol}`);match.setAttribute('aria-disabled','true');}
    pairs++;open=[];stats();status.textContent=pairs===8?`Alla par hittade på ${attempts} försök! Spela igen med Ny omgång.`:'Ett par! Fortsätt så.';
  }else{
    locked=true;status.textContent='Inte ett par. Försök igen.';
    timeout=setTimeout(()=>{open.forEach(card=>reveal(card,false));open=[];locked=false;},850);
  }
}
function reset(){
  clearTimeout(timeout);open=[];pairs=0;attempts=0;locked=false;stats();board.replaceChildren();
  const deck=[...symbols,...symbols];
  for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
  deck.forEach((symbol,i)=>{const card=document.createElement('button');card.className='memory-card';card.dataset.symbol=symbol;card.dataset.index=i+1;reveal(card,false);card.addEventListener('click',()=>flip(card));board.append(card);});
  status.textContent='Vänd två kort för att hitta ett par.';
}
document.querySelector('#start').addEventListener('click',reset);reset();
