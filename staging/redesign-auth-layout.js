async page=>{
 const base='http://127.0.0.1:5178',checks=[];
 await page.goto(base+'/login');await page.evaluate(()=>localStorage.removeItem('token'));
 for(const [name,path] of [['signup','/signup'],['forgot','/forgot-password'],['reset','/reset-password?token=synthetic-layout-only'],['verification','/verify-email']]){
  await page.goto(base+path);await page.locator('.authentication-form').waitFor();
  for(const width of [1440,1024,768,390,320]){await page.setViewportSize({width,height:950});await page.waitForTimeout(300);if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error(name+' overflow '+width);await page.screenshot({path:'.local-state/redesign/after-'+name+'-'+width+'.png',fullPage:true});}
  checks.push(name+' responsive at five widths');
 }
 return {checks,submittedForms:0,createdRecords:0};
}
