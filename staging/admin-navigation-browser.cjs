// Isolated browser smoke test. All backend requests are mocked; no real accounts or writes.
const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const base="http://127.0.0.1:4173";
const api="http://127.0.0.1:8000";
const output="staging/.local-state/admin-navigation";
const stats={users:{total:3,active:3,banned:0,new_today:0},problems:{total:4,new_today:1},
 forums:{total:2,public:2,private:0},reports:{pending:0},recent_users:[],recent_forums:[]};
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:950}});
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  let lang="en",role="admin";
  await page.addInitScript(()=>{if(!localStorage.getItem("token"))localStorage.setItem("token","synthetic-admin-browser-test");});
  await page.route(api+"/**",async route=>{
   const req=route.request(),path=new URL(req.url()).pathname;
   let data={};
   if(path==="/auth/me")data={id:1,username:"Preview admin",role,is_active:true};
   else if(path==="/experience/language"){
    if(req.method()==="PUT")lang=req.postDataJSON().language;
    data={language:lang};
   }else if(path==="/admin/dashboard")data=stats;
   else if(path==="/core/olympiads/admin"||path==="/core/library/admin")data=[];
   else if(path==="/get-settings")data={email:{smtp_server:{value:"mail.example.test"}},site:{site_name:{value:"Olimpiada"}}};
   else if(path==="/site-info")data={site_name:"Olimpiada",maintenance_mode:false};
   await route.fulfill({status:200,json:data,headers:{"access-control-allow-origin":"*","access-control-allow-headers":"*","access-control-allow-methods":"GET, PUT, POST, OPTIONS"}});
  });
  // Block unexpected remote requests to avoid third-party calls.
  await page.route("https://**",route=>{const url=new URL(route.request().url());return url.hostname==="res.cloudinary.com" && route.request().resourceType()==="image" ? route.continue() : route.abort();});
  const nav=page.locator(".administration-navigation");
  const directory=page.locator(".administration-tools-directory");
  const overflow=async(label)=>{
   const dimensions=await page.evaluate(()=>({width:innerWidth,document:document.documentElement.scrollWidth,header:document.querySelector(".admin-header")?.scrollWidth,headerWidth:document.querySelector(".admin-header")?.clientWidth}));
   assert.ok(dimensions.document<=dimensions.width+1,label+" document overflow "+JSON.stringify(dimensions));
   assert.ok(dimensions.header<=dimensions.headerWidth+1,label+" header overflow "+JSON.stringify(dimensions));
  };
  await page.goto(base+"/admin");
  await directory.getByRole("link",{name:"Olympiads",exact:true}).waitFor();
  assert.equal(await nav.locator("a").count(),19);
  assert.equal(await directory.locator("a").count(),19);
  await page.screenshot({path:output+"/dashboard-en-desktop.png",animations:"disabled"});
  await directory.getByRole("searchbox").fill("biblioteka");
  assert.equal(await directory.locator("a").count(),1);
  await directory.getByRole("link",{name:"Online library",exact:true}).click();
  await page.waitForURL("**/admin/library");
  await page.getByLabel("Title",{exact:true}).waitFor();
  assert.equal(await nav.getByRole("link",{name:"Online library",exact:true}).getAttribute("aria-current"),"page");
  await page.getByRole("combobox",{name:"Language",exact:true}).selectOption("sq");
  await page.getByLabel("Titulli",{exact:true}).waitFor();
  await nav.getByRole("link",{name:"Olimpiadat",exact:true}).click();
  await page.waitForURL("**/admin/olympiads");
  await page.getByLabel("Emri",{exact:true}).waitFor();
  await page.screenshot({path:output+"/olympiads-sq-desktop.png",animations:"disabled"});
  await nav.getByRole("link",{name:"Cilësimet",exact:true}).click();
  await page.getByRole("searchbox",{name:"Kërko cilësimet"}).fill("smtp server");
  await page.getByRole("textbox",{name:"Serveri SMTP",exact:true}).waitFor();
  await page.getByRole("searchbox",{name:"Kërko cilësimet"}).fill("not-a-setting");
  await page.getByText("Nuk u gjet asnjë cilësim.",{exact:true}).waitFor();
  await page.goto(base+"/admin");
  await directory.getByRole("link",{name:"Olimpiadat",exact:true}).waitFor();
  await page.screenshot({path:output+"/dashboard-sq-desktop.png",animations:"disabled"});
  for(const width of [768,390,320]){
   await page.setViewportSize({width,height:950});
   const toggle=page.getByRole("button",{name:"Hap menunë e administrimit",exact:true});
   await toggle.waitFor();
   await page.getByRole("combobox",{name:"Gjuha",exact:true}).waitFor({state:"visible"});
   await overflow("Dashboard "+width);
   await page.screenshot({path:output+"/dashboard-sq-"+width+".png",animations:"disabled"});
   await toggle.click();
   const link=nav.getByRole("link",{name:"Olimpiadat",exact:true});
   await link.waitFor();
   await overflow("Open navigation "+width);
   await page.screenshot({path:output+"/navigation-sq-"+width+".png",animations:"disabled"});
   await link.click();
   await page.waitForURL("**/admin/olympiads");
   await page.getByLabel("Emri",{exact:true}).waitFor();
   await overflow("Olympiads "+width);
   await page.screenshot({path:output+"/olympiads-sq-"+width+".png",animations:"disabled"});
   await page.goto(base+"/admin");
   await directory.getByRole("link",{name:"Olimpiadat",exact:true}).waitFor();
  }
  await page.setViewportSize({width:1440,height:950});
  role="moderator";
  await page.reload();
  await directory.getByRole("link",{name:"Olimpiadat",exact:true}).waitFor();
  assert.equal(await nav.locator("a").count(),16);
  assert.equal(await directory.getByRole("link",{name:"Cilësimet",exact:true}).count(),0);
  assert.deepEqual(errors,[]);
  console.log("Admin navigation, language switching, settings search, role visibility and four viewport widths passed.");
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
