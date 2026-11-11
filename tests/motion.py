"""Motion audit: samples the home viewer/map canvas every frame through a full passage and flags sudden jumps
(a snap or a one-frame flash) by the change from the frame before. Usage: python3 tests/motion.py [outdir]"""
import os,sys,json
from playwright.sync_api import sync_playwright
OUT=sys.argv[1] if len(sys.argv)>1 else 'motion_out';os.makedirs(OUT,exist_ok=True)
HOOK="""()=>{window.__MREC=[];window.__MTAG='';const sm=document.createElement('canvas');sm.width=64;sm.height=40;const sx=sm.getContext('2d',{willReadFrequently:true});let prev=null;
 const step=()=>{requestAnimationFrame(step);const c=['#hstars','#hmap'].map(q=>document.querySelector(q)).find(c=>c&&!c.hidden&&c.offsetParent);if(!c||!c.width)return;
  sx.drawImage(c,0,0,64,40);const d=sx.getImageData(0,0,64,40).data;let diff=0;if(prev&&prev.id===c.id){for(let i=0;i<d.length;i+=4)diff+=Math.abs(d[i]-prev.d[i])+Math.abs(d[i+1]-prev.d[i+1])+Math.abs(d[i+2]-prev.d[i+2]);diff/=64*40*3;}
  const S=__R2.t.S(),R=__R2.R;const rec={t:performance.now(),id:c.id,diff:+diff.toFixed(2),tag:window.__MTAG,ph:R.phase,eng:!!S.engaged,w:+(S.warpEff||0).toFixed(2),left:+(S.distLeft||0).toFixed(2)};
  if(diff>6||(window.__MKEEP>0&&window.__MKEEP--))rec.img=sm.toDataURL();window.__MREC.push(rec);prev={id:c.id,d:new Uint8ClampedArray(d)};};requestAnimationFrame(step);}"""
with sync_playwright() as p:
  b=p.chromium.launch();pg=b.new_page(viewport={'width':1600,'height':900});err=[]
  pg.on('pageerror',lambda x:err.append(str(x)))
  pg.add_init_script("window.__NOLAUNCH__=1;window.__MODE__='run';window.__FRESH__=1;window.__RUNOPT__={seed:'SMOKE'};window.__R2K=3;")
  pg.goto('file://'+os.path.abspath('dist/index.html'));pg.wait_for_timeout(1500)
  pg.evaluate("()=>{const R=__R2.R;R.cards.forEach((c,i)=>{c.found=true;if(i)c.id=true;});__R2.render();}")
  pg.evaluate(HOOK)
  tag=lambda s:pg.evaluate("t=>{window.__MTAG=t;window.__MKEEP=14}",s)
  tag('map idle');pg.wait_for_timeout(800)
  tag('switch to viewer');pg.get_by_text('VIEWER',exact=True).first.click();pg.wait_for_timeout(1200)
  tag('switch to map');pg.get_by_text('MAP',exact=True).first.click();pg.wait_for_timeout(1200)
  tag('switch to viewer 2');pg.get_by_text('VIEWER',exact=True).first.click();pg.wait_for_timeout(1200)
  tag('pick');pg.keyboard.press('2');pg.wait_for_timeout(1500)
  tag('to map with pick');pg.get_by_text('MAP',exact=True).first.click();pg.wait_for_timeout(1500)
  tag('to viewer with pick');pg.get_by_text('VIEWER',exact=True).first.click();pg.wait_for_timeout(1500)
  tag('engage');pg.keyboard.press('Enter')
  for i in range(300):
    pg.wait_for_timeout(100)
    st=pg.evaluate("()=>[__R2.R.phase,__R2.t.S().engaged]")
    if st[0]!='choose':break
  tag('arrived');pg.wait_for_timeout(2500)
  rec=pg.evaluate("()=>window.__MREC")
  b.close()
json.dump(rec,open(OUT+'/rec.json','w'))
import base64
fl=[r for r in rec if 'img' in r]
print('frames',len(rec),'errors',err)
for i,r in enumerate(fl):
  if 'img' in r:open(OUT+'/f%03d.png'%i,'wb').write(base64.b64decode(r['img'].split(',')[1]))
  print('%03d'%i,{k:v for k,v in r.items() if k not in('img','t')})
