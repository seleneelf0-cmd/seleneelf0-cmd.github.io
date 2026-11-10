const base="https://ktjfjfcrkgtgzikebhed.supabase.co",key="sb_publishable_yp-BJ9C2C8dzf68TjtvQiQ_KdSXN9wx",gateway="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0amZqZmNya2d0Z3ppa2ViaGVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1MzM4NjgsImV4cCI6MjEwNzEwOTg2OH0.F88fKS0CKnFm24iNu6v84u9BB20xzKrrrWzCNnXbG-Q";
'use strict';
const el=id=>document.getElementById(id),status=message=>el('status').textContent=message;
const requestId=new URL(location.href).searchParams.get('request');
let token=new URLSearchParams(location.hash.slice(1)).get('access');
history.replaceState(null,'',location.pathname+(requestId?'?request='+encodeURIComponent(requestId):''));
const blobs=[];let ready=false,saving=false;
const verdict=el('verdict'),expires=el('expires');
const feedback=document.createElement('p');
feedback.setAttribute('role','status');
feedback.setAttribute('aria-live','polite');
el('approve').before(feedback);
function setApprovalDateRange(now=Date.now()){
 const day=86400000;
 const isoDate=time=>new Date(time).toISOString().slice(0,10);
 expires.min=isoDate(now+day);
 expires.max=isoDate(now+366*day);
}
const canResend=()=>/^[a-f0-9-]{36}$/i.test(requestId||'');
el('resend').onclick=async()=>{
 el('resend').disabled=true;
 try{const response=await fetch(base+'/functions/v1/foktra/review-resend',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+gateway,'Content-Type':'application/json'},body:JSON.stringify({requestId})});const result=await response.json();if(!response.ok)throw Error(result.error||'Não foi possível solicitar o novo link.');status(result.message);}catch(error){status(error.message);el('resend').disabled=false;}
};
async function api(path,body,blob=false){
 if(!token)throw Error('Abra o novo link exclusivo enviado ao e-mail da administração.');
 const response=await fetch(base+'/functions/v1/foktra/'+path,{method:body?'POST':'GET',headers:{apikey:key,Authorization:'Bearer '+gateway,'x-foktra-review-token':token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 if(!response.ok){const error=await response.json().catch(()=>({}));throw Error(error.error||'Não foi possível consultar a solicitação.');}
 return blob?response.blob():response.json();
}
async function load(){
 const result=await api('review-link');
 el('review').hidden=false;el('professional').textContent=result.name;
 el('registration').textContent=result.kind.toUpperCase()+': '+result.credential.number+' · Aguardando análise';
 el('documents').replaceChildren();
 const docs=result.credential.documents||[];
 let loaded=0;el('approve').disabled=true;
 for(const [i,id] of docs.entries()){
  const section=document.createElement('section'),title=document.createElement('h3');title.textContent='Comprovante '+(i+1);section.append(title);el('documents').append(section);
  try{
   const file=await api('review-document?id='+encodeURIComponent(id),null,true),url=URL.createObjectURL(file);blobs.push(url);
   const view=document.createElement(file.type.startsWith('image/')?'img':'iframe');view.src=url;view.title='Comprovante profissional '+(i+1);view.alt='Comprovante profissional '+(i+1);section.append(view);
   const download=document.createElement('a');download.href=url;download.download=file.type==='application/pdf'?'comprovante.pdf':'comprovante';download.textContent='Abrir ou salvar comprovante '+(i+1);section.append(download);loaded++;
  }catch(error){const message=document.createElement('p');message.textContent=error.message;section.append(message);}
 }
 if(!docs.length){el('documents').textContent='O profissional enviou esta solicitação sem anexar comprovantes. Recuse com um comentário pedindo uma foto ou PDF pelo aplicativo atualizado.';el('approve').disabled=true;}
 el('approve').disabled=loaded===0||loaded!==docs.length;
 setApprovalDateRange();
 ready=true;status('Confira as fotos e os arquivos abaixo. Depois escolha Aprovar ou Recusar e deixe seu comentário.');
}
// Approval-specific validation must not prevent a refusal.
verdict.noValidate=true;
verdict.onsubmit=async event=>{
 event.preventDefault();if(!ready||saving)return;
 const buttons=[...event.target.querySelectorAll('button')],decision=event.submitter?.value;
 const canApprove=!el('approve').disabled;
 if(decision==='approved'&&!canApprove)return;
 if(!['approved','rejected'].includes(decision)){feedback.textContent='Escolha Aprovar ou Recusar.';return;}
 const reason=el('reason').value.trim(),evidence=el('evidence').value.trim();
 if(!reason){feedback.textContent='Informe o comentário para o profissional.';el('reason').focus();return;}
 if(decision==='approved'){
  if(!evidence){feedback.textContent='Informe a evidência da consulta ao conselho.';el('evidence').focus();return;}
  setApprovalDateRange();
  if(!expires.value||expires.value<expires.min||expires.value>expires.max){
   const formatDate=value=>value.split('-').reverse().join('/');
   feedback.textContent='Escolha uma validade entre '+formatDate(expires.min)+' e '+formatDate(expires.max)+'.';
   expires.focus();return;
  }
 }
 saving=true;
 feedback.textContent='Registrando parecer…';
 buttons.forEach(button=>button.disabled=true);
 try{
  await api('review-link',{status:decision,reason,evidence,expires:expires.value});
  token=null;ready=false;el('verdict').hidden=true;el('documents').replaceChildren();for(const url of blobs)URL.revokeObjectURL(url);
  el('registration').textContent=decision==='approved'?'Documento aprovado.':'Documento recusado.';
  status('Parecer registrado. O profissional receberá o resultado e seu comentário. Este link foi encerrado.');
 }catch(error){feedback.textContent=error.message;buttons.forEach(button=>button.disabled=button.id==='approve'&&!canApprove);}
 finally{saving=false;}
};
if(!token){status('Este link antigo precisa ser atualizado. Use o botão abaixo para receber um novo link na caixa oficial, que abre os comprovantes sem entrar com Google.');el('resend').hidden=!canResend();}
else load().catch(error=>{status(error.message);el('resend').hidden=!canResend();});
