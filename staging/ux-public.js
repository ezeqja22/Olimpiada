async page => {
 const results=[];
 for(const width of [320,360,390,768,1440]){
  await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:5178/homepage');
  await page.getByRole('button',{name:'☰ Menu'}).click();
  const menu=page.locator('#ol-menu');await menu.waitFor({state:'visible'});
  const geometry=await menu.boundingBox();
  results.push({width,menuVisible:geometry.x>=0&&geometry.x+geometry.width<=width+1,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
  await page.screenshot({path:'.local-state/screenshots/home-menu-'+width+'.png'});
  await page.keyboard.press('Escape');
  results[results.length-1].escape=await menu.count()===0;
  results[results.length-1].focus=await page.getByRole('button',{name:'☰ Menu'}).evaluate(e=>e===document.activeElement);
 }
 for(const route of ['/forums','/forum-catalog','/explore','/weekly','/faq','/support','/teacher/apply','/missing-test-route','/verify-email']){
  await page.goto('http://127.0.0.1:5178'+route);await page.locator('h1').first().waitFor();
  results.push({route,actual:new URL(page.url()).pathname,headers:await page.locator('.ol-nav').count(),title:await page.locator('h1').first().innerText()});
 }
 return results;
}
