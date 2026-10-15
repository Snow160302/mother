/* M.O.T.H.E.R AV_2663 / Supabase adapter (public browser client only). */
(function(global){
  'use strict';
  let client=null;
  const CONFIG_KEY='mother_supabase';
  const unpack=(result)=>{if(result.error)throw result.error;return result.data;};
  function getConfig(){try{return JSON.parse(localStorage.getItem(CONFIG_KEY)||'{}')}catch{return {}}}
  function configure(url,key){
    const target=new URL(url);
    if(target.protocol!=='https:' || !target.hostname.endsWith('.supabase.co'))throw Error('URL DE SUPABASE NO VÁLIDA');
    if(!key || key.startsWith('sb_secret_'))throw Error('UTILIZA SOLO UNA CLAVE PÚBLICA');
    localStorage.setItem(CONFIG_KEY,JSON.stringify({url:target.origin,key}));
    client=null;
    return connect();
  }
  function connect(){
    const {url,key}=getConfig();
    if(!url||!key||!global.supabase){client=null;return false}
    const old=client;
    client=global.supabase.createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    if(old&&old!==client)old.auth.stopAutoRefresh?.();
    return true;
  }
  function requireClient(){if(!client)throw Error('SUPABASE NO CONFIGURADO');return client}
  async function getAuthUser(){return unpack(await requireClient().auth.getUser())?.user||null}
  async function getAuthorizedProfile(authUser){
    if(!authUser?.email_confirmed_at)throw Error('CONFIRMA TU CORREO ANTES DE ENTRAR');
    const data=unpack(await requireClient().from('profiles').select('email,role,clearance_level,status').eq('id',authUser.id).maybeSingle());
    if(!data)throw Error('CUENTA PENDIENTE DE AUTORIZACIÓN POR EL ADMINISTRADOR');
    if(data.status!=='active')throw Error('CUENTA SUSPENDIDA');
    return data;
  }
  async function login(email,password){const data=unpack(await requireClient().auth.signInWithPassword({email,password}));return data.user}
  async function register(email,password,redirectTo){
    const data=unpack(await requireClient().auth.signUp({email,password,options:{emailRedirectTo:redirectTo}}));
    if(data.session)await logout();
    return data;
  }
  async function logout(){if(client)unpack(await client.auth.signOut())}
  async function listDocuments(){return unpack(await requireClient().from('documents').select('*').eq('status','published').order('created_at',{ascending:false}))||[]}
  async function getDocument(id){return unpack(await requireClient().from('documents').select('*').eq('id',id).maybeSingle())}
  async function listAdminDocuments(){return unpack(await requireClient().from('documents').select('*').order('created_at',{ascending:false}))||[]}
  async function saveDocument(data,id){
    if(id){unpack(await requireClient().from('documents').update(data).eq('id',id));return id}
    return unpack(await requireClient().from('documents').insert(data).select('id').single()).id;
  }
  async function archiveDocument(id){return unpack(await requireClient().from('documents').update({status:'archived'}).eq('id',id))}
  async function listAttachments(id){return unpack(await requireClient().from('attachments').select('*').eq('document_id',id))||[]}
  async function getAttachmentUrl(path){return unpack(await requireClient().storage.from('mother-files').createSignedUrl(path,60)).signedUrl}
  async function uploadAttachment(id,file){
    if(file.size>15*1024*1024)throw Error('ARCHIVO SUPERIOR A 15 MB');
    const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
    const path=id+'/'+crypto.randomUUID()+'/'+safe;
    unpack(await requireClient().storage.from('mother-files').upload(path,file,{upsert:false}));
    return unpack(await requireClient().from('attachments').insert({document_id:id,path,filename:file.name,mime_type:file.type,file_size:file.size}));
  }
  async function listAllowedUsers(){return unpack(await requireClient().from('allowed_users').select('*').order('email'))||[]}
  async function authorizeUser(email,level){return unpack(await requireClient().from('allowed_users').insert({email:email.toLowerCase(),clearance_level:level,role:'viewer',status:'active'}))}
  async function updateAllowedUser(email,level,status){return unpack(await requireClient().from('allowed_users').update({clearance_level:level,status}).eq('email',email))}
  global.MotherAdapter=Object.freeze({getConfig,configure,connect,ready:()=>!!client,getAuthUser,getAuthorizedProfile,login,register,logout,listDocuments,getDocument,listAdminDocuments,saveDocument,archiveDocument,listAttachments,getAttachmentUrl,uploadAttachment,listAllowedUsers,authorizeUser,updateAllowedUser});
})(window);
