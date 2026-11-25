async page => {
  const api = 'http://127.0.0.1:8028', site = 'http://127.0.0.1:5178';
  // Use the real local backend on its fixture port, including authenticated requests.
  await page.route('http://127.0.0.1:8018/**', async route => {
    const response = await route.fetch({url: route.request().url().replace(':8018/', ':8028/')});
    await route.fulfill({response});
  });
  try {
    if (!(await page.request.post(api+'/__ux/weekly-fixture')).ok()) throw Error('Fixture unavailable');
    const user = await (await page.request.get(api+'/__ux/credentials/admin')).json();
    await page.goto(site+'/login');
    await page.getByLabel('Email',{exact:true}).fill(user.email);
    await page.getByLabel(/Password|Fjalëkalim/i).first().fill(user.password);
    await page.locator('button[type=submit]').click();
    await page.waitForURL('**/homepage');
    const headers={Authorization:'Bearer '+await page.evaluate(()=>localStorage.getItem('token'))};
    await page.request.put(api+'/experience/language',{headers,data:{language:'en'}});
    await page.evaluate(()=>localStorage.setItem('olimpiada_language','en'));
    await page.goto(site+'/admin/weekly');
    await page.getByRole('button',{name:/View submissions/}).click();
    const publish=page.getByRole('button',{name:'Publish results'});
    await page.getByLabel('Score',{exact:true}).waitFor();
    if (!await publish.isDisabled()) throw Error('Pending submission allowed publication');
    for (const width of [1440,390]) {
      await page.setViewportSize({width,height:950});
      if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)) throw Error('Weekly admin overflow');
      if(width===390) await page.getByRole('button',{name:'Open admin navigation'}).waitFor();
      await page.screenshot({animations:'disabled',path:'staging/.local-state/after--admin-weekly-'+width+'.png',fullPage:true});
    }
    await page.getByLabel('Score',{exact:true}).selectOption('8');
    await page.getByRole('button',{name:'Approve',exact:true}).click();
    await publish.click();
    await page.getByText('Results published.',{exact:true}).waitFor();
    await page.goto(site+'/weekly');
    await page.getByRole('row',{name:/UX-TEST.*student.*8/}).waitFor();
    return 'Closed week, pending gate, grading, publication and public score passed at desktop/mobile widths';
  } finally {
    const cleanup=await(await page.request.post(api+'/__ux/cleanup')).json();
    if(cleanup.remaining!==0) throw Error('Fixture cleanup failed');
    await page.unroute('http://127.0.0.1:8018/**');
  }
}
