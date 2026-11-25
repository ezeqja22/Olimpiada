async page=>{
 const api='http://127.0.0.1:8018',base='http://127.0.0.1:5178',checks=[],errors=[];
 const error=e=>errors.push(e.message);page.on('pageerror',error);
 try{
 await page.addInitScript(()=>localStorage.setItem('olimpiada_language','en'));
 await page.request.post(api+'/__ux/fixture');await page.goto(base+'/login');
 const c=await(await page.request.get(api+'/__ux/credentials/admin')).json();
 await page.getByLabel('Email',{exact:true}).fill(c.email);await page.getByLabel('Password',{exact:true}).fill(c.password);await page.getByRole('button',{name:'Sign In',exact:true}).click();await page.waitForURL('**/homepage');
 const headers={Authorization:'Bearer '+await page.evaluate(()=>localStorage.getItem('token'))};
 await page.request.put(api+'/experience/language',{headers,data:{language:'en'}});await page.evaluate(()=>localStorage.setItem('olimpiada_language','en'));
 const guide={slug:'ux-test-math',name:'[UX-TEST] Mathematics Olympiad',acronym:'TEST',subject:'Mathematics',scope:'national',audience:'Synthetic pupils',importance:'Synthetic test content only.',history:'Synthetic test history only.',steps:['Ask your school'],source_url:'https://example.org',published:true};
 let response=await page.request.post(api+'/core/olympiads/admin',{headers,data:guide});if(!response.ok())throw Error('Guide fixture failed');
 await page.goto(base+'/admin/library');await page.getByLabel('Title',{exact:true}).fill('[UX-TEST] Training');await page.getByLabel('Category / subject',{exact:true}).fill('Mathematics');await page.getByLabel('Discipline',{exact:true}).fill('Geometry');await page.getByLabel('Level',{exact:true}).fill('School');await page.getByLabel(/^Kind/).selectOption('training');await page.getByLabel('PDF file',{exact:true}).setInputFiles('staging/.local-state/synthetic.pdf');
 const upload=page.waitForResponse(r=>r.url().endsWith('/core/library/admin/upload')&&r.request().method()==='POST');await page.getByRole('button',{name:'Save',exact:true}).click();response=await upload;if(response.status()!==201)throw Error('Upload failed');const doc=await response.json();checks.push('Admin UI PDF upload');
 await page.goto(base+'/library/'+doc.id);await page.locator('.reader img').waitFor();await page.getByRole('button',{name:'Next page',exact:true}).click();await page.locator('.reader img').waitFor();checks.push('Authenticated reader next page');await page.getByLabel('Zoom').selectOption('3');if(!await page.locator('.reader-viewport').evaluate(el=>el.scrollWidth>el.clientWidth))throw Error('Zoom did not enlarge PDF');await page.getByLabel('Zoom').selectOption('1');checks.push('PDF zoom with contained scrolling');
 response=await page.request.get(api+'/core/library/'+doc.id+'/download',{headers});if(!response.ok()||response.headers()['cache-control']!=='private, no-store')throw Error('Private download failed');checks.push('Private training download');
 for(const route of ['/olympiads','/olympiads/ux-test-math','/library','/library/'+doc.id,'/weekly','/admin/olympiads','/admin/library']){
  await page.goto(base+route);await page.locator('h1,h2').first().waitFor();await page.waitForTimeout(300);
  for(const width of [1440,768,390,320]){await page.setViewportSize({width,height:950});await page.waitForTimeout(100);if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error(route+' overflow '+width);await page.screenshot({path:'staging/.local-state/after-'+route.replaceAll('/','-')+'-'+width+'.png',fullPage:true});}
 }checks.push('Seven routes / four widths');
 await page.goto(base+'/olympiads');await page.getByRole('searchbox').fill('not-a-competition');await page.getByText('No olympiads found.',{exact:true}).waitFor();checks.push('Catalogue search empty state');
 await page.evaluate(()=>localStorage.removeItem('token'));await page.goto(base+'/library/'+doc.id);await page.getByRole('link',{name:'Sign in to read',exact:true}).waitFor();response=await page.request.get(api+'/core/library/'+doc.id+'/pages/1');if(![401,403].includes(response.status()))throw Error('Guest page exposed');checks.push('Guest protected reader denied');
 if(errors.length)throw Error(errors.join('; '));
 }finally{page.off('pageerror',error);await page.goto(base+'/login');const cleanup=await(await page.request.post(api+'/__ux/cleanup')).json();if(cleanup.remaining!==0)throw Error('Cleanup incomplete');checks.push({cleanup});await page.evaluate(()=>localStorage.removeItem('token'));}
 return checks;
}
