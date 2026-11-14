async page => {
 const base='http://127.0.0.1:5178',api='http://127.0.0.1:8018',checks=[];
 try {
  await page.request.post(api+'/__ux/fixture');await page.goto(base+'/login');
  const c=await(await page.request.get(api+'/__ux/credentials/admin')).json();await page.getByLabel('Email',{exact:true}).fill(c.email);await page.getByLabel('Password',{exact:true}).fill(c.password);await page.getByRole('button',{name:'Sign In',exact:true}).click();await page.waitForURL('**/homepage');
  await page.goto(base+'/forums');const link=page.getByRole('link',{name:'[UX-TEST] Algebra community',exact:true});await link.waitFor();const href=await link.getAttribute('href');await page.goto(base+href.replace('/info',''));
  await page.getByRole('navigation',{name:'Forum sections'}).waitFor();await page.getByRole('button',{name:'Discussion',exact:true}).click();
  const input=page.getByPlaceholder('Type a message...');await input.fill('[UX-TEST] A forum reasoning message.');await input.locator('xpath=ancestor::form').evaluate(form=>form.requestSubmit());await page.getByText('[UX-TEST] A forum reasoning message.',{exact:true}).waitFor();checks.push('message posted and rendered');
  for(const width of [1440,1024,768,390,320]){await page.setViewportSize({width,height:950});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Forum overflow '+width);const send=await page.locator('.community-message-form button[type=submit]').boundingBox();if(!send||send.x<0||send.x+send.width>width)throw Error('Send control clipped at '+width);await page.screenshot({path:'.local-state/redesign/after-discussion-'+width+'.png',fullPage:true});}
  await page.getByRole('navigation',{name:'Forum sections'}).getByRole('button',{name:/Members/}).click();await page.getByRole('button',{name:'Discussion',exact:true}).waitFor();if(await input.isVisible())throw Error('Chat did not close for members');checks.push('member navigation and five viewport checks');
 }finally{const r=await(await page.request.post(api+'/__ux/cleanup')).json();if(r.remaining!==0)throw Error('Cleanup failed');checks.push({cleanup:r});await page.evaluate(()=>localStorage.removeItem('token'));}
 return checks;
}