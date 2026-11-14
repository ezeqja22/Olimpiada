async page => {
 const base='http://127.0.0.1:5178',api='http://127.0.0.1:8018';
 try {
  await page.request.post(api+'/__ux/fixture');await page.goto(base+'/login');
  const c=await(await page.request.get(api+'/__ux/credentials/admin')).json();await page.getByLabel('Email',{exact:true}).fill(c.email);await page.getByLabel('Password',{exact:true}).fill(c.password);await page.getByRole('button',{name:'Sign In',exact:true}).click();await page.waitForURL('**/homepage');
  const headers={Authorization:'Bearer '+await page.evaluate(()=>localStorage.getItem('token'))};let first;
  for(const [title,description,subject] of [['A triangle and its altitude','In triangle $ABC$, the altitude meets $BC$ at $M$. If $BM=MC$ and the area of $ABM$ is $24$, find the area of $ABC$.','Mathematics'],['Integer solutions','Find all positive integers $a,b$ such that $a^2-b^2=45$. Explain why your list is complete.','Mathematics'],['Motion on an inclined plane','Describe the forces acting on an object moving down a smooth inclined plane.','Physics']]) {
   const r=await page.request.post(api+'/auth/problems/',{headers,data:{title:'[UX-TEST] '+title,description,subject,level:'Olympiad',tags:'reasoning'}});if(!r.ok())throw Error('Fixture failed');first??=(await r.json()).id;
  }
  for(const [name,route] of [['feed','/feed'],['problem','/problem/'+first],['forums','/forums'],['courses','/courses'],['editor','/create-problem'],['profile','/profile'],['settings','/settings'],['admin','/admin']]) {
   await page.goto(base+route);await page.locator('h1,h2').first().waitFor();await page.waitForTimeout(500);
   for(const width of [1440,390]) {await page.setViewportSize({width,height:950});await page.screenshot({path:'.local-state/redesign/before-'+name+'-'+width+'.png',fullPage:true});}
  }
 } finally {const r=await(await page.request.post(api+'/__ux/cleanup')).json();if(r.remaining!==0)throw Error('Cleanup failed');await page.evaluate(()=>localStorage.removeItem('token'));}
 return 'Baseline screenshots captured; fixtures cleaned.';
}
