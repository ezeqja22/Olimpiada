async page => {
 const base='http://127.0.0.1:5178',api='http://127.0.0.1:8018',checks=[];
 try {
  await page.request.post(api+'/__ux/fixture');await page.goto(base+'/login');
  const c=await(await page.request.get(api+'/__ux/credentials/admin')).json();await page.getByLabel('Email',{exact:true}).fill(c.email);await page.getByLabel('Password',{exact:true}).fill(c.password);await page.getByRole('button',{name:'Sign In',exact:true}).click();await page.waitForURL('**/homepage');
  await page.goto(base+'/forums');const link=page.getByRole('link',{name:'[UX-TEST] Algebra community',exact:true});await link.waitFor();const href=await link.getAttribute('href');await page.goto(base+href.replace('/info',''));
  const forumId=href.match(/forum\/(\d+)/)[1];
  const token=await page.evaluate(()=>localStorage.getItem('token'));
  const created=await page.request.post(api+'/auth/forums/'+forumId+'/problems',{headers:{Authorization:'Bearer '+token},data:{title:'[UX-TEST] Forum problem link',description:'Find $x$ if $x+2=4$.',subject:'Mathematics',level:'School',tags:'algebra'}});if(!created.ok())throw Error('Forum problem fixture failed: '+created.status());
  const problem=await created.json();await page.goto(base+href);await page.getByRole('button',{name:/^Problems/}).click();await page.getByRole('link',{name:'[UX-TEST] Forum problem link',exact:true}).click({timeout:10000});await page.waitForURL('**/problem/'+problem.id+'?from=forum&forumId='+forumId);await page.locator('.problem-reading-statement .katex').first().waitFor();checks.push('forum problem opens the existing reader with return context');await page.goto(base+'/forum/'+forumId);
  await page.getByRole('navigation',{name:'Forum sections'}).waitFor();await page.getByRole('button',{name:'Discussion',exact:true}).click();
  const input=page.getByPlaceholder('Type a message...');await input.fill('[UX-TEST] A forum reasoning message.');await input.locator('xpath=ancestor::form').evaluate(form=>form.requestSubmit());await page.getByText('[UX-TEST] A forum reasoning message.',{exact:true}).waitFor();checks.push('message posted and rendered');
  for(const width of [1440,1024,768,390,320]){await page.setViewportSize({width,height:950});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Forum overflow '+width);const send=await page.locator('.community-message-form button[type=submit]').boundingBox();if(!send||send.x<0||send.x+send.width>width)throw Error('Send control clipped at '+width);await page.screenshot({path:'.local-state/redesign/after-discussion-'+width+'.png',fullPage:true});}
  await page.getByRole('navigation',{name:'Forum sections'}).getByRole('button',{name:/Members/}).click();await page.getByRole('button',{name:'Discussion',exact:true}).waitFor();if(await input.isVisible())throw Error('Chat did not close for members');checks.push('member navigation and five viewport checks');
  const headers={Authorization:'Bearer '+token};
  await page.request.put(api+'/experience/language',{headers,data:{language:'en'}});await page.evaluate(()=>localStorage.setItem('olimpiada_language','en'));
  const messages=await(await page.request.get(api+'/auth/forums/'+forumId+'/messages',{headers})).json();const message=messages.find(m=>m.content==='[UX-TEST] A forum reasoning message.');
  await page.goto(base+'/forum/'+forumId+'/thread/'+message.id);await page.getByLabel('Your reply').fill('[UX-TEST] Consider $x^2+1$.');
  await page.route('**/messages/*/replies',route=>route.request().method()==='POST'?route.fulfill({status:503,body:'unavailable'}):route.continue());
  await page.getByRole('button',{name:'Reply',exact:true}).click();await page.getByRole('alert').waitFor();if(await page.getByLabel('Your reply').inputValue()!=='[UX-TEST] Consider $x^2+1$.')throw Error('Failed reply lost text');
  await page.unroute('**/messages/*/replies');await page.getByRole('button',{name:'Reply',exact:true}).click();await page.locator('.thread-reply .katex').waitFor();
  for(const width of [1440,1024,768,390,320]){await page.setViewportSize({width,height:950});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Thread overflow '+width);await page.screenshot({path:'.local-state/redesign/after-thread-'+width+'.png',fullPage:true});}
  await page.getByRole('button',{name:'Delete reply',exact:true}).click();await page.getByText('No replies yet.',{exact:false}).waitFor();checks.push('thread retry retains text, math reply renders, own reply deletes; five widths');
  await page.evaluate(()=>{localStorage.removeItem('token');localStorage.removeItem('user');});await page.goto(base+'/forums');await page.getByLabel('Search forums').waitFor();
  for(const width of [1440,1024,768,390,320]){await page.setViewportSize({width,height:950});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Guest forums overflow '+width);await page.screenshot({path:'.local-state/redesign/after-public-forums-'+width+'.png',fullPage:true});}
  await page.getByLabel('Search forums').fill('nonexistent');await page.getByText('No forums match this search.').waitFor();checks.push('guest forum directory and search, five widths');

 }finally{const r=await(await page.request.post(api+'/__ux/cleanup')).json();if(r.remaining!==0)throw Error('Cleanup failed');checks.push({cleanup:r});await page.evaluate(()=>localStorage.removeItem('token'));}
 return checks;
}