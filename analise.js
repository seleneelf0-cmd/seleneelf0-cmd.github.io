const base="https://ktjfjfcrkgtgzikebhed.supabase.co",key="sb_publishable_yp-BJ9C2C8dzf68TjtvQiQ_KdSXN9wx",gateway="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0amZqZmNya2d0Z3ppa2ViaGVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1MzM4NjgsImV4cCI6MjEwNzEwOTg2OH0.F88fKS0CKnFm24iNu6v84u9BB20xzKrrrWzCNnXbG-Q";
'use strict';
const el=id=>document.getElementById(id),status=message=>el('status').textContent=message;
const requestKey='foktra-review-request';
const incoming=new URL(location.href).searchParams.get('request');
if(incoming)sessionStorage.setItem(requestKey,incoming);
const requestId=incoming||sessionStorage.getItem(requestKey);
const callback=new URL('analise.html',location.href).href;
let token=null,expiry=0;const blobs=[];
async function api(path,body,blob=false){
 if(!token||Date.now()>=expiry)throw Error('Sua sessão expirou. Saia e entre novamente.');
 const response=await fetch(base+'/functions/v1/foktra/'+path,{method:body?'POST':'GET',headers:{apikey:key,Authorization:'Bearer '+gateway,'x-foktra-user-token':token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 if(!response.ok){const error=await response.json().catch(()=>({}));throw Error(error.error||'Não foi possível consultar a solicitação.');}
 return blob?response.blob():response.json();
}
async function load(){
 const result=await api('reviews?request='+encodeURIComponent(requestId));
 el('review').hidden=false;el('professional').textContent=result.name;
 el('registration').textContent=result.kind.toUpperCase()+': '+result.credential.number+' · '+({pending:'Aguardando análise',approved:'Aprovado',rejected:'Recusado'}[result.credential.status]||result.credential.status);
 el('documents').replaceChildren();
 for(const [i,id] of (result.credential.documents||[]).entries()){
  const button=document.createElement('button');button.type='button';button.textContent='ABRIR COMPROVANTE '+(i+1);
  button.onclick=async()=>{button.disabled=true;try{
   const file=await api('documents?id='+encodeURIComponent(id),null,true),url=URL.createObjectURL(file);blobs.push(url);
   const view=document.createElement(file.type.startsWith('image/')?'img':'iframe');view.src=url;view.title='Comprovante profissional';view.alt='Comprovante profissional';button.after(view);
   const download=document.createElement('a');download.href=url;download.download=file.type==='application/pdf'?'comprovante.pdf':'comprovante';download.textContent='Abrir ou salvar comprovante';button.after(download);button.hidden=true;
  }catch(error){status(error.message);button.disabled=false;}};
  el('documents').append(button);
 }
 if(!result.credential.documents?.length)el('documents').textContent='Esta solicitação foi enviada sem comprovantes. Solicite ao profissional um novo envio com os documentos.';
 status('Conta oficial autenticada. Consulte os comprovantes antes de registrar o parecer.');
}
el('login').onclick=async()=>{
 const verifier=Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');sessionStorage.setItem('foktra-review-verifier',verifier);
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
 const challenge=btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 location.assign(base+'/auth/v1/authorize?'+new URLSearchParams({provider:'google',redirect_to:callback,scopes:'openid email profile',code_challenge:challenge,code_challenge_method:'s256'}));
};
el('logout').onclick=async()=>{
 if(token)await fetch(base+'/auth/v1/logout',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+token}}).catch(()=>{});
 token=null;for(const url of blobs)URL.revokeObjectURL(url);location.replace(callback+'?request='+encodeURIComponent(requestId));
};
el('verdict').onsubmit=async event=>{
 event.preventDefault();const buttons=[...event.target.querySelectorAll('button')],decision=event.submitter?.value;
 if(!['approved','rejected'].includes(decision)){status('Escolha Aprovar ou Recusar.');return;}
 buttons.forEach(button=>button.disabled=true);
 try{await api('reviews',{requestId,status:decision,reason:el('reason').value,evidence:el('evidence').value,expires:el('expires').value});await load();status('Parecer registrado. O profissional receberá o resultado e seu comentário.');}catch(error){status(error.message);}finally{buttons.forEach(button=>button.disabled=false);}
};
(async()=>{
 const params=new URLSearchParams(location.hash.slice(1)),code=new URL(location.href).searchParams.get('code');history.replaceState(null,'',callback+(requestId?'?request='+encodeURIComponent(requestId):''));
 if(!/^[a-f0-9-]{36}$/i.test(requestId||'')){status('Link inválido. Abra o link enviado no e-mail da solicitação.');return;}
 if(code){try{
  const verifier=sessionStorage.getItem('foktra-review-verifier');sessionStorage.removeItem('foktra-review-verifier');if(!verifier)throw Error('Login expirado. Entre novamente.');
  const response=await fetch(base+'/auth/v1/token?grant_type=pkce',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({auth_code:code,code_verifier:verifier})});
  const session=await response.json();if(!response.ok||!session.access_token)throw Error('Não foi possível confirmar seu login. Entre novamente.');token=session.access_token;expiry=Date.now()+session.expires_in*1000;
 }catch(error){status(error.message);el('login').hidden=false;return;}}
 if(params.has('error')){status('Não foi possível entrar. Tente novamente com a conta oficial.');el('login').hidden=false;return;}
 if(!token){status('Entre com a conta oficial para visualizar os documentos e registrar o parecer.');el('login').hidden=false;return;}
 el('logout').hidden=false;
 try{await load();}catch(error){status(error.message);}
})();
