async page => {
 const base='http://127.0.0.1:5178',api='http://127.0.0.1:8018',checks=[];
 try {
  await page.request.post(api+'/__ux/fixture');await page.goto(base+'/login');
  const secret=await(await page.request.get(api+'/__ux/credentials/admin')).json();
  await page.getByLabel('Email',{exact:true}).fill(secret.email);await page.getByLabel('Password',{exact:true}).fill(secret.password);await page.getByRole('button',{name:'Sign In',exact:true}).click();await page.waitForURL('**/homepage');
  const token=await page.evaluate(()=>localStorage.getItem('token')),headers={Authorization:'Bearer '+token};
  const created=await page.request.post(api+'/auth/problems/',{headers,data:{title:'[UX-TEST] Triangle reasoning',description:'Find $x^2$ when $x=3$.',subject:'Mathematics',tags:'geometry'}});if(!created.ok())throw Error('Problem fixture failed');const problem=await created.json();
  await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/problem/'+problem.id);await page.getByText('[UX-TEST] Triangle reasoning',{exact:true}).waitFor();await page.locator('.katex').first().waitFor();
  await page.getByRole('button',{name:'Like 0',exact:true}).click();await page.getByRole('button',{name:'Like 1',exact:true}).waitFor();checks.push('problem math and voting');
  const composer=page.getByPlaceholder('Write a solution idea, question, or comment...');await composer.fill('[UX-TEST] Squaring gives nine.');
  const response=page.waitForResponse(r=>r.url().endsWith('/comments')&&r.request().method()==='POST');await composer.locator('xpath=ancestor::form').locator('button[type=submit]').click();if(!(await response).ok())throw Error('Comment failed');await page.getByText('[UX-TEST] Squaring gives nine.',{exact:true}).waitFor();checks.push('comment publishing');
  for(const width of [1440,768,390,320]) {await page.setViewportSize({width,height:900});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Problem overflow '+width);}
  await page.screenshot({path:'.local-state/screenshots/phase5-problem-mobile.png',fullPage:true});
  await page.route('**/auth/problems/?*',r=>r.fulfill({status:503,body:'Unavailable'}));await page.goto(base+'/feed');await page.getByRole('alert').filter({hasText:/Problemet nuk|Could not load/}).waitFor();await page.unroute('**/auth/problems/?*');await page.getByRole('button',{name:/^(Retry|Provo përsëri)$/}).click();await page.getByText('[UX-TEST] Triangle reasoning',{exact:true}).waitFor();checks.push('feed failure and recovery');
  await page.route('**/experience/teacher/me',r=>r.fulfill({status:503,body:'Unavailable'}));await page.goto(base+'/teacher/apply');await page.getByRole('alert').waitFor();if(await page.getByRole('button',{name:'Dërgo aplikimin',exact:true}).count())throw Error('Unsafe duplicate application shown');await page.unroute('**/experience/teacher/me');await page.getByRole('button',{name:/^(Retry|Provo përsëri)$/}).click();await page.getByRole('button',{name:'Dërgo aplikimin',exact:true}).waitFor();checks.push('teacher application recovery');
 } finally {await page.unrouteAll();const cleanup=await(await page.request.post(api+'/__ux/cleanup')).json();checks.push({cleanup});if(cleanup.remaining!==0)throw Error('Cleanup failed');await page.evaluate(()=>localStorage.removeItem('token'));}
 return checks;
}
