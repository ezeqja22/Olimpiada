async page=>{
 const api='http://127.0.0.1:8018',base='http://127.0.0.1:5178',checks=[],errors=[];
 const onError=e=>errors.push(e.message);page.on('pageerror',onError);
 try{await page.addInitScript(()=>localStorage.setItem('olimpiada_language','en'));await page.request.post(api+'/__ux/teacher-fixture');await page.goto(base+'/login');const c=await(await page.request.get(api+'/__ux/credentials/admin')).json();await page.getByLabel('Email',{exact:true}).fill(c.email);await page.getByLabel('Password',{exact:true}).fill(c.password);await page.getByRole('button',{name:'Sign In',exact:true}).click();await page.waitForURL('**/homepage');
 const routes=['/admin/weekly','/admin/courses','/admin/content','/admin/site-content','/admin/faq','/admin/support','/admin/teachers','/admin/parents','/admin/tutoring','/admin/reports','/admin/user-history','/admin/settings','/admin/email','/admin/analytics','/teacher/apply','/faq','/support','/followers/'+c.id,'/following/'+c.id];
 for(const route of routes){await page.goto(base+route);await page.locator('h1,h2').first().waitFor();await page.waitForTimeout(600);if(route==='/admin/email'){await page.locator('summary').filter({hasText:'Notification templates'}).click();await page.getByRole('button',{name:'+ Template i ri',exact:true}).click();}const name=route.replaceAll('/','-').slice(1);
  for(const width of [1440,1024,768,390,320]){await page.setViewportSize({width,height:950});await page.waitForTimeout(250);const overflow=await page.evaluate(()=>({root:document.documentElement.scrollWidth>innerWidth+1,main:[...document.querySelectorAll('.admin-main')].some(e=>e.scrollWidth>e.clientWidth+1)}));if(overflow.root||overflow.main)throw Error(route+' overflow at '+width);await page.screenshot({path:'.local-state/redesign/after-'+name+'-'+width+'.png',fullPage:true});}
  checks.push({route,loaded:true});
 }
 if(errors.length)throw Error(errors.join('; '));
 }finally{page.off('pageerror',onError);await page.goto(base+'/login');const cleanup=await(await page.request.post(api+'/__ux/cleanup')).json();if(cleanup.remaining!==0)throw Error('Cleanup failed');checks.push({cleanup});await page.evaluate(()=>localStorage.removeItem('token'));}return checks;
}
