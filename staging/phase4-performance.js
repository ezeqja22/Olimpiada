async page => {
 await page.goto('http://127.0.0.1:5178/homepage');await page.locator('h1').waitFor();await page.waitForLoadState('networkidle');
 const resources=await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.name.endsWith('.js')).map(r=>({file:r.name.split('/').pop(),bytes:r.decodedBodySize})));
 if(resources.some(r=>/Admin|VisualMathEditor|katex/.test(r.file)))throw Error('Heavy tool code loaded on homepage');
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'.local-state/screenshots/phase4-homepage-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.local-state/screenshots/phase4-homepage-mobile.png',fullPage:true});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('http://127.0.0.1:5178/login');await page.getByLabel('Email',{exact:true}).waitFor();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 await page.emulateMedia({reducedMotion:'no-preference'});
 return {resources,timingNote:'Cached resource timing may report zero bytes; use build output for compressed sizes',mobileOverflow:overflow};
}
