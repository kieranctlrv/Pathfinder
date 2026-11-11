"""Motion audit on composited frames (canvas + SVG + DOM together) via a CDP screencast.
Scenarios: map, combat. Flags frame-to-frame jumps inside the watched element and saves frames around them.
Usage: python3 tests/motion_screen.py map|combat [outdir]"""
import os,sys,json,base64,io,time
from PIL import Image,ImageChops,ImageStat
from playwright.sync_api import sync_playwright
MODE=sys.argv[1] if len(sys.argv)>1 else 'combat';OUT=sys.argv[2] if len(sys.argv)>2 else 'motion_'+MODE;os.makedirs(OUT,exist_ok=True)
frames=[];tagbox={'tag':''}
with sync_playwright() as p:
  b=p.chromium.launch();pg=b.new_page(viewport={'width':1600,'height':900});err=[]
  pg.on('pageerror',lambda x:err.append(str(x)))
  pg.add_init_script("window.__NOLAUNCH__=1;window.__MODE__='run';window.__FRESH__=1;window.__RUNOPT__={seed:'SMOKE'};window.__R2K=3;")
  pg.goto('file://'+os.path.abspath('dist/index.html'));pg.wait_for_timeout(1500)
  cdp=pg.context.new_cdp_session(pg)
  def on(f):
    frames.append((time.time(),tagbox['tag'],f['data']));cdp.send('Page.screencastFrameAck',{'sessionId':f['sessionId']})
  cdp.on('Page.screencastFrame',on)
  def tag(t):tagbox['tag']=t
  def wait(ms):pg.wait_for_timeout(ms)
  cdp.send('Page.startScreencast',{'format':'png','everyNthFrame':1,'maxWidth':1600,'maxHeight':900})
  if MODE=='map':
    pg.evaluate("()=>{const R=__R2.R;R.cards.forEach((c,i)=>{c.found=true;if(i)c.id=true;});__R2.render();}")
    sel='#hmap'
    tag('map idle');wait(800)
    bx=pg.locator(sel).first.bounding_box()
    cx,cy=bx['x']+bx['width']/2,bx['y']+bx['height']/2
    tag('hover sweep');pg.mouse.move(cx-200,cy-100)
    for i in range(20):pg.mouse.move(cx-200+i*20,cy-100+i*10);wait(40)
    tag('wheel in');[ (pg.mouse.wheel(0,-200),wait(120)) for _ in range(4)];wait(600)
    tag('wheel out');[ (pg.mouse.wheel(0,200),wait(120)) for _ in range(4)];wait(600)
    tag('drag');pg.mouse.move(cx,cy);pg.mouse.down();[ (pg.mouse.move(cx+i*15,cy+i*4),wait(30)) for i in range(15)];pg.mouse.up();wait(800)
    tag('pick');pg.keyboard.press('2');wait(1500)
    tag('engage');pg.keyboard.press('Enter')
    for i in range(300):
      wait(100)
      if pg.evaluate("()=>__R2.R.phase!=='choose'"):break
    tag('arrived');wait(2500)
  else:
    sel='.r2-box'
    pg.evaluate("()=>{const R=__R2.R;const i=R.cards.findIndex(c=>c.type==='contact');if(i>=0){R.cards[i].found=true;R.cards[i].id=true;RunMap.fold(R,i);__R2.encHide=false;__R2.render();}}")
    pg.evaluate("()=>{const f=__R2.R.fight;if(f){f.enemy.hull=f.enemy.hullMax=400;}__R2.render();}")   # a long fight, so we see both sides fire
    tag('fight open');wait(1500)
    bx=pg.locator(sel).first.bounding_box()
    for t in range(6):
      if pg.evaluate("()=>!__R2.R.fight||__R2.R.fight.over"):break
      k=pg.evaluate("()=>{const v=RunCore.view(__R2.R.fight);const i=v.weapons.findIndex(w=>w&&w.ready);return i>=0?String(i+1):'s'}");tag('turn %d pick %s'%(t,k));pg.keyboard.press(k);wait(300)
      tag('turn %d play'%t);pg.keyboard.press('Enter');
      for i in range(80):
        wait(100)
        if not pg.evaluate("()=>__R2.busy"):break
      wait(600)
  cdp.send('Page.stopScreencast');wait(300)
  st=pg.evaluate("()=>[__R2.R.phase,__R2.R.fight&&__R2.R.fight.turn]")
  b.close()
print('frames',len(frames),'errors',err,'end',st)
box=tuple(int(v) for v in (bx['x'],bx['y'],bx['x']+bx['width'],bx['y']+bx['height']))
prev=None;rows=[]
for i,(t,tg,data) in enumerate(frames):
  im=Image.open(io.BytesIO(base64.b64decode(data))).convert('RGB').crop(box);sm=im.resize((96,54))
  if prev is None:d=dm=0
  else:
    df=ImageChops.difference(sm,prev).convert('L');d=ImageStat.Stat(df).mean[0];dm=sorted(df.get_flattened_data() if hasattr(df,'get_flattened_data') else df.getdata())[-30]   # mean and a local peak (30th largest cell)
  rows.append((i,t-frames[0][0],tg,round(d,2),dm));prev=sm
  im.resize((480,int(480*im.height/im.width))).save(OUT+'/f%04d.png'%i)
json.dump(rows,open(OUT+'/rows.json','w'))
for r in rows:
  if r[3]>4 or r[4]>90:print('%04d %.2fs %-18s mean %.2f peak %d'%r)
