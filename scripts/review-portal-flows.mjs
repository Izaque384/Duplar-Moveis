// Browser smoke tests with mocked API responses. No real clients, credentials or OTP sends.
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:4173';
const clientA = '11111111-1111-4111-8111-111111111111';
const clientB = '22222222-2222-4222-8222-222222222222';
const projectA = '33333333-3333-4333-8333-333333333333';
const projectB = '44444444-4444-4444-8444-444444444444';
const documentB = '55555555-5555-4555-8555-555555555555';

const clients = [
  { id: clientA, name: 'Cliente Teste A', phone: '5588991111111', active: true, project_count: 1 },
  { id: clientB, name: 'Cliente Teste B', phone: '5588992222222', active: true, project_count: 1 }
];
const projects = [
  { id: projectA, client_id: clientA, title: 'Projeto A', description: 'Projeto A', services: 'Móveis', status: 'Em planejamento', budget_cents: '120000' },
  { id: projectB, client_id: clientB, title: 'Projeto B', description: 'Projeto B', services: 'Móveis', status: 'Em produção', budget_cents: '200000' }
];
const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
const ensure = (condition, message) => { if (!condition) throw new Error(message); };

async function adminFlow(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  const receivedUploads = [];
  const requests = [];
  let signedIn = false;
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/api/duplar/**', async route => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace('/api/duplar/', '');
    const method = req.method();
    requests.push(method+' '+path);
    if (path === 'session') return json(route, signedIn ? {authenticated:true, admin:true, name:'Responsável de teste', email:'teste@example.org', role:'owner'} : {authenticated:false}, signedIn ? 200 : 401);
    if (path === 'admin-auth/status') return json(route, { initialized:true });
    if (path === 'admin-auth/login' && method === 'POST') { signedIn = true; return json(route, {ok:true}); }
    if (!signedIn) return json(route, {error:'nao_autorizado'}, 401);
    if (path === 'admin-auth/users') return json(route, {users:[{id:clientA,name:'Responsável de teste',email:'teste@example.org',role:'owner',active:true}]});
    if (path === 'admin/client-access-status') return json(route, {checks:{otpSecret:false,metaToken:false,phoneNumberId:false,supportPhone:true},configurationComplete:false,templateName:'duplar_codigo_acesso'});
    if (path === 'admin/clients' && method === 'GET') return json(route, {clients});
    if (path === 'admin/clients' && method === 'POST') {
      const body = JSON.parse(req.postData() || '{}');
      const created = {id:'66666666-6666-4666-8666-666666666666',name:body.name,phone:'5588993333333',active:true,project_count:0};
      clients.push(created); return json(route, {client:created}, 201);
    }
    if (path === 'admin/projects' && method === 'GET') {
      const id = url.searchParams.get('client');
      if (id === clientA) await new Promise(resolve => setTimeout(resolve, 220));
      return json(route, {projects:projects.filter(p=>p.client_id === id)});
    }
    if (path === 'admin/projects' && method === 'POST') {
      const body = JSON.parse(req.postData() || '{}');
      const created = {id:'77777777-7777-4777-8777-777777777777',client_id:body.clientId,title:body.title,status:body.status,budget_cents:body.budgetCents};
      projects.push(created); const c = clients.find(c=>c.id===body.clientId); if (c) c.project_count++;
      return json(route, {project:created}, 201);
    }
    if (path === 'admin/documents' && method === 'POST') {
      receivedUploads.push(req.postData() || '');
      return json(route, {document:{id:documentB,filename:'contrato.pdf'}},201);
    }
    return json(route, {error:'nao_encontrado'},404);
  });
  await page.goto(origin + '/equipe.html');
  await page.locator('#adminLoginForm').waitFor({state:'visible'});
  await page.locator('#adminEmail').fill('teste@example.org');
  await page.locator('#adminPassword').fill('SenhaForteDeTeste123');
  await page.locator('#adminLoginForm button[type="submit"]').click();
  await page.locator('#staffView').waitFor({state:'visible'});
  await page.locator('[data-admin-view="clients"]').click();
  await page.locator('#clientName').fill('Cliente Teste C');
  await page.locator('#clientPhone').fill('88993333333');
  await page.locator('#clientForm button[type="submit"]').click();
  await page.waitForTimeout(1200);
  const clientMessage = await page.locator('#clientMessage').textContent();
  const clientValid = await page.locator('#clientForm').evaluate(form=>form.checkValidity());
  ensure(clientMessage?.includes('sucesso'), 'Admin: failed client registration; msg='+JSON.stringify(clientMessage)+' valid='+clientValid+' requests='+JSON.stringify(requests)+' browserErrors='+JSON.stringify(errors));
  ensure(clients.length === 3,'Admin: client creation did not reach API');
  await page.locator('[data-admin-view="projects"]').click();
  await page.locator('#projectName').fill('Novo projeto de teste');
  await page.locator('#projectForm button[type="submit"]').click();
  await page.waitForFunction(() => document.querySelector('#projectMessage')?.textContent?.includes('cadastrado'));
  ensure(projects.length === 3,'Admin: project creation did not reach API');
  await page.locator('[data-admin-view="documents"]').click();
  await page.locator('#documentClient').selectOption(clientA);
  await page.locator('#documentClient').selectOption(clientB);
  await page.waitForTimeout(300);
  const options = await page.locator('#documentProject option').allTextContents();
  ensure(options.includes('Projeto B') && !options.includes('Projeto A'),'Admin: stale response mixed another client projects');
  await page.locator('#documentProject').selectOption(projectB);
  await page.locator('#documentFile').setInputFiles({name:'contrato.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n%%EOF\n')});
  await page.locator('#documentForm button[type="submit"]').click();
  await page.waitForFunction(() => document.querySelector('#documentMessage')?.textContent?.includes('enviado'));
  ensure(receivedUploads.length===1 && receivedUploads[0].includes('name="clientId"') && receivedUploads[0].includes(clientB),'Admin: upload did not include selected client');
  ensure(receivedUploads[0].includes(projectB),'Admin: upload did not include selected project');
  ensure(!errors.length,'Admin browser errors: '+errors.join('; '));
  console.log('PASS admin login, client/project creation, stale-project guard, PDF upload association');
  await page.close();
}

async function clientFlow(browser) {
  const page = await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true});
  const errors=[];
  let authenticated=false;
  page.on('pageerror', e=>errors.push(e.message));
  await page.route('**/api/duplar/**', async route=>{
    const req=route.request();
    const path=new URL(req.url()).pathname.replace('/api/duplar/','');
    if(path==='session')return json(route,authenticated?{authenticated:true,admin:false,name:'Cliente Teste B'}:{authenticated:false},authenticated?200:401);
    if(path==='auth/request')return json(route,{ok:true,message:'Código enviado se cadastrado'});
    if(path==='auth/verify'){
      const data=JSON.parse(req.postData() || '{}');
      if(data.code!=='123456')return json(route,{error:'codigo_invalido'},401);
      authenticated=true; return json(route,{ok:true,admin:false});
    }
    if(path==='projects'){
      if(!authenticated)return json(route,{error:'nao_autorizado'},401);
      return json(route,{name:'Cliente Teste B',projects:projects.filter(p=>p.client_id===clientB),documents:[{id:documentB,project_id:projectB,kind:'contract',filename:'contrato.pdf',created_at:'2026-11-26T10:00:00Z'}],supportWhatsapp:'558881734015'});
    }
    if(path==='document/'+documentB){
      if(!authenticated)return json(route,{error:'nao_autorizado'},401);
      return route.fulfill({status:200,contentType:'application/pdf',headers:{'Content-Disposition':'attachment; filename="contrato.pdf"'},body:Buffer.from('%PDF-1.4\n%%EOF\n')});
    }
    if(path==='auth/logout'){authenticated=false;return json(route,{ok:true});}
    return json(route,{error:'nao_encontrado'},404);
  });
  await page.goto(origin+'/cliente/');
  await page.locator('#phoneForm').waitFor({state:'visible'});
  await page.locator('#phone').fill('88992222222');
  await page.locator('#sendCode').click();
  await page.locator('#codeForm').waitFor({state:'visible'});
  await page.locator('#code').fill('123456');
  await page.locator('#verifyCode').click();
  await page.locator('#dashboard').waitFor({state:'visible'});
  ensure((await page.locator('#clientProfileName').textContent()).trim()==='Cliente Teste B','Client identity missing');
  ensure((await page.locator('#contractsCount').textContent()).trim()==='1','Client document count missing');
  ensure((await page.locator('#invoicesCount').textContent()).trim()==='0','Client invoice count wrong');
  ensure((await page.locator('#projectName').textContent()).trim()==='Projeto B','Client project mismatch');
  const downloadPromise=page.waitForEvent('download');
  await page.locator('.client-download-action').click();
  const download=await downloadPromise;
  ensure(download.suggestedFilename()==='contrato.pdf','Client PDF download name wrong');
  await page.locator('#topExit').click();
  await page.locator('#entryScreen').waitFor({state:'visible'});
  ensure(!errors.length,'Client browser errors: '+errors.join('; '));
  console.log('PASS client OTP flow, project privacy presentation, PDF download and logout');
  await page.close();
}

const browser=await chromium.launch({headless:true});
try { await adminFlow(browser); await clientFlow(browser); }
finally { await browser.close(); }
