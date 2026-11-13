async page => {
 const base='http://127.0.0.1:5178',api='http://127.0.0.1:8018',results=[];
 try {
  await page.request.post(api+'/__ux/fixture'); await page.goto(base+'/login');
  const secret=await (await page.request.get(api+'/__ux/credentials/admin')).json();
  await page.getByLabel('Email',{exact:true}).fill(secret.email);await page.getByLabel('Password',{exact:true}).fill(secret.password);
  await page.getByRole('button',{name:'Sign In',exact:true}).click();await page.waitForURL('**/homepage');
  for(const route of ['/feed','/search?q=algebra','/subject/mathematics','/forums','/courses','/weekly','/create-problem','/profile','/settings','/family','/teacher/workspace','/teacher/courses','/teacher/apply','/tutoring','/learning-resources','/faq','/support','/admin','/admin/users','/admin/forums','/admin/reports','/admin/user-history','/admin/settings','/admin/email','/admin/analytics','/admin/tutoring','/admin/content','/admin/weekly','/admin/courses','/admin/teachers','/admin/site-content','/admin/faq','/admin/support','/admin/parents']){
   await page.setViewportSize({width:1440,height:1000});await page.goto(base+route);await page.locator('h1,h2').first().waitFor();await page.waitForTimeout(180);
   for(const width of [1440,768,390,320]) {
    await page.setViewportSize({width,height:900});results.push({route,width,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)});
    if(width!==320&&['/feed','/profile','/settings','/admin/users','/admin','/faq'].includes(route)) await page.screenshot({path:'.local-state/screenshots/phase3c-'+route.replaceAll('/','-')+'-'+width+'.png',fullPage:true});
   }
  }
  await page.goto(base+'/admin');const trigger=page.getByRole('button',{name:'Open admin navigation',exact:true});await trigger.click();
  await page.getByRole('dialog',{name:'Admin navigation',exact:true}).waitFor();await page.keyboard.press('Escape');results.push({adminEscape:await trigger.getAttribute('aria-expanded')==='false',focus:await trigger.evaluate(el=>el===document.activeElement)});
 } finally {results.push({cleanup:await(await page.request.post(api+'/__ux/cleanup')).json()});await page.evaluate(()=>localStorage.removeItem('token'));}
 for(const route of ['/login','/signup','/forgot-password','/reset-password','/verify-email']) {await page.goto(base+route);await page.locator('h1,h2').first().waitFor();results.push({route,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)});}
 const failures=results.filter(r=>r.overflow||r.adminEscape===false||r.focus===false||r.cleanup?.remaining>0);
 if(failures.length) throw new Error(JSON.stringify(failures));
 return {checks:results.length,passed:true,cleanup:results.find(r=>r.cleanup)?.cleanup};
}
