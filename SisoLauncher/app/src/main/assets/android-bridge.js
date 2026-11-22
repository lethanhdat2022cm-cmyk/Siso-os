(function(){
if(window.__andInit||!window.SisoAndroid)return; window.__andInit=1;
var A=window.SisoAndroid, pins=[], bat=null, wx=null, net=null;
function wmo(c){if(c==0)return "Trời quang";if(c<=2)return "Ít mây";if(c==3)return "Nhiều mây";if(c==45||c==48)return "Sương mù";if(c>=51&&c<=57)return "Mưa phùn";if(c>=61&&c<=67)return "Mưa";if(c>=71&&c<=77)return "Tuyết";if(c>=80&&c<=82)return "Mưa rào";if(c>=85&&c<=86)return "Tuyết rơi";if(c>=95)return "Dông";return "—"}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]})}
function loadPins(){try{pins=JSON.parse(A.getPinned())}catch(e){pins=[]}}

/* ---------- số liệu máy: RAM · bộ nhớ · nhiệt độ ---------- */
var vit=null, usage=null;
function dur(ms){var m=Math.round(ms/60000);return m>=60?Math.floor(m/60)+" giờ "+(m%60)+" phút":m+" phút"}
function durS(ms){var m=Math.round(ms/60000);return m>=60?Math.floor(m/60)+"h"+(m%60)+"p":m+"p"}
function pct(u,t){return t>0?Math.round(u*100/t):0}
function vitHtml(){
  if(!vit)return "RAM —<br>Bộ nhớ —";
  var t=vit.cpuTemp!=null?vit.cpuTemp:vit.batTemp;
  return "RAM "+pct(vit.ramTotal-vit.ramFree,vit.ramTotal)+"% · "+(t!=null?Math.round(t)+"°C":"—")+
    "<br>Bộ nhớ "+pct(vit.stTotal-vit.stFree,vit.stTotal)+"% · trống "+fmt(vit.stFree)+
    (usage&&usage.access?"<br>Dùng hôm nay "+durS(usage.total):"");
}
function pollVitals(){
  try{vit=JSON.parse(A.getVitals())}catch(e){return}
  try{usage=JSON.parse(A.getUsage())}catch(e){usage=null}
  var n=document.getElementById("vit"); if(n)n.innerHTML=vitHtml();
}
/* App Hiệu năng + overlay: dùng RAM/nhiệt độ thật thay cho số mô phỏng */
function applyVitals(){
  if(!vit||typeof st==="undefined")return;
  st.ram=(vit.ramTotal-vit.ramFree)/1073741824; st.ramTot=vit.ramTotal/1073741824;
  var t=vit.cpuTemp!=null?vit.cpuTemp:vit.batTemp; if(t!=null)st.tmp=t;
}
if(typeof tick==="function"){var origTick=tick;window.tick=function(n){origTick(n);if(vit){applyVitals();try{paint()}catch(e){}}}}
setInterval(function(){pollVitals();applyVitals();try{paint()}catch(e){}},5000);

/* ---------- thanh tác vụ: nút ngăn app, widget, app đã ghim, pin ---------- */
function mk(html,title){var b=document.createElement("button");b.className="tbb";b.setAttribute("data-and","1");b.title=title;b.setAttribute("aria-label",title);b.innerHTML=html;return b}
function patchBar(){
  var tb=document.getElementById("tb"); if(!tb)return;
  tb.querySelectorAll("[data-and]").forEach(function(n){n.remove()});
  var tray=tb.querySelector("#tray"), f=document.createDocumentFragment();
  var d=mk("<span class=\"tile\" style=\"font-size:16px\">▦</span>","Ứng dụng Android");
  d.onclick=function(e){e.stopPropagation();A.openDrawer()}; f.append(d);
  var rc=mk("<span class=\"tile\" style=\"font-size:16px;background:linear-gradient(135deg,#f59e0b,#ef4444)\"><svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2\" stroke-linecap=\"round\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3 2\"/></svg></span>","Ứng dụng gần đây");
  rc.onclick=function(e){e.stopPropagation();A.openRecents()}; f.append(rc);
  var w=mk("<span class=\"tile\" style=\"font-size:16px;background:linear-gradient(135deg,#10b981,#06b6d4)\">◧</span>","Widget Android");
  w.onclick=function(e){e.stopPropagation();A.openWidgets()}; f.append(w);
  var gs=mk("<span class=\"tile\" style=\"font-size:16px;background:linear-gradient(135deg,#64748b,#334155)\"><svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"#fff\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z\"/></svg></span>","Cài đặt trình khởi chạy");
  gs.onclick=function(e){e.stopPropagation();A.openLauncherSettings()}; f.append(gs);
  (A.getFlag("dock_show",true)?[]:pins).forEach(function(p){
    var b=mk("<img alt=\"\" src=\"data:image/png;base64,"+p.icon+"\" style=\"width:30px;height:30px;border-radius:8px\">",p.label);
    var t=null,long=false;
    b.onpointerdown=function(){long=false;t=setTimeout(function(){long=true;A.askUnpin(p.id)},600)};
    var clr=function(){clearTimeout(t)}; b.onpointerup=clr;b.onpointerleave=clr;b.onpointercancel=clr;
    b.onclick=function(e){e.stopPropagation();if(!long)A.launch(p.id)};
    f.append(b);
  });
  tb.insertBefore(f,tray||null);
  var wb=document.getElementById("wb");
  if(wb&&wb.children[1]){wb.children[1].innerHTML=wx?(wx.t+"°C<small>"+wmo(wx.c)+"</small>"):"—<small>Chưa có vị trí</small>"}
  var wf=tray&&Array.prototype.find.call(tray.querySelectorAll(".ti"),function(x){return x.getAttribute("aria-label")=="Wi-Fi"});
  if(wf&&net){
    if(net.wifi){wf.title=net.ssid||"Wi-Fi"}
    else if(net.cell&&net.online){wf.style.fontSize="11px";wf.style.width="auto";wf.style.padding="0 4px";wf.textContent="4G";wf.title="Dữ liệu di động"}
    else{wf.style.opacity=net.on?".5":".3";wf.title=net.on?"Chưa kết nối":"Wi-Fi tắt"}
  }
  if(bat&&tray){
    var btn=Array.prototype.find.call(tray.querySelectorAll(".ti"),function(x){return x.getAttribute("aria-label")=="Pin"});
    if(btn){btn.style.fontSize="12px";btn.style.width="auto";btn.style.padding="0 4px";btn.textContent=(bat.c?"⚡":"")+bat.p+"%"}
  }
}
var orig=window.renderBar;
window.renderBar=function(){orig.apply(this,arguments);patchBar()};
window.__pins=function(){loadPins();renderBar()};
function patchQp(){
  if(!net)return;
  var t=document.querySelector("#qp [data-q=wifi] small");
  if(t)t.textContent=net.wifi?(net.ssid||"Đã kết nối"):(net.on?"Chưa kết nối":"Tắt");
}
var oq=window.qp;
window.qp=function(){oq.apply(this,arguments);patchQp()};
function dragging(){var a=document.activeElement;return a&&a.type=="range"}
window.__net=function(on,wifi,cell,online,ssid){
  net={on:on,wifi:wifi,cell:cell,online:online,ssid:ssid};
  Q.wifi=on?1:0; patchBar();
  var q=document.getElementById("qp");
  if(q&&q.classList.contains("open")&&qpm=="quick"&&!dragging())qp();else patchQp();
};
window.__vol=function(v,m){
  Q.vol=v;Q.mute=m?1:0;
  try{trIcons()}catch(e){}
  var q=document.getElementById("qp");
  if(q&&q.classList.contains("open")&&qpm=="vol"&&!dragging())qpVol();
};
(function(){
  var q=document.getElementById("qp");
  q.addEventListener("click",function(e){if(e.target.closest("[data-q=wifi]")){e.stopPropagation();A.openWifiPanel()}},true);
  q.addEventListener("input",function(e){var t=e.target;if(t.id=="vol"||t.id=="vol2")A.setVolume(Math.round(+t.value))});
  q.addEventListener("click",function(e){if(e.target.closest("[data-mute]"))A.setMute(!!Q.mute)});
})();
window.__weather=function(t,c){wx={t:t,c:c};patchBar()};
setInterval(function(){A.refreshWeather()},1800000);A.refreshWeather();A.syncSystem();
window.__bat=function(p,c){bat={p:p,c:c};patchBar()};
pollVitals(); loadPins(); renderBar();

/* ---------- Tệp: duyệt bộ nhớ thật ---------- */
var TXT=/\.(txt|md|json|csv|log|xml|html?|js|css|kt|java|py|ini|conf|yml|yaml|srt|sh)$/i;
function fmt(n){return n<1024?n+" B":n<1048576?(n/1024).toFixed(1)+" KB":n<1073741824?(n/1048576).toFixed(1)+" MB":(n/1073741824).toFixed(2)+" GB"}
var QUICK=[["Bộ nhớ trong",""],["Tải xuống","Download"],["Tài liệu","Documents"],["Ảnh chụp","DCIM"],["Hình ảnh","Pictures"],["Nhạc","Music"],["Phim","Movies"]];
UI.files=function(b){
  var cur="",armed=null;
  function draw(){
    if(!b.isConnected)return;
    if(!A.hasStorage()){
      b.innerHTML="<div class=\"card\"><b>Cần quyền truy cập tệp</b><p style=\"color:var(--mut)\">Cấp quyền để SISO duyệt, mở và xóa tệp trong bộ nhớ máy.</p><button class=\"btn sel\" id=\"gr\">Cấp quyền</button></div>";
      b.querySelector("#gr").onclick=function(){A.requestStorage()}; return;
    }
    var d; try{d=JSON.parse(A.listDir(cur))}catch(e){d={items:[]}}
    var items=d.items||[], up=cur.indexOf("/")>=0?cur.slice(0,cur.lastIndexOf("/")):"";
    var nav=QUICK.map(function(q){return "<button class=\""+(q[1]==cur?"sel":"")+"\" data-p=\""+q[1]+"\">"+q[0]+"</button>"}).join("");
    var rows=items.map(function(f,i){
      var ext=f.d?"DIR":(f.n.indexOf(".")>=0?f.n.split(".").pop().slice(0,4).toUpperCase():"TỆP");
      return "<div class=\"row\" data-i=\""+i+"\" style=\"cursor:pointer\"><span class=\"tile\" style=\"width:34px;height:34px;font-size:10px\">"+esc(ext)+"</span><div class=\"grow\"><b>"+esc(f.n)+"</b><small>"+(f.d?"Thư mục":fmt(f.s))+" · "+new Date(f.m).toLocaleDateString("vi-VN")+"</small></div><button class=\"btn\" data-del=\""+i+"\" aria-label=\"Xóa\">"+(armed==i?"Chắc chắn?":ic("trash",16))+"</button></div>";
    }).join("");
    b.innerHTML="<div class=\"crumb card\">"+(cur?"<button class=\"btn\" data-up=\"1\">← Lên</button> ":"")+"Bộ nhớ trong"+(cur?" › "+esc(cur.split("/").join(" › ")):"")+"<small style=\"float:right;color:var(--mut)\">Trống "+fmt(d.free||0)+" / "+fmt(d.total||0)+"</small></div><div class=\"fm\"><nav><small style=\"color:var(--mut);padding:4px 10px\">Truy cập nhanh</small>"+nav+"</nav><div>"+(rows||"<small style=\"color:var(--mut)\">Thư mục trống.</small>")+"</div></div>";
    b.onclick=function(e){
      var x=e.target.closest("[data-del]");
      if(x){var i=+x.dataset.del; if(armed!==i){armed=i;draw();setTimeout(function(){if(armed===i){armed=null;draw()}},3000);return}
        var f=items[i]; var ok=A.deleteFile((cur?cur+"/":"")+f.n); armed=null; toast(ok?"Đã xóa \""+f.n+"\".":"Không xóa được (thư mục không trống hoặc bị khóa).",!ok); draw(); return}
      if(e.target.closest("[data-up]")){cur=up;armed=null;draw();return}
      var p=e.target.closest("[data-p]"); if(p){cur=p.dataset.p;armed=null;draw();return}
      var r=e.target.closest("[data-i]"); if(!r)return;
      var f2=items[+r.dataset.i], rel=(cur?cur+"/":"")+f2.n;
      if(f2.d){cur=rel;armed=null;draw()}
      else if(TXT.test(f2.n)){openNote(f2.n,A.readText(rel))}
      else A.openFile(rel);
    };
  }
  window.__fsRefresh=draw; draw();
};
if(typeof wins!=="undefined"&&wins.files){var w=wins.files,bd=w.querySelector(".body");bd.innerHTML="";UI.files(bd)}

/* ====================== BẢN LAUNCHER THẬT ====================== */
var HIDE=["games","gm","perf","flex","drv","term","siso","trash","disp","keys"];
var TOOLS=["files","pc","set"];
var home=[];
function loadHome(){try{home=JSON.parse(A.getHome())}catch(e){home=[]}}

/* kiểu dáng: các trang màn hình chính + chế độ hình nền hệ thống */
var sty=document.createElement("style");
sty.textContent=
"#icons{display:flex!important;flex-direction:row;overflow-x:auto!important;overflow-y:hidden!important;scroll-snap-type:x mandatory;scrollbar-width:none;touch-action:pan-x;padding:0!important;gap:0!important;max-height:none!important;overscroll-behavior:contain}"+
"#icons::-webkit-scrollbar{display:none}"+
"#icons .pg{flex:0 0 100%;min-width:0;height:100%;box-sizing:border-box;scroll-snap-align:start;scroll-snap-stop:always;display:grid;grid-template-columns:repeat(var(--lc,6),1fr);grid-template-rows:repeat(var(--lr,8),var(--chh,auto));grid-auto-flow:row;justify-items:center;align-items:start;align-content:start;gap:var(--gp,8px);padding:var(--ip,12px) var(--ip,12px) calc(var(--ip,12px) + 24px)}"+
"#pgd{position:absolute;left:0;right:0;bottom:54px;display:flex;justify-content:center;gap:7px;pointer-events:none;z-index:2}"+
"#pgd i{width:7px;height:7px;border-radius:50%;background:#fff;opacity:.35;transition:opacity .2s,transform .2s;box-shadow:0 1px 3px #0006}"+
"#pgd i.on{opacity:1;transform:scale(1.25)}"+
".tb-top #pgd{bottom:10px}.tb-left #pgd{left:56px}.tb-right #pgd{right:56px}"+
"html.sysw,html.sysw body,html.sysw #os{background:transparent!important}"+
"html.sysw #wcv,html.sysw #wvid{display:none!important}html.sysw #os.aurora{animation:none}"+
".ic{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}"+
".tile.fld{background:rgba(255,255,255,.24)!important;display:grid!important;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:6%;padding:11%;box-sizing:border-box;backdrop-filter:blur(8px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.3)}"+
".tile.fld>*{width:100%;height:100%;min-width:0;border-radius:24%;object-fit:cover;display:grid;place-items:center;font-size:calc(var(--isz,48)*.2px);overflow:hidden}"+
".ic.mg .tile{outline:3px solid var(--acc);outline-offset:3px;transform:scale(1.1);transition:transform .15s}"+
"#fo{position:absolute;inset:0;z-index:60;display:grid;place-items:center;background:rgba(0,0,0,.45);backdrop-filter:blur(6px)}"+
"#fo .fob{width:min(88%,420px);max-height:70%;overflow:auto;background:rgba(20,28,44,.92);border-radius:26px;padding:16px 12px 12px;box-shadow:0 20px 60px #0009}"+
"#fo .fot{text-align:center;color:#fff;font-size:17px;font-weight:600;margin-bottom:10px;padding:4px}"+
"#fo .fot small{margin-left:6px;opacity:.5;font-size:13px}"+
"#fo .fog{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;justify-items:center}"+
"#fo .ic{max-width:110px}"+
"#feed{position:absolute;inset:0;z-index:55;background:var(--feedbg,rgba(10,16,28,.95));backdrop-filter:blur(10px);color:#fff;overflow-y:auto;padding:calc(env(safe-area-inset-top,0px) + 16px) 14px 28px;transform:translateX(-100%);transition:transform .22s;visibility:hidden}"+
"#feed.open{transform:none;visibility:visible}"+
"#os:not(.tb-left):not(.tb-right) #tray .chip,#os:not(.tb-left):not(.tb-right) #tray .tis{display:none!important}"+
"#icons .ic.blank{visibility:hidden;pointer-events:none}"+
"#feed{touch-action:pan-y;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}"+
/* mọi thứ mở ra tự né thanh tác vụ, dù thanh nằm ở bên nào */
"#os.tb-left #feed,#os.tb-left #fo{left:56px!important}#os.tb-right #feed,#os.tb-right #fo{right:56px!important}"+
"#os.tb-top #feed,#os.tb-top #fo{top:48px!important}"+
"#os:not(.tb-top):not(.tb-left):not(.tb-right) #feed,#os:not(.tb-top):not(.tb-left):not(.tb-right) #fo{bottom:48px!important}"+
"#feed .fh{display:flex;align-items:center;gap:8px;margin-bottom:14px}#feed .fh b{flex:1;font-size:20px;font-weight:600}"+
"#feed .fb{background:rgba(255,255,255,.1);border:0;color:#fff;border-radius:12px;padding:8px 12px;font-size:13px}"+
"#feed .fc{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:14px;margin-bottom:12px}"+
"#feed .fc h4{margin:0 0 10px;font-size:13px;color:#93a3b8;font-weight:500;display:flex;justify-content:space-between;align-items:center}"+
"#feed .fin{width:100%;box-sizing:border-box;background:rgba(0,0,0,.35);border:0;border-radius:12px;padding:13px 14px;color:#8fd0ff;font-size:15px;font-family:inherit;resize:none;outline:none}"+
"#feed .fin::placeholder{color:#6fb4e8}"+
"#feed .fr{display:flex;align-items:center;gap:10px;padding:9px 2px;border-top:1px solid rgba(255,255,255,.07);font-size:14px}"+
"#feed .fr:first-child{border-top:0}#feed .fr .g{flex:1;min-width:0}#feed .fr small{display:block;color:#93a3b8;font-size:12px}"+
"#feed .ck{width:20px;height:20px;border-radius:50%;border:2px solid #8fd0ff;flex:none;display:grid;place-items:center}"+
"#feed .ck.on{background:#8fd0ff}#feed .ck.on::after{content:\"\";width:6px;height:10px;border:solid #0b1424;border-width:0 2px 2px 0;transform:rotate(45deg) translate(-1px,-1px)}"+
"#feed .done .g{text-decoration:line-through;opacity:.5}"+
"#feed .nt{padding:10px 0;border-top:1px solid rgba(255,255,255,.07);font-size:14px;white-space:pre-wrap;word-break:break-word}"+
"#feed .nt:first-child{border-top:0}#feed .nt small{display:block;color:#93a3b8;font-size:11px;margin-top:4px}"+
"#feed .fg{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}"+
"#feed .fa{background:none;border:0;color:#fff;font-size:11px;display:grid;justify-items:center;gap:4px;padding:4px 0}"+
"#feed .fa img{width:46px;height:46px;border-radius:12px}#feed .fa span{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}"+
"#feed .em{color:#93a3b8;font-size:13px;padding:6px 0}"+
"#feed{transition:transform var(--fxs,.22s) ease,opacity var(--fxs,.22s) ease,visibility var(--fxs,.22s)}"+
"#feed[data-fx=fade]{transform:none;opacity:0}#feed[data-fx=fade].open{opacity:1}"+
"#feed[data-fx=zoom]{transform:scale(.92);opacity:0}#feed[data-fx=zoom].open{transform:none;opacity:1}"+
"#feed[data-fx=none]{transform:none;transition:none}"+
"#feed[data-fx=spring]{transform:translateX(-100%) scale(.96);opacity:0;transition:transform calc(var(--fxs,.22s)*1.7) cubic-bezier(.34,1.45,.64,1),opacity var(--fxs,.22s) ease,visibility var(--fxs,.22s)}#feed[data-fx=spring].open{transform:none;opacity:1}"+
"#feed[data-fx=blur]{transform:scale(1.08);opacity:0;filter:blur(18px);transition:transform calc(var(--fxs,.22s)*1.4) ease,opacity var(--fxs,.22s) ease,filter calc(var(--fxs,.22s)*1.4) ease,visibility var(--fxs,.22s)}#feed[data-fx=blur].open{transform:none;opacity:1;filter:none}"+
"#feed[data-fx=rise]{transform:translateY(14%);opacity:0}#feed[data-fx=rise].open{transform:none;opacity:1}"+
"#feed[data-stag='1'][data-fx=spring].open .fc,#feed[data-stag='1'][data-fx=blur].open .fc,#feed[data-stag='1'][data-fx=rise].open .fc{animation:fcin var(--fxs,.22s) ease both;animation-delay:calc(var(--i,0)*45ms)}"+
"@keyframes fcin{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}"+
"#feed[data-stag=\"1\"][data-fx=slide].open .fc,#feed[data-stag=\"1\"][data-fx=fade].open .fc,#feed[data-stag=\"1\"][data-fx=zoom].open .fc{animation:fcin var(--fxs,.22s) ease both;animation-delay:calc(var(--i,0)*45ms)}"+
"#feed[data-press=\"1\"] .fb,#feed[data-press=\"1\"] .fa,#feed[data-press=\"1\"] .ck{transition:transform .12s,opacity .12s}"+
"#feed[data-press=\"1\"] .fb:active,#feed[data-press=\"1\"] .fa:active{transform:scale(.92);opacity:.8}#feed[data-press=\"1\"] .ck:active{transform:scale(.8)}"+
"#feed .fxl{font-size:12px;color:#93a3b8;margin:10px 0 6px}#feed .fxr{display:flex;flex-wrap:wrap;gap:8px}#feed .fb.fxon{background:#8fd0ff;color:#0b1424;font-weight:600}"+
"#feed input[type=date]{color-scheme:dark}#feed .fb[data-wd]{font-size:18px;padding:6px 0}";
document.head.appendChild(sty);

/* ====== BỐ CỤC MÀN HÌNH CHÍNH: thư mục, kéo thả, chấm thông báo, app cài sẵn ====== */
/* mỗi mục: {t:"tool",k} | {t:"web",k} | {t:"app",id} | {t:"folder",id,name,items:[...]} */
var layout=[], badges={}, drag=null, lastNew=null;
var LOGO="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAIAAADdvvtQAAC7f0lEQVR42ox9d5wsV3FuVZ1zuidsTjdfZQlJKBNNMsYEAzbB5ORnwGAwORqwAROMMfDIyTzDIxgTbWMcQBIgEYRIEopX0lW4ee/ezWlmus+pqvfHment7dkrv4GffntnZ3u6T6hT9dVXX+Hc7DFEFBFVJSJEREQAKN4BAFVlZgCIH4DeC3svVY0fK/4b3yei+M/4TvxtfJUvUv6r4r/Fh4tbij8XnyxfpPK95SsAgCoKICIgQfxdcVkFUGZQ7b8NEYmPXL6lyg0X9xBHRkREJF6ZmYnIWhsvFW84/i2LIGH5OpueXRUERKW4ZnE/iAiERBS/KN5b/Pbiw/GdOH1xCuK3FL8qvtcYE++qmOj4h+UHL8ahGIHigvHithiIYr4rExP/2Biz5fvliSyP0eb52+LNLS9SHoL4ig9ZXk9wklflKzZPuSIoACIgqCqoiiKiAgIAAiBR+R6Kr67cTP+rGOXiryoDHZdRMU/dVVKshs0j3/1nvIYCM1d2VHkQKls3frh/oZdHsryBKzuwsqXLlypWTPxMeUxExPZv4v4FEZ+wWNTlGSr+JA5B/2+3tBOVd8qD0j9JxdP2r7wtJ3XLSyEAImjPEqgqdC2RVm64bFb/xzVUXhb9m+EkqxkRowHaGKJincVfgUJxLGz5jVva2miTijUX36nMVPkmyzdftmf9q7YyU+UvpfJ4FaNZvvXKP8s3seUBdLIdcy9zEK+/5SfjmyLCzPd+nZOtp/iyACRCAKhKAAYpXqwYtfKu2nKh38tiLd95/ym/5SBsLBfamILuP6H7Q/+9lUe+vJKKi/QfiPGdyqW2dCcqP/TPSHFQFicjANiygdqwsaWvrxiuyoqpLMktx3fLH7ac+C1Puv6VWvnzLQ3n5s8IqBgyQRSVAFEBkjRREJ/n5X1c8WMqpn6rK+OWkxpHrHAyymYsjn/5CIsTs2GKACvfVXYEywslbrzyt5QXSsVZKQ9U5cr9A3syR5OIojccf1ZVW14BZX+q3zj3b83CQpZvYkubX7F7lUHZctFUVmrhOZZ/VQx9+VfF/RfXYQ4IKiqqRMb6oI1m85Zbb0aSM888XTffcOU+K6tky4GuOKHFDW8ZHKgqEqJusg2FjUdE0I0rxwkrxzcCWjgMxVIoPlMso8q0Fva7MHWVU6WyQCuOc3FKWGsLvz56xvQ/Hi7lK96LN1PcEG1+9Xt2/UfkvdwAbvU6mUNQDFaxS+I71loytpMHa2utjreuft31N37s45+67Y57yNWC6L3YzuKGRSSEAP/fr34/o3IwbznOAKCg5fDTWtsf3BRGhYiMMeV4asvXvczdybzPsktT8U/Ku8VW9ln/0VB+v2ycKsdq+fjr9/DLZ2IM6IpwcUt36l5mpXw/5Y3Sb6JL72PuvUtrK2utoaHxa3/xq49/8pPtrH3ngUMnFpfHBxvi84rhKc6vwkL0Hysn86lPNp6bPoCbgoOKwYhOdPkGNrZE1/2vhn6VmKYy9+UxqQQK5RjoZJ5Q+fPxKNjYnP1hQmXWK9P8P/qwWx6rJzvCK2dl/4m2AdhsDncr0cTGWoGuB1FeQwpgrBGB0bHxK6/88Yc/8knPIWmk+26/Y25+cWSgTvFucYvQr3Dw+1dqKcLT/nCyiInK3snG9BST1IWjSlYHemhDaQXEXVesiw13IjptvTMuBvPls6wYq7gEi+cqflXZ3uV1U4avKgHmhmtR9mxOFkX/jyHJlsfZ/2g/jTHxTL2XLy1fpHLBKvATgxcAQjAEiKogcSZCYAEil/7H9674yCc+FRBdvZGF0Gp1brrpZlBgYUQEARRAUezOcS8AjI8DCggKGkIAjYYgelYBqyZyk0O5NYLaNUMAIghoyGD8pwIAREdHVBVUtGuqu4an9xYHVhEVYWbo3fO9YFTls7j/FNvkhN1rGFSGKItokfoPiOJpiw/0Oxz9hqeMQxQubfmw6w8d4yleiWYrXnZl3VTsWc/sKyogKIKCBCIFEGEGQEJTqw9974offeyTn1brXL3uAcgmued77jmwvLJqrUNAEDVIXbyaQFGEVCNajYgECqIYrItxEsUVRQggEgLHsQGg8s3HTbyFO6gKoqBxQQiIIiABUfw6ACAkQ2QMICqBIgACmu74ogIhEhIqgCghqqiEDSyx/HWFbSt8qQK0q0xuP35YWYiVqaniQGXftnyhckDYvxS2dNnu5byrxHr9a2LT0t5q+fav4zgjXcOrIhh/TcZYVUjrza9/89uf/OSnjUuIDDMY44hsp5PdfdeBgwcPGWN8YAAw1hJFmC9OeTHQCqhkwDkXmEUECVgEjQXjBNGYeAxKNByF7Snje/0brwjmmVlEpPe32FsBxaGGFZgNoX+/6Va7tDjaykBOJTopv1+Jv/rnsfyNItKNjeOr3+sujN7/eIrJ5ld3RP4//rYACSt4yZbpjv67rcRmXWuBJvcCaIKAcbUvf+Vrn/3sF8ikiCb3jGRUlMiI4Ozs4r59d3Ryb4wFQomnHmzYEgBFFMRoicT7YIwFouA5SWsI3Uv1XMtoPhAAYzxYhG8hhH70Zct4B2ATshp/LvsEcaUVyEXhiEEPcS3+u2XwW4xeeRmdLKHxPwabVA4BKu5hJYnTj4JU5rhipbe8rQrSUKQqy75C+TkrMGjFSS+2izEGCQEAkBBIgcjYPGhaH/jaN7798U98plYbNCYRJbIucGCNcwDByy233rGwuEzWKqAwi4ooq3KctO6CJEQEEQUyee4RLSvuu21/J/cuSViFRdAQElUCliKIK5LT5axncZTEOHzDNpQSR/3RXAWw6W0kgj73oxjD6GtWjEclB1DcUhlM78dQKgg4bfpHD6w7mf/b71b3+2XRoSn8m378pgLXlt2msrdUgMLFxbd0kjZCBlU0RhWADACyYlIb+No3/uWzn/u/41M7FQwLMWsIrAIiyiIEpAJHjx67+57DCkZAGaCby4yeBCCgigYVBiAFg4CCBk3ytW98+xvf/FcvKGCIrKISoaoUx0I0QnFKipRw+VjpXwQbH+jDUSvHTfHamHuEsitZjqQqWFQ571FxOSo+zP8PgYLuBX87WR60nMQpJr58vlRurvwk/UdkMRDxIKtkiPqJIltiFQAgKj546ywAeJbBobH//M/vf/xT/zAwNIYmEaAgKgAsrAiIoMoIwCG02tn+uw508qCKANEJ70ZdAMgcVNWYxOeiSp6hXh/64pf++atf+5eOl+njJ7yAEomqqPTCc0DYtNErR3DFopcXU3lUt8y4VUbVWltJs2vlsOsLXbc8m4r7iWdf36m6xSc3Yqzy6uunT5zM8yiWc0RCnXOFzSjbjyLFUx67e8F8+3OE/6NL3vsvGjJ55ll0YHD4+9+/8lOf+YeR4QlF54MqdSkdiqAYEEVVFJgI89zffsedi4tLxjpAAOpGUwioqqmrESadtncuFYGB5tg/f/1b//Kd/xwZ3ba4uH7g4BFRDcxEpCoQsQMA1I077vdM41AUE1+cdN2p3QozuxfnoWAdQR/1quIDFUO6ZSZgywOuspi2WMFbLsz+42bL7FrZYFQyXBV04H+EzIu/CiH009C2HJQKtJq4pJO1XZLWmwOX/+CqD37oQ9bVFVDBoDGirKgCAgSq0fIqKlprAvP0zIm7DhzYvv0SZUWECCeBEgL6PLfWOpfkOQ8Mjnzzm//67W9/d2RkMsu5nfkjR6c7rdzVlEERFSR60L1QCjZltfqHtHJwdB+W7tWJVChjlcWe7y1B6M8+bTnxW6YcKkax+Kuyq1M5ATZ+4Zwr6C/9AV41YtwM0QJAjDLKX1DGCbdkJmyZW6kc5P8jVaOIXHzwitRoDvzyV7/+wAc+SCZxaQ2MVQTposzRtCigAMZ4n1lCYF5dW7/xpps7WU5IxQooMueq6D0PNIe+8c1vf+WrX0trTQAy5ETgwMFDK+vr1riux11M+ck5NGWHIz5smUUDACpanCKi8j8mCgu6S0QBNu1J2vBPiCJ8VUr0gla+uoKunQyh3rQxiiimzN0sp5QrKykeVeXFGI+n/oEoxx1l57pCdKyMaRzW8q7adJYjKiACkqJFAmFCRRRFCaouad50y/53vPP9eW6TdNAHBULFYGzE4YwF68SlUEswtejQGAFQQmY9cODQ3OyStfXgQZkkiIYAImTUc14fHP7Of13xj1/6hq0Nk62xqrGQh2xmdu7QoSMIxgChAgEoiCgzBkQoMNLCwytPQ3Q6i1AjPnVvWwMpIIBFoywgGjFDZek/fTZOHBYJ3EUSRFUEWCPeSIAqQnH4FOI7BGTIUBc4xSLyr5wJZce/nCHpYqTxSUIIFdrAlgSlcuxXdvoq8XblsD9ZfrGybopFxsze+7JH3x0v7NqQbv6JxRCpik2sqLqkPrew/NfvePf6elZvDvoAIui9BxQFNtZ0TY/A6vKqUQIFdCYXNtYF5oXF5QMHj6ggswoLASqCKKvC8OjY1T++5pOf/j/15jCaJA/CCEE8oLbb2Z133Z3n3rnUoO1aH9TNNgwraEWZU1FA1Ru7tAiKkaKVEBHtxdj9cEk1IyGCXd+WiMiQsUTGmOJSzCzMpmTq48fKsG2/b1TO/Ffx3nKIVF4i/bSpgl1fLMBiBZSRw/jPk6GZZa+8uFolvi0wha2tN4AiiIoCESXtVoZgvJf3ve/vjx073hwcDkGZBZDIGFAjgqporPE+27lzx+TkeKu9SgaFu6CfKKysrN5+++3tTsdYA4StvG2syX0+ODxx9Y9/+bGPf2ZsfMrYJKKFKiIKCCYIHDx0eGV1XQEEFJEQsJxKq/C5+vHPLfnEG2eTSjlc789RbOkMlCHZ4sjZ8hvLMdeWK7I878WZW/6uDeNZgZ7LAHEFlywHbmU8sEw/LduPLXPslYCrkrVxzpVd6S2XEBli5iBqXR3J/e+PfPIXv7hueHQiy1kBVRSBLDkQFFYVdkSG8BGPeMijH/WI1ZUlS6gMSVIDQGscM++/8857Dh4gY1il3qyvrq8Oj45eceWPP/KRT1vXFCUyDo0D6tJhBSCwLCwuTU/PIBKhUSjozhiDuAoruX9nlglllSR0eS9tGWP3Y4zRPBRXK3Z1nI6yN9IfXFf4gP1Mw8J8lMEa6k/NlK1TPzBd/qH4Dtt7FfsjLkpVDSFUDEkZByvbw4L1EkLw3m/B5O2HJMiEoM2B0S9++Wvf/e73xid3ZDkjEgAgkTBzYFAgILLWs2/Uk0suOv/C+56rHJiDMYRoEW3MnR49euyWfbeJAhqT5Tw2OXX5lT/6wIc+HpiSpK5gAQyhKYJtsta6tJP7Q0eOBFEgwpj90G46rZ8EvSV5uZJqLY9tDGui21EBtbekOZRpfRW3veJOVMKjYjrKmHj/Hfbvf+rHrMqIX5nQHpdXtC5lvye6UPG3ZWNW+DSVRV05tuKlCk+8/6wsUfXAlI42RWDFZnPoJz/9+Ze//I3BkTFBAiTPDIgMYhMHgM6mzjlQRdTTTtu7e8e2c885fc/OyU6rTWQACMiIqCKutzq33Hrb4vI6ixkYGv3h1T/9wIc/Tqae1JteFYxBY1gVjbXWWeOQnJLtZP7Y9PHllbVIbOyuMIUKWF+JcTb4PSXDUxBPi+1UFOuUy/TK81ou6CmuUDllKrnVMjm4S2UsMXA2xYObUcDCRS5XLFFl7onIOVfQN/vz4eXZLZ/E8WnLa7x4mHupF7kXCt+WAb+wAou1VgHywEmSzpyY+8AHPmLThnU1ViTn0FDQQAQi3MnaWdYhY8ggqFxw4flDg/VtU+PnnnvOyvKisw6ADJJxVkSQzIEDR/bfec/wyNjPrrnu/e//eK0+XGsOBAAvnIU8iFfsZsgQDZFDcopu5sT8zMycNU5UC1ewP2d8LwV0FaDkXrJJZWejH9TtTyluWf9ZGILu9VVZuDjvKumO8jmb53lBTCsgIiqj7MU5WoGeigVY4e70F99U4sxNOcLN5ro/F3MvVWMxt6Daq/JEcC4BoPe9/wNzC0v15pAAIIGoIkUvhUPIarWEbNxwbAyedcZpac0E337Yw34HekWr8StFURWXllZPzC5f+YOfv+e9H2w0x9N0uOMzFmZlRCGDgJE2QgAkAgqkijMn5g4cPCgCMZZBwJOx5Popwv0J8ALaKNIU/Q5AhU21pau65ebsRxcra7ifutRfC1b2jTbyfIWZYub+Wy+fa9HpqaDS/cvuZOz/e2HEnixjV1w02lvmACojw0Nf+vKXfn7ttUPDIyEoGcvKIgyoihpCdumlF3mfWWcUVBGHR0Z2bN/G7H3IL7nowvHR4U6nRRgJ2mydVcUkqV/zs1/8/Qc+aqgJkGY5kEGyQIaURJCDcgx6EQ0AuSQlsgJ6bPr4ytoaxox8dyhOSqOpMDoq9qY/h3AyfkulCqXCe+93VQuIkzZ/YMvcw8mSuJUsE1UMXeHrdIO0Ej5RSZf2o6IV2m/lgvdSeXgva2szj52JBBEynzcHR6755W+++JWvjU5sQ5NwBEoEDYKzsLI4+7jHPHr7tm3z8/PCQYQJaXRkeGRkkDnj0JmYGn3oI36n3WqhAUIKng05m9QCwx377zbGkXU+iKJRcgpEhhJn22ury/NzWadtjLEuNdYpCwurmunjs/OzSz38L5bAbm17+mlPZe9nY+gIC+x4I/LcanjL/lA/FrBpkKNv1iVYlhZQjBh72GbZ3a4k//uhFvLe9+POFViofPSWHbfyxBect/6EbRkrqhy05e+tVPFVCDRERCgimSKQq8+v5R//hy/llFLSECI0ROoc1RKDndbSWWfsfdH/ev4d+26rpzVAYPZGYHJ8LK0lgBI0swleev9LOtmaQQbVNKlFWqlXAGPBEBgNkjHnQHWB1KBtLS7vnZp45Ute2FpZNsaAdaKAIIYse5yZXjx0+ISoEyURMT1yTr+ZKS+jOGgF7N7LMIAikDEMKqoCm/8fZ7c08iGEYgGV8cn+EAQQBDRwCBxEhVUUAQihe+p2feriIOrHgSvMLQDYkI+orLstrUglxutnj29Zo98f0FZYqlsm58t5464TBqCqufdDw6Nf/OKXfv2b64eHRoJIq9WK0ZlBBBVUfe3rXiPM+/btGxwYYA5kiEMYGRluNJscAgJ6Hy6+6KLx0dGQ5YSb6d4FLwwAQELecobVdwYH0je87pVPfMLjJifGOnnLGJPWUucSYywA5rncc+Bwp5OLVoPNYnGUw6WK8Y4ISDmJJCyw+VQyRKaYl6Jk21oiyvM8hFBeiJX4Kw7hRs6qSvvoJiii61KE9FtmDgpjWaQ1qCJdsGXyvMyOK260f32U44j+xfv/w5KscPJLTgMIA6IdHBy87vrf/vM/f31sbIxFVcQ5R6AEDBpWVpef9rSnPvx+D7j5llvX19ddknStncWRkVFE8IGTNF1dW9m5bfsFF1zQaa8DaD9ZpQeKYGo4tJYkX3vPO95yxim7EpJLL7mg1VpV9Rw8EXUhb2uPn5idW1gyxhGZSIqvbNYtq1TjWMVU0iaqEOjJZEwqvIs462XXoh+qLuqHChCrPznqvc/z/GTHyMnohFQRg6lUWlVqOArOV4WEUGAzZYepUpzQD3puuZ4qrl/JD0NEUjBIycc//kkfOK3VRCTSgEQEgPO8deGF5z7vuc8WhRMzM1meqapzToSTJB0ZGeHAiCSi1pjUuof8zgPb7TVjNviNhQ0XER8CIebtJQitv/2bt5112p711YXUwmWXXqgSnENEZRFAAuPyIIvLq/ccPAzY81BNlc1S+JH9MU6/Z12pJ6yQ0yteQcGkqGTjy7nwuEy999Fp2ZR92+y/llNM/a9yNsMYQ1sqPFQIUJVYvU8qYIti8ooZrEDPJ+Mo9deRWGt7/hYKaGNw5Lv/8d/XXPvL8cltWe4RiYMECaoinBOG5zzrGYMDTUWdO3GiXmskSeJ9jgjGUHOgiRgzlGrRrKwuPfiB9x8fG847WWSexDuMLgUA1Go1DgE4f9c733bf889urS3XUhs4nHXGqcODdZ+3FcQHb62zSaLWtbL8rgMHO96zcmDunbobT1Q8eyVurYQsJwtaiwVUoeZFJK8ssdAvFYKA1tjiWyp1qPEzRehdqV8of2MZYNyQdylPeT/Jq7wCys9cqQcqH4UVXLV4+AJarUihlddrAVHGLRtzGiKCCPXGwOpK6wtf/MrI2GRgNSYRVesMCAOIz9f/6ImPfeTDH7qyvOi9P3r0mDUuFgUKKBpwzkWZqcixybP2jm2Tl1x03/W1lchKKOeAiajdbjPza179mksvuXhxcdE5wyHkndYpe3afc9aZ7fU1a4iQADGwKBoBO7+wtL7eNtZZaxGphD9scS5sSbir5DQq0POW7kFlDAuTX+QPRERBjY1QsYkLpbiNSlVMJaAuW43KZ7qU9gpUWPbCKvm2AruM70d7GPHsNE1PVuXTn3wu33GF8VNJEccfrLWxUqWWNr77X5cfOTozNDSGYCR6mYAEmGXZyPDAM5/+VJ+1HUKn3ZqePl6v1wv/1CWJtQYhyjd10UMCffhDf6fTaSeJKzaJc857H7/0pS99yWMf96i1VlavDxjryNgQxCDc/373b62vp4mzzioAKwlQFmRhafXo9AkAEojksmq9fXnRlNGQciWCgipo2U6cLASpWIh+hkxZlKM87AUC2a8+U6GVVlzpSthkraV70WG59xr4wiDFXFhV0KmnAxJ/W06MbFlOX15txWYKIVhrI40M0SwuLX/t698cHh1FMplnVSCiTqcDAD7PnvXMp+3atW15dTFN006ns7a6bowJzNZaBXXOGGNYgAWIDKgawtWV5UsvuXhsdKTT6cShjM5srVbrdDrnnXfe0WPT3/rOFXfdc2Rxad0HcEmtXm9kub/g/HMTa33uEaP6IiqgILWz/PjMTLe4kLlUhqr95d79ygcbx7psEMnxJK8tdYBUNWYbYm57w2cHlJL/2m8v+pHJk8U0lSzKJnWOskNdzgAX8E+/nFtcIt77JEm2XGeFT1qmsZUNcrkGqJDD6X2GvPdpmqhCs1n/6tf/7cjho9t27uJIoTdGVWu1Wmtt9ZJLLnnMo39/dWXRGTJEa6ur7dY6gmORoGwsJi6JK4kQI13ZIOU+37F96gEPeMCVV/98dGSYWcpJ4kOHDh44cM/AYHN4sDY+0tizY+q0U3bv2rl7bHL7nr07L77wwt/ecsfo5G4gIpvkPhgMijpz4kSnkw80kuA9IXYFGQGgi3QA8+Y8TxyTKIPFTMYYSxEL6HJS9d7kY8p+W/SUK15s150QBiqtgC7UuaFc2C/ydzIybmUb2MoRW+Y1FpxtVfXelzGMIuwqsmNbiuwVoU1/hXzZnG6sbkQ1MfAWS2AAEDDPQ5I2FhdbX//md+rN4RAwqKZpXVUBAiEbE/74qU8YaCR5vg4AaGhhebWT+1p9IBdRVCIrhEhkQEAlsKBJEAlQDcIDHnjpf//wRwwDxlpDJgQmcqCiQcjgWqvd7nROzC3ctO+eevJrZ5PxyW0XXHiJcY1mY5BQfPBoKEkNKnjJp2fnj88vnj28B/IcQVQEFYyxChopZ4imKwZBUZI1kqkVENAYiAnjjeWFGzmR7tnEZV+7YHKW3QDnXLmwsDsRgIAE0BXxjLX+kf6momS7W7fi6W8pXlj21m2/bEwR/pSz7hVBkH5jE93PshzJvWjCnewdERFKFIMoKyiRhpwFTL0x/N3vfvueg0cndu4NQdG4uDEMGeHOAx9w6f3vd2GWt5RZQYFodW3Ns9SNQwnOEKLxrKJsDQGjKrGioFEN7dbq/S+7sFF3Pm8zJoZcktREhGIyAVFQgyoooq21ghLD0sFjdx44Ojw4bJwLnCdJSoSCIiqgsriyevjYzGmnnKKK0qvSCBxA1LpENNKNDLNiIRrbLX5XJAQE4J4yR6nEp6jaKRyX8m4sW/GCV17Fb5G6CgK9NQRdiWOoFMyXg8T+NGiFBEeFtxWP/4od29BS7B2oFepZ8SQFiFlwOSpM7JOR6DYlgYlIvVEmEGUxgNY5QNPpZP/9/cuTJI1ARp5lUdvQGEpT94dPfEKz2YhmPEqxLC+v5HmOqPFw5xCEJc8DIKqis4mxxhprLbbb7W3bJy+7+IL26srwQEMkqAZjUEEFJCgDCqIAsohXFGPAJVRvpJ28tbS80Fpba62vrbfWhDma2dZ668TMnCrVBoYpqamxbG1AEIsBPKsXyEQygx7FK3tSIWBVBhBVVhWyFEPuLeXYykzq8pgXn4xsnBjxxPOhH3kq0kQswhziFWK0UXi0lYiqog4TPWhbcbXKDmzhixRJjDItsvCKTiZ9V/bsttTqqpiubpACCBJiSQGBBgZFm6b131z32xtuunVkfDKPJehojDEq7EN+34vOvfDC+7bXVyN+Z4AQMcuz4D2zBAkCLKAsurq6qqoheLJW0SgEBWD2wP73H/mwq668MmTrA/UEAckajcJCykDcLQoiJSQwwCwiHpFsYlUlhFyCD94TYT111sCRI8eu/snPxkaHRkaHR8dG0sQiGgAO7AkBDagKxi9QQKKoQFxQl5k1CgRtKfNT+BiVKpriB+ecc66s5VBWu9pCjzb6Z1sR3Pp16Ir5Kgq2bH+UWDg9vRC6u5CLH7ZMxVckFuLnTyaaWfbIikM3hIAArisMhazAQcnQyNjQ9y7/oQ+qSgiKRAAa2KfWGEMPe8iDRwbqa6tLaZrmWaag1pr1tTXurmy01rACB26tt6yxamw3+QNCCNaa9tryg+9/8blnn3bnnQfBptbVmgMDA4ODJkkcIFEiDNp1ZY0wGEpEhFnTmjWGEBHJBmbvA4rPNdx1z8HDhw4ltYGB4aGJsZFdu7afdsquifGRqfERQsk6LaRYma8KXRdbQYEQlEBBRAgouhAFNFUx1WWKYOFpWGsj5yvahWKoIzBRrLY4QXGFFT8TaOG6lNUg+5kXFaTAxpCvuIk4nQVrrHgnfqx8eBVmo8JRgj7B+f4a/QpptXhCIgJma5ygskJzcDAofelr/3r1T6+dmNqpAETKomSIVJn91NTYJRdfmGcdg6AcjCEOikjaO9dBgcjEFbO2vu59EFGyhN2qDnaEqlxP3T985hOzc0u377/nttv277vjzrsP3tNqtX3wA83hWjpQb9RtkhAaVZN574xTIgkB2IMxzsXj11hj2PPaWhsVwODcMh85snDrvoODA8n4yNDePTvPOfv07dumxocHbBIk5KqsZBRUWIDVJUaYEdGg6SdpVESf+rGAaGZExHtfKbiL+7m/XLAg4Rd561jOUMEIyodmuYwnFufbcviX53lMrFTy4cxccd/KTA84Cam2Xz+giBvLj5fneU9jG1igk2euVh8YGrnxlts/9/kv/ezaX42OTPk8oDWCQZQlqAob0osuvmDb1CSHNUJlDkhms2sF0ANZsk6+srySZXlCKMxAJt6RCCMqc54ktTPPOPWss8564hMe087C0WNHb73t9ptuuvn2fXcduPvIscOHmgMDA4NDjcZQoznYjbDJBukgkUFAkRAYEa2xquSMC1LLOupJg+f11aXZmaW77j58ww379uzZfdbpe885e9eunTtIRTgQKFEQCT4L1hEosnA/a3FLg1SuAy78jXLo08/BKqKtDeS9NK2xtLxs5CruVzWML87UiHNHy1ZO2W8I8GwmXG5JEOv3lMtskLKrX6EEJEmSZZlnNuiGx8bnlpY++oEP//t/fj8ITkxs56CABogQ0FgDSsYRAT/4gQ8kijKBOZkaM8ejpnfOYk9yE7JOPje3uL7WGhgfaLdbQISEUdZOhJGc9z7rLBrrWBQIdmwbP+3UR/7RHzy63fIzM/N33rn/hhtvuWXf7UeOTs/NHiNjh0dGh0aHG/WGMIuq954QjCHpaiuQMZSAqjCAWpcEn0PAhZX2ym13333g0LXXpfe973kXX3DB5OSYRbXOYchABLrh19YKr1yC04p1U4YEi6KoMvBWEL8qFPWNFgubC4yKwuL+2vP+KnpbnF8FWBzXUFwo3vtytnaTWvYmdSOsoJz9BUD9CZ2icsUQ+TwnwlraNKb5nf/43ue+8IUDR48NDo83mwMdLyBgjAvsjUMWUAUfwpmn7T3vvHPzTscZZBFC4G45nzQajZKvpohGFRYXFxcWF3ZODRtjGGMyQ+PsKhhVsDHNAayqIQ8rnSVmseSmJmq7dlz2u7/7oE6WL6+07rjzrptuumXfHXccPHx8ve0NUaPZHBwYMsZYZzlA8By8ErUTa6OSmLUuSetZx4tAAF3t+NWZbKV1w0237j/vnDMuu+TCXdsmAIyCWCTtqRP1SxnHg6QyjJU6ikp3n2L8uwoem6OwLjAIwBwIqZJgqRDCKqz+DSe6nMovFml0SoomPZVl3n/FTcwhQFEGRBCo4IdlJLrIUbOKAEyMT+zff/f/+T8f+c5//HdtYHB0fJuiFQVVQSAWNhYDc3woED7/vPuMDg+11xdCCAYxMBNZEM8s9Vo90ssIqdA8WF1bm19YZD4ViKCrN6aWjIgokiEjgRWVDDJ7UHWGDIpIFnLfbosoOpeODtcf9pBLf+/hD+6EMD09c8fdR2+48ebbbr1tZnZ2dW09SWoDgyNp2nCJc1Y5ZCKByHjPCdWSxAioqBqT5CGsrOUra+2F+aU7999zv4vPe9D9L60lNeYshmeREgS6RYxSUeutYPoRzujPK5QrrKPjvIEZaveryummcr6ynBKuwNO2YmPKVUXRcY4+eZIkBX0p3mKapjHJVcBWJcIbKIoqK4hol0KgEtHq6DCxsYYhEGAW2Lja4MjYv333+x/52Kdm55bHt+9ShZyZDHLwBtEQgLIh59WiikUZHKzf7+ILgHODqmC8CpVO1J4+ZuQXAoMG5vUsPzy71AKjCgRCoASGkACUmVEFVKMPi0CIIAIISdQisNTV9fV5p5O1QNFas3Ni8NQdFz7u4ZcFkaPTMzffevuvr7/hltv2H5+5s93Jm/XBkZGxoaGhWq0RWFhAQAHIWCdBUkxU1LOu5Jz7hcWVXx6bXXzCY39/sDmYd5adU1AkAxgDQAJRkFgt2RMWKlzjMtjTL0pHRAqqQYMygSJgzNQqQoigdvyfUpG6LvzuCtu/P7+LiLZchFqWHCzusgjLEbGI7YtlGL+miAmNMUQGUVmoLPtdlhcF1nqt3skzY12r3W4ODHZy+d/vff+/fuc/6vXB0YltLBJUFagLizEHCdaQIBpjfadlCHZs33Xfc++DqszBGIBufr1LFU/StKdwCMwcQJUoz8LS8mrmQ4IEwBtZBADCDVJw79GK7WTKUhFEZJCiAky7tZ7DmiKBoW0TI1OPeOhjH/Oo+cWlg0enb75538033XbbbfuPLi8ODg0ODI40moOqyqyBc0QDCM46sgZQgs9W1tr77rhLmB/z6N+bHBvI28uJtZF7QkgQcXEBKZ0G5YmrNIzq13SGnq5rlI8pzER5xivtPu6ldUnZBNoivOpvA1NuVFjYw7iA4qKpqHP0/lxUgdAqCGop24xCiAriXJJ1MjQmy8Lk5I7f3nDLO9/13rsPHpmY3J7lIUT8H9DamDMSlyTtdsszW0WTWIOIKqeddtr4xES7tURkVIOzTnhDMT5N00LbQFQEFImyPJubm+u027XBFGKUsFlDvl8wHxGNLWLMarEwWUuAisjMrfV1BaKOI5Bzzzztsvue658Gc7Oz+27ff821v7rhxpvmTxwbGhkbGxtPnMm9xAJFEQYEsk4ktFrZPYeO/OBHP3nkwx+4bXzIoPi8YwhMrAE1GInStSQpdmzZJThZg5+ur00UazG27DpVpmGVRasqzKSyiE+xmDY6Fsa/KSdTi76NRXQX38nzvGLKCpx6A3pCKjS6eupOTGRUNA8ewYDQwMDIV/7pGx/9xKeD0Oj4jiyAUKIAImqJEJVQWaTV8sYYQgzC6sFZQwLnnnNW4ihDMMb4ECIxqIgsrHUbuBQiIbIIB1heXupkGQ7VNgTjVUW4OBcqKFdRf1IWMd3YlADeByJy1voQAIF9u5YkobUyv7xgyAw23CMf9oDfe8SDDx89cf0NN175w6vvuuu2Wr0+uW2nsWmr3WHmWqNBhoypSciX11p3HzqS/sI85pGPqCWExiJCnmcAGqVGoFQPU0HayiBL2SXqhlRxKAj6ffOyP16ALEUqs/C0yvSsTQvIOVe+YmH0SsZ8YyEnSRJPsYr0QkX8UEukx6hV432wlhRQFES1WR9otdrvee/7v/qNb41Pbm+kTS8AYESBQKwxCOyMaa2tt9rtPPDQ8Git0QxZBqComDh32umnAIiEXEDIYGFce5BVqV4TgRBjVrPTybz3iCSguBFLxuQlFaphJ0vOVMjLBS4vItSVVgX1eepsap2CCuettQVmmBipP/Hxj37sox5xza+u+9a3v33TTdeNT+7ZtfsU1iSoIFpVJJuw19X1/K57jv5y+IbfffjvcCZec+tc8DmIIFlCKmusFK5PhVhYPk8Kyg0Qkm4tqlw+ZCpCl5WCnv4ySFvGZgq+aQExFdMQ02zR9pRJIYXd2gjl4qwZ7QY6UYBHRDV6SzwyMnXg4LE3vunNt99x9+7dp6Fxbc9kSRRiDTuC1hK3vLiAoK955cvbPv/4Jz6b1tLUOUAU8du2bZ+anOh0WmRiEwDBLjEBrbHYE/nuNUZVRDIG4w1mWUZEigRQbntD/Qmm8vbob6Ta/QxGTVdBABA2hlBVJSCis1ZQAwcFDHk795kCPeRBlz34gZf+/Oe//udv/vvtt954xjnnWps4Z9vtjqoapBD0xPzKLbfdveeUU07fu4NYVT0RAaCKgGoUgqpkKgty372UTsvmHEAEnfu7WRRl82VWRRm9LK9RZqbQexXUny2bVJS7EleWbcWNAEQyRrvF5goILFKrN3IvgWFkdOLnv/r1S/7iFQeOHJvYsdMLtDoBkYQZJGRZixBA/NzMsfve58z/+38+/afPe8aTHv+Y8dGhkHcQQEU45Dt3bBsfGw2+g6CISrEUr9DtNrSyvOK9N9aQiREAceAiwYcAouVtdNK+pOVIZIsiClHlHlYLELVBFFGUWCCP9T7GGmNj9ILK2fpKe2XpoQ++///++/c85Y8ee/Du2x1KYil11hlrjLMmEXUz86u//PWNrU6uxmhXNbjw5LVSO1HpllrESrEAY4MWQVWJy7LyTtn/K6c7y22gyzzjODjOOSoTC8uFhc65SplZTHFUMIbCgJX7oqkKAAMIRIcYMM/Z2drw0PiVV1718le9Zt3zwNg4A3lWlyRE6H0m7BupXV6aa6+v/vlLXvjZT3707DNOXVxY3LNz25P/6AmLC7M9bTvYsWN74iwzd9OPPS5xCCFwSGyysLjY2z1dQpZ1lpmzLIstKU5Ws7alMOrJ28d2m2NEWV8GDaKMpGTAuCAYlAStkonlGRYJhRND2foK+PbLX/KCl/zpc/ffdiuITxJnyaho1vHO1TuZ3HPwyE033xoEMPrPuOGxFQ3FqdtRZoOfviVVpuvfYLURYOF4xEx2XE8VjajCAMf1UDYW3WCw29CvBBBtqXBeLkwuesMWKlIlzylG7wykABx1DeOObTQG/vEfP/+6175xcHiciTxDxwc0JjB3OtngQMMYPXLkwKmn7Pn0Jz/6spe+KOus5621mgWf5c982lOGBptEQGiatfrZZ53FGlRZI/gMCBoph+Ssc2QO3HOPsIQQhBkJi+Gr1eq1tCYbevJdxKiygMrnfbmGYZM1Qoz9dKhQtVNUJAUSMIKGwQTBwBA4CuJ1ESdHmBoCzpYXF5/+pMc9+UlPuPXmG2uJA1RDZAB8zj5oq53/9sabVldWjDVdacxIDUdi4ZJYgvbOL+wv5dvUL0y4LDlX+MKbALxeOFWktsrFzmXWV3FuVkvdYm1if4+VAumJv/W5DxKCsGhPNbXbncQgGoNGQ0BQBBJFNMnA4Mg73/O+j33qc2NTO1gBAX3wURJZNTTrSWt18fDBu577jKd84bMfu9/F5y3OzTpHMc3Zaa+eccqupz7xcbPTRyzB4NDgKXv3Rt8n9j3qNiEgYM7R2kx03/67a/UmkmEVDhwCqyKRGWg26/U6SrGq5WRH2IZGgCh228ujMaa7WFRBRBHEGEETe7GAMUg2en/R5EThRBVQgMCBUZN6TQm9CBmDKGvt7PnPedoZp+45fuRgkhg1QLUULNjE5oFX1vN9+w8L1AVSETBGrBGLSgISIkkOtHfoWKtEGo/s/m5dkfcfkdJuayzAbo2zCG0lc1ApFYzGu9KKr0vdLKcmyouujH+X+SWxbayo5D7PQwCkXrcu6kp0Q9yzqKJECWDyuje+7Zv/+u9j23ZoWo98LQsmIaMhDKTJ+srCytLC377r7e9+51/VbVhemLZWRZhBgAhAOp21pz/l8ROjA9bg5MTY+NhI3smstaooSooIRKw5GrGudvjo3P47DzeHRyWW/BBaaw0ZAlOv1QebgxtxhEQSoParHG1IaYXQ6+2lBnr6yqISOEQAG0FAsIs8BgI2wATsEAwIKhOJTQwSCmjH5zmzGhSj5EzWXqtbfP4zn7owP82SiYGQkFpFYkFsZ3DDrQfvObKgpglkmTOC3KrarsUjRaNoGIE1qAYAjqs8HnCVjHVX8CO2GFPweQ4ctbIjjiHFURWPmuhCFYBT2eUtPGiOVQCbFDB6WbBy64KK7lpvYXVVCAAUUHzIRHJFQSOiDGjyIGSS1bX2y172isuvuHL37r0+SJ55ZVI1KohCtaQ+P7cwMjDy1S99+QXPefbK4pIPgcxGDyHrLCKur63e59zz//ipT15cnD391D1jY8OqHAV1Fbq3CAo+iEuSX1z7q5WV1SRNWYSQEEminDTo5MTEyOiwgvRUbW3s1NQvnVZu8lLWIMCeR0jWGEQrgSQ3whaENKAE5IAcgANqQGBSJlQDagktYWrJGjCo4nMJubO4vLj4wAdcdOlFFx0+eGCg0fB5nqZpkiRJkuTMq6trN9x4sw8iahQMA0brAYRRh5iIeq3rLAt5n0dXptKfpFwNsQEXq0TqWaw8LExX5DQWVYhl3cG4bjYpulTQ1cKn6e8TW+mFQBj1MLrvOWcAlTkXCYAqageao2vr/i/+4tW/veHm7dv3dDqeBTCuL88ODQHMHJ8+49S9X/vq5+938fkLJ2YdAmFZs6Hr3VubrK4sP+95zxkcTCcnxlJnRDhwiN56T3Merat1Ov6//vu/a426QtFFWzVI8B5Vdu3cYQlByqUq1XqDwj8toxgV5eFePx+2ECyKBSFllIDCoKLMyvHIAkOGFEE1dU5CQEBLVoRrqXMEBsU5ba+3n/+8Z4Hqwvx8PUlVpSeFQEH08NHpO+8+6NI6kFM0jAqk2GtuhYikBIqqhND158qda/orXAsOe/Sdu8cOmSJ2q+hclR3q+IeF2Dz0eqpt2mcRVi5IkGXIvCiMJSIVEI6aRIElRxIygAYBIYgquenjC3/+56+47fa7Jid3sqD3TGhFEVQSZ1xKR47c/ehHPeSrX/7MxOjA8sLsQN2QelDWjYrg7hPGlm1T46PPecZTx0abIl6BTZdXLAIsKrmXkZGpK6686vobbmw0myEws0cEY60hEs6S1Jx55qk+z1S46OAWS0j723QW5eJxLxZQ7Mb+jsZfCMGoYhANasDUTNJ0jeHG0GR9YIxss5PjekfW2tzqqEsHyTW9GGbjs5xUQp4ZlZC1Ttm9/alPeuLM0SM1a1FVgdM0BcB2J19cXv3Vr68/fmIBTJ0xUWMFqdsVDSRuBkIrgtqjkharv8weLLvYRUoqrpgyAa2fnLOpwWWftcbj04diEB6HJp6dkRNZFpuqLEMRkQAam9KQiAYiImMRiVmsqy2v5H/2kpcdO3ZiYHBU1aiCj0qDRM6oSnbsyJEXv/BP3vlXf9lur3HWIWSLMfGJrIpIBi2UuLeEJqnV2yHLO62hgabP26SqCIqGWT2zdQPGps/7kxcem5kfHZ/yvpfuRWIJCOHii85765tf36gh520EISQQAtNtJ1FubVyRADiZ9o0CIEKseu7kXhTX17OVtfXpmZnp6eNzs3PzCwtLi0veeyIcHR3btWvXueeee/bZZw8209CaR+XEOWZhhgDW1Jtv/Ku/9WLHt29rZ5kha22S517y9vBAetF9z370Ix8KkiF3Euc2fFaykY7BLABMWMUmKkmYymrorg+iqGhe2JtywqRfMqb8K5skSUF3jVanwhUsM6O770AMQTD2BwQiYVUBBiVClzSWlluveNUbjhybmdq2a32tYwx574EQBckgc2dm+uBrXvOKN7/2tStriz5vG1I0mOe5CpikxnHyodeIr2upKfcdY3RooBl8bpCsMT5EnEmNcaNj4x/9+Kf37797595TO3lujVPWuFWFeXAgeeD9Lx0earTXl0ACgEpEiLhb39ffJ6S8nrpFdD0aQi+Z6nIvv/75r+85cHB+YXl2YXF5tTV9YnZtvd1qd1SoXqtZZ62xSZrCsaUbbz905U9+ddbZ5zzqEQ+54KxdFg0ERQBjKcvyhJov+l/Pftf7PjS1c6rRaPg85D4YY8Uk6x1//U37RkdHHvSAS7gtnTykiUVQMiQcJNYHEsb0TCVbvmVsFWmDxSFDAGWYsQwO96vGFBSxbsz/ute9ekOvtcQQ6G9/Wd55qkpAqDF+j0EZglKSNNtt/vOXv+rA4aMjI2N54CzLjbVA2MlaSep8yGdnjr7tTW94wytfcXTmmEscIqS1hgq6pF5vDuY+jxJvm7vedNurI4owxz7ZqhSnMXgeHB79+bXXv/d9H5zctoMFyFrP7Kxjz9Y6Szg+PvBnL/qTWmoh5ES9NjwYezoVFXybKFeF01NuOFLWNxYFY9PDhw//279996qrf3b46LRJ62hS62rN5khSazYGhmxSQ+OsTdE4VjS2dvzE7O237c992HvKaUTGOArM1lLgcMreXcePT9++/57tu/Zw0E7uk7TWFQDxfmllZXh4ZPvUtug/GIMa/S2QohcRbT4otuxzXSnP6OlZVStzykU81NeCc0Ok5g2vf21ZCGFDwr5Eg630Iez+ZXeOhQgBiVnT2kAI9Iq/eP2+/XcNjY4GVgVMajWOR4mlLG+319fe/ta//IsX/6/jsyvWJCKa5WFlpbO27ucX1vbtu3tstOmsAaQyOtN7bIiDg4KoBILBM4sODg4dnznxmte9LTAam9g0CSKIFHKfpqkGaa2vPePpf/Twhz54eXHWkECv4geAACIjA/r7QhbbqUB+ywxAFQk+JIbOOv2MP37KUx74gMtW11u33b7f2qTZHOi0M2cdiBJhYm3kKzlrESHPMlU6eHhmZmZ2atvU+OiwIQ3sARiQzjnzrP++4oc2HUiSNLDaJGVRZy0C5Hm+vLQ0NjIyPjYWQjAIpKqoqIoIkQVjStKZhaxCRB6MMUTYL+NSCN9KpBeXoqj+yKmfrYbzc9MRJyxySUVJV6QKldHJyAHqStwJqYhgIEuBGYwTTV//+rf+/OfXTW3f4dHHmyRj47OwBOfMyMjgAy64dP747Hp7jcVHbag8D4rm1n23P+tpT379q/+UCIQ1z3NANFToaiMAkwMDBhRJEcH64F2tkfnwkpf++Z33nBgcm2QJnZCTdUmShMzXa7XF+YULzrvPRz78N9aC76wb9N2e4GCBLIJVCdHRis9bGODyjizzogqcDISNAgugcY2hEUH6wVU/+finPj+/tLR9525EC4A+eARMktQ5l+e5qlpjBIxgOli3u6aGLrvorPtdeu6O7ZOA2M7y0cGx//rZdZ/43FcvuuiS9XYuSmlSy1qr9Zrz2fpAPZ0aaVx2yQXnnXOWAW+RRT2zR2OBAARIiSL1JYSuOwwR7tIubCaxv313csnE9gzqhUG1MCUbxqZ3KlbauGzoHb7h9a8tRmdLAbYyKL4pdR/YWGJgNBSEk/rA29/53suv/MnO3aezAhgQltiWiTAShkKjVm+tt357/Q2HjhydX1w6OjM7v7SyuLya5/nd+29/7Stf+sbXvyLkGQpQLBNXNYSo0O18BAbEsbBLDIP34tEl1tZf+9q337rv4Oj4mKIyAKJBJGds4pz43LfW3/rm15xx2raQtRNnsVuqYaJvBBrLnzchpRUWR0UZfaOoyhqJx60zeZ5lnc59z73Po3/vYXfsu+m2m347tm0bpQ4IyBoRbnfaSS0lY8iYmANhlk6WHTl+Yv89x47Pr2VsAyTLHT71tL37Dx4+cvTY+ORkJ2uLBGVu1uokGHLwYo7NLB6dWVhp5WASMC4yilglAkQxew0IkVKsytCVYBdAEGUySMaAKlEUkyVAYJCoGg5dSi9BJBqwsnAF1ikzOnD2xFHZXCzS3x+60livyyALnIe8MdBcXV2dnNr+nr/74Gf+4Yunn3a+qPPCRKFovxjLW8sAknhWisZJlbPZ6aNvf8sbXvyiFyzNzwafR16sgsRMVjy8FKDbuIliubEYkzQGx17/ur+65mc3bNu+Z2ltjgwKkiiqqrM2tXj86OEX/slzX/vqly3OH0uTyAbZ4GEVBrXgUpVbWGzZL0dL8RoZE/OyziUREmi3s4GBZqPe+Ozn/vHL//rfg+NTzWaTQ6yzsIgmeHYucS6JdemE6BKLiM7ZoaHBWi211iSNQbTpkaNHhoaH1tttSwSiqTGSe1Ryjfrq+oojqqWUOpwYG5ocHd69c9vU1MTI0GC9VlNh5qASVBhQQAVAjSEFRTAhBGusNTbyG1UYgZQgAKtIhFWjHA0C9fpadQWv+h0gRMQTM0cqvP9yw4MIZhceQImMh6xsrM2yMDI2+ZGPfvJjn/yH0884u5MxKyqCNVgUfJdJNsyxmw6F4J0zIeRzx4+9421veskLn79w4niMJFSVYpm8FLq4MRA10dsPgcm6xDVe/6a3XX/jrcMjU522J0edPFNV4yyH0Ki5+ZnjD77fpR/50N+1WmuAGW32kQtWbnzSGIRWxAYLd7AIPcqdQMiYKK8RyRosYsl4z865waHhK3/6y498/LNLS8sjo+O1WsPaFJSwm+01Qt1ZsdZGBh4oGUuNRoNM3bm6GkSCIDmzNwTWQkKUZ5lXVdGQ5yRqCA2SJUqtGxseHR0dGB8f3LNzx8TUxNDQgDOowOyzrNMB0DSxscOwIaQobQOIAKIciU2iqqCopIgq2lPz6GqGlLmam1bCzPHD5Rx9UQMbRy0Ge+W+TBvoAogiDQ5NfPMb33nrX71rx65TRMFLwAiHKsQ0eLmdvWp0V4nIiHhCPXb08F+9+fV/9qcvWJo77gw4SwwbpUlxj/ZcEDQGWXIWcmkzsHnVa950+50HhkZG21kOSBgDTmFEqCd2cWH2lF3bP/2xj44MDeT5WuC8EoyUTXFU6SsrglV62peh1MICIaFsBLSx8iTWoKkxNq0PnJhd/NRn/vGan/+i1cmGh8etS9L6gCgKikmJOTY6BWcSlyQcJCqGNGpDE1O7ktSCAZe6drae5x0RbxMyQKrQancMEDAaIENWgghLamuJVYJOWkuajca27eNTk+Pbtk3u3DmVJA5VxGeE6vOcCAiBJXdExpCqiAZEQjDd7Y3E3Xos7FYdIGzZ0qRrgYqRqkgaluuMyqFspDWBhaGR8Z/+5FevfOUbh0e2GZvm3gMpQ04G806APqWYruguQPAhsXj40IE3vf7Vr/rzFy/MzZLmaRIrqbqNCCPZRUWtdT54UE1rrt1eHWiOT88svvI1f3l0en5sYns7tK1z7axlbIJAwMEZaK0vjQw0PvOJj+3ZNdVaXUkSy6XutWWy2Ib+Uq+MqfyYlV5V5ZJyEUGiCFbF9d2t2ShopoLWuCSt33n3wWuv/eXtd909N7+83s4Cq0tdrW4bjUaz0bRJwizra+sry6vLy6vr6+tZEFGc3DY1MTm5beeuodERHzj3WTvLgw8oiKo+8woozIlNQ+7r9ZrPpbO+1kioVkt9yDl0DGGt7kZHh3bt3HHGGaduGx8bGWwkiUMUHzLQoMocciSwZICZuuJahowJzIAmyqVE9khxiFdac+Dc7LGi/qtcGt0v11gI0gAACyf12pFjM89/3otyTyJWwDBzkI6oFwDnGvV6vcgJq2qSJPGLmEMtTQ7cfecr/+Klr3/1K+ZOTKcWLKGKJ8SAyCyASmisTSIvglkQicXXGrXp6cU/feHLV9d5fGJnK8/JIUNQ4CSpiZfE4dry/EA9+fAH3nf+uWcvL803UsfMihuwWHwW51yWZbHeLYYkUVuzX6m0jNzH6CZJkuB9zOyE4AtGL2iEVlGFLaqqeNZGc6BWb4piKwutTsYCibP1ujUx2YCoirn3WcevrKyfODE7PXfi8PFjhw4eOXz0+MpqC006Mj41Prmt3hwktOo1sa7VWs+yDhEpcOKc9xmAqkcVYO+Zo5nRwJkxaAgt0fbJ0b17du7du3v3ru0joyOpQ2MghDz3OaqETsdY41wSK/xDT2WRA3fLZEruzSZbHhdQWY2lQp+OhdYRtSz4HrnPm0NDn/jEp6644urt2/f4oPVGU0QURCAMj4zdc+j4DTfcuGfPnna7HTVcox52CGFosH73XXe86H+94K1vfsPq8gJwTiCIEGsllZS7lSgOkThwFPkPgQeGh27bf9fLXvaqtfUwPDKV5+Ia9dxnSWI9Z8o60GyuLs9Pjg594qMfPGX39oW5mXqj5n1GZIQ3aJORopCmaZZlMYcTH7MowCgjZpWwtFy/QUSK2K1LjKwE0K6jpkzqERAIFUCUiAway9pDaIIvzj5DFgBZuF5rJC5RqwIGwCyvrc3NL92x/8ANN956x93HZmbnQc3k2NTExOTgUBMRVIWVvc+8z5DAaBK8ZfZIoCGIhBByCUFUDAECJ4kxhoYHB7dvn5yaGjvt1D27du9sNGoWQUKuot5nxhgkIAQVUQVjEZGk1BCzuoCOHrknkjcqbTX75dOiT42ISZKEEBQNkRkdHfPBE1mNgTYiIi0srTzxqc9ZWlpuNpsFKzvCcs1G4/DBO570xMd+4O/+dn11WUNmCOJxwCrGOpa8JyBoECkEdjbNsnxsbPyX19/0ite9Oc/D6OhEu50laQ0UAksk01lLC/MnTt2z6zMf/99jo4NrKwu1Wprn7eheCG+4YtHXSdM0z/PixIlOdFzlZSCuUmEet1CUMgIi6UL70ivC1252X1VCIOqR0gWwWxQlGiFgLZ+niFGvEJCZAwoaMmidTQzVjHXG0MJqdvDQ4Ztv3X/7rXfeedc9nSxL03R8amJ0dJyMEdU866haEZvnWQzBs04WQkicDYG9z41DJDCIhjBIsCguMc1m45S9u0/Zu2fvnp1TU5P11BnCTnuNUBDUOaPCLBJlTyoNErujFH0gY0ye51HfqrKAKqNZ8gxckibet8mIqBhrggdmGhoYefqzX/DjX/z2rLPPEWZjTSG7bK2dmTn+oPud/5XPfzbrrPuslVgDyqIAxnhWY41wByKWAwaQCDDPw/j41NVX/eh1f/kuqY0ZImtRhbv1coqx28Hc3LH73+/iD3/wfXVHeXsVSZmDS1weAqFxxghzj7yhIhptDxFxYBZ2zmHhM2rZbYQoQ14m0zCzIVNk8rXLkQVVBuw5W+oIbLdYrUfei7xVRJsXIsA9cdEeaKcAZCmR4JUZgdRQlnXSZkrWpGkzsFlaWr3zrruvu+6G2+84ODu/lOUyMbljaHDYWKMAa+trnfW2tTaxjlkMGRU1RB6h43Nn0BAury7XEmsM5XmHQ6ildnx8aO8pe848/ZTTT9k7NTEy0EjYdzjkiTGsKIRakuyoLqBC4qnS9ykeatGPKUPVomqImBEU0hqp5p49WRMCTk3u/uAHP/aBD398zxlnhyBIpKLGmCzPB5v1udnZU0855etf+ZyBPM/bqbWqbIhEQZHyEFTBWiAARMOihkwn5/Gxyat//LM3vOENtYFJTgZVFYglBERNnQs+pEnt8IGDj/n9h37oA++WwJ32amqNACMoIDGAtQYFuBsNGOhKviGzkKHYayVmVBGBiGLdiTFGejpnA4ODItxutwstrLglepy7KJKiohIFM5EQJEG0iIVQqVKhZEDkBZG0B/VGFU9QFSIERkMORVSYCEUCWc05oIlCPsa5unOJs/X1Vuf4iaVbb7nrV9f99o7b9q+st1ySTkxMDQ0NqaIqchBmACUWziVT0Fj97X0eOKsnLgQOOQOKYlZLXaOejI8N792168Lzzznn7FPrKQLnisSyoeBZzW/EML5QSiygkU1tDXtmv0RQwiBKvVAPCLPAgyPjN918+3Oe/8LhsTEkCqyAFolQNHVmbXnRkX7jn750yik7llcWelxukl6vofgtFgwi5N67WrrW9lPbtn//iqvf/JZ3jI9tExZGBrJBFdEQgQEgCIcP3POsZz71nW95XfCtLPOIm3LIkTVpyEV7Y6xlFo4xlCoiKXgEMbEaTsRg9044cJLUbdJot1u/uf66wPkjH/nwwOy9VxHrHIpyCEXAEX0pa03UsA4hxALtrkgyobOukk/c9HNXSxULmdUut46w3HYDAJBQRUXUGEqSNEkSJDN9bHrfHQd/c/3+m2/ed2z6hLXp8OjE6Pi2Wn2gnXkQJWpn7TarVaTAuUDGPjdiaslQp9NR6riaDewTmzjrGml69hk7nvLk3x8fTTgEBFcGCzf1Q545friISwsctiztWaml3WgQrGKIotlHIqKU0Tz7+S88dHS6MTCAYAQAAEWVQEllcW7mUx//yO89/KFLy7POYZ77WDxUORktGM9BQAFpaGT8+1f86M1vfef4+A7vlciYxHjvGQgJEmtAwtHDd7/iZS9+9StfvjJ/3FC3RLB8272jpxuWgwILR9VkFkYgoHh8ILOAgjEGEIeHR3wejhyb/sWvb/jhD35w7S+ueeYz/vj1b3hNu71O2LXnkczV3wmgYJcXGGzMghV880p5eVFQW0g8l3dvVOAst72KZjKeBkVrGOdcUhtkNevr2Z133v2LX//21n13HDw0rWgazcFmvTk6MtRqddqdwGCMBYU8a69DgGZ9hMh4aTEGiZV8aixRzYYHP+i8pz31sQgKuiFoX5bvJCK7JVeoUqlfIBwbJW2BI2JJQAoYPE9MDL/tHe++bd8dO/eeKooiqoEBwRKliTl4z11//ZY3Pfr3f3dpfi5xLoiPI9VtHV1SNxYB51yr0xmdmLjiih++8Y1vHR3flmfBJvUgKoxBiAxYopB3VhZPvPVNr/2zP33+wsJcz1ZiOeW5Aa+rhhBog6wCCIjKCAJCZExgFcZavWFd2upkP7v2+p/85Jqf/uyaYyfmEaQ5OHLW2fcBRfFsnCUkCRzHtaiSKygx0SYVbWKYOYYd5SK96BiUWX/xEChLRZVHvkIcLYiFMUaOn1xbXQgCzrqLLjztssvOa+d+/sTs9Tfd8atf/fqOO+9emDs2tW13miadjIP3gbPE2pz9+vpyozGA1L0r9mLQqMD6Wnb7bXd1Or5RT2JHujKVZZPAVEXuqj8AKchlZSZAbMYoCMHryOjUf19+5de+9q3de09rtb01CVprDBpEa2Fm+ugT/uCxL3jBc2ZPHEucYRG7eUQ2tfwhanWyiantV13909e9/k3Do9tUiFmNxKoP4xKTWMyytYXZ429982te+PxnL8wft6SKxIGhy1vYJJ0cZbzJEIIqCICgRhIKxk2T51qvNxDtkemZa3/xy+9d/oP9d94dROqNgZGx7SHklnhq205lAAGSXoMBYWGJlTQFOlBuHlCc/v1cov6+Ef1d5cpleuXCvUpZ4Iawi3LNgQi31jtIaz7w1NTIk//gdx/36IesLK58+nNfu+6626a2n2IJQshBBQkbzVrWCiJelCNHN8bR62vrRlnFgFgiA6gVlbANcYWyhkN/YVRFHLTrVQCiARUFJFBKa7Ujx2be9/cfag4Oey8GnSpKUGctKq+vLO/dteMtb3591lkzBlWDCiiZmOcqb9bYY3a9kw8OjV13/U2vff1fDg6PIzkfwCUpIJluWCzBZ8uL83/z9rc86+lPOj59OE3QIHru0hfLCgHlvREPkBBYRQFQBJilVkuT2rC28ltuuePKH171/R/86MTs3MDgiEsH6mkqCgxOlIeGBicnplTFma7bFwsKAnSXSOEWFDyKwjbEcK/SZutemoKX11bE5yoJ4DI7oBAaY+Yo96kgSexLZE3WWss7bZ+HqYmphz/0wT/5yS8NKYIoMxnjQw4Goqo6EgEDM6OQEAwMDuWtZWsSl9SEA4BU2u1u6pXRX/BR9p3j4V0mOMa4w5kkZ49gBppDn3zfh+66++DevWdkPiQuZQFjDQgjadZuve3979q1Y9tC9FEIgwTtHtwQK2oj6BmLa9P6wPTxE695/V8m6YCxKQeq1xsd70kzMsaaxBidm55+99+85RlPefyJmWln0QCqMJIhoP4Wyd3SW+e894iWWRGMoDHWNhpueWX1x5f/99U/uebXv7muk4WR8bEdu0/xDKIQBAANABmXDA4ONZuN2ItZOAAgkpUe6lMoeZd1uIuZLgazYNuURSaLVinlHl7lWoZKi77oSBRUrc2KuRivBAJE1qAiCgKBsUsLC+ede2aj7laW5xsDY9YTmm53aeOcMTYPWaSekTHMIdZrDgw2BpqNTmcpdgWtmJVuSXsE0woeWtkljKsnVooV5c+96h8LooRucHDsqqt/+s1v/9u27btYoSfEoYCGEE7MTL/guc94zKMevrAwnyaJ97l07f8m0mPs2pQkiUtq67m8/BWvX1v3w0Oj6+udJE2BCCG6dqDcnj4+/a53vO2ZT3n87OysNTGxjNGzLPCbCnzFIqCgirlnY5K01lTAe+45/B//9d9XXXX1wcNH0lpzaHioOZJmPihHRRFSQBXR4Mno0NDg6Mgg+7ZKIAUlVGZG6CYwSiht2fcqFE4qLcMqCv9luYFK7+xy7FIuVi8i6kKPPC4gUYyFMxI7qXXbrABLGB8de/hD7/8f/3nVfc4fYw7OGlUUAeHAXhhZVBBQIRh0Ij6IP/++9zFWWdiUWI5lbqqq2n7qzyb5KkJQKHrHQY+ayCIGrCGzstr6wAc/nLi6sWkQVVAEddYQ4erS8rnnnPmaV75sfn4h+Mwlxlkb87CVhucRFw4hGJY3vPGddx84tmPbztW1jnM1JQrMimotgvrZmaNve/MbnvXHT5g+Nl2rEYgiECsgGQ4BFKJHUo10VJWoltYGBkdOzC3+5trf/Ou//+cvfvWbVjtvNgamdpwSRIKKeJFYcYUGFEAEEK0l4c7Y2FAttVkIzqAoKpIggWi07WVLUG7VFsuAivij0nuvXwCkvwt2cQgUS7AAgvv6IUXgRwGRRSHSIhAjH4gMZNnK05/2h5dfcfXS4kK9McAQVJFZCYiMExBEiWlHVZ9Y1xxILr7k/CxfR5QNrbD+BnjFVigiww06FSAIFBp4UC7uUfWeJ8Yn/vmrX7/xhltGRsZZlIURVTSIBA4+yztvfMPrGo0GiCbGkqCKsEBZrqALKqgy89DQ0Pv+7v1XX/XTibFt663MuNTYJBZM1ms1ADly6K7XvPLPn/+8Zxw/Nl2vOwNgyIiAZ1UwSAQIW9SSIiZpkiTJ9PGZT336s3/20pe/6rVv+OnPftUYHB8a26622Q6xKth4VUVkAEWNyUhUDr7DeTY1PoYgsYoVUEUlFoyU25FUFkoMaqL9LoLN8t6tVCsU4G3hcRcNDIrsWxFClzVVehchJOyqIwFrt2A1ACkgA3C7tbJj++SrXvXyu+66A1ScS4xxSVIjMl0JFcCeera2WiuX3e+S7dsnct+Ox0V5h5TZ+Bs60QWUt8F+jcICiISkIoRkrc1DnqRJ5rNaY/Dg4eNf/MpXp3bu0K4+VzdzaA1MH7rr2c9+2kMeeOna2hISMwdnrEPnmSMXFkEQQDk4Z1fWsp279nzlq9/6p2/8157de1kCoBjnkCJzPCSOpo8eecmLXvDSFz9vfna60bAI6jmKLqohVAkq3hCQARYIQZCMS5I0bbQ7nZ/+4rorfvDjH/3o6sXllebgyNjkTpPUOpkXIJc4Be+IMp+jAkVFxMBoTOKs98wKBmliZMQKeAaPkXALBFquXSkOpkpn2cjGLGSpKhXAFQZS1+oDxPJ1EfYKztkoLWWIVAEJK8qp5SY6ptu6pRt4FqARAiVJbXlx7gmPfejhQwc+/3+/esrpZwwMjoBx1NNOjQvTWEPAWav1gPtf6AjaQbjnGyBF7KOL6cf7sYVabwFJbdwWqIIaQyBAgBwYjKEYCBgaGh75yCc+u7CyNjY+KQoqklgXvCeEvL2+Y3z4z1/8p+tryyq5KBuLDIHAGsIupqoCGsvB/Pj41C9/c+v7/v6To2O7AgdEMsaqBEE0xtST5Ojhe57ypCf+5Rteu7J4IrHEwUdIXkTQoCXDzAiAilkW0NhafcCl9aPTJ35w1fe+//0r7rzroBczPDy+Z2xnJ8vAJu0sUwBDqOCVWRFcFBPqVsApq4CgAtTSegJ228RElIuIDcmAlDAgQK/XIJajkKKyuFzxWa7oq3ReKp9oG03mRKO4pAQBhBgfEKHnUC4OKTchRFWVboerkgxNFInEkPnBRn1p4cSL//RZe3dPff6LX5870RkamcwFrLHiNSYWg/eo+Rmn773ovme31tfqrhYCKyILq0QVOERF7WnR2cJOxm+NpdHdhr+gSCiiBIiElqwPHolEoF5v3H3gwNe//q3xsTHrkk7mRcRrTghkaGb6xLvf/pYdO3YuLs06C2kt8SETUenmKTH6QdHNSJJalvm/+Zu/ERHjnGAsIXAUKUrMM8fmfufBD3jfu/56aXEeNvTtexF7NwOK1jYDy9DQQJbxddfffOVVP/nBVT9eWFpOa83BkW3Gmk6W5d5bZztZFnUVRDmxSS7MqhHrY470qa7UmnGOmesD6Y6d27tlDMosKsxUauxXaWEeceGyIE5Z/Lscy5Qjr2KRWTI9s9+FWBOXxDYmZcm6is1DIhWhUu1N2bVS1SR1PngkXF5e/cMnPMbVB//yre8dHJnkwD4PFikoG0XrcGFu4SUvelakFAfNbZIGBksbki7RrHarnYrGPgUi3s1UCCMgQGx1w2QoVvx38hwRJya3feCDn2l1Oo3BIREGgCSxnVYrSezy8vJll1781D9+cqfTqqWJD3mW5VFsOa4fkaDczRmJ6MjIxJve8vZ9++6YmNrpmdFYACCbEKKz2Fpd3rt76kN/967W2npiyXsIIRTKIRstapjZJEvL7X//7hWX/+CqX11/o5Abn9w+sW3cWLe8spzW2CaJ9x4A46FAsWaKOXFOSspt1nT7E8Sa/Kzth3btGR4ZzrIOgBCRRPQdu4IpUOJ3xpi8iF7LgXe/+GtZQ74cXhVAQLylwg2PVidxSREsl51rQlREZUVT7WeoqmRIgIFUBVxi5lfa3/zmv42Nj8U+eQYhho/C+fyJmdNO3fWAyy5utVZTi8jY6bTJJM66iNiVa6XjPuyiF2XIh4gMGY0MF+nqARKiF7EuqdUbt+2/89vf+ffh4dHAAhqcS0PwaS0xpFln/aUveXFac0tLC9aaJHEh5NqVCEMRNkAchAUBYHJ8+39e8cOvf/Nfd+zY6zkm+claK6LMGQMT+g+9/z31xLTWll1iDJlyA5ECfYntWv79u//+d3//QQa7a8+p41M7wNZW1tsay/O4g0jWOe99YmMNf0AC5mB6cxbNhrFGQ3ccsjxHgsmp8Xq9FkJHlcUYIIPU7egQD7CyU1wgQBHlKyu5FougMCdlAKkoTY9IRFkMroADimbqZUxvo54fMUpm9ffERMTce1EATEeHhz73xa9dd/2N973vJesdj8aogrIIACpn7fU/fuoT6zW3uuzBEkvMFmOBlBb+XNdjjldPkiQmp2LaL4TAgUVEuCeKTiCgZAyz1ptD//ad/1yYX6zV68ZYBKsqSFCrueXF+Yc95EGPfOTD1taXevQjjgnO2Fitm1BDAIUkaSystD/w9x8dHplUMBpPVjLkHCgb0pnjh179ipeef+5Za6tLaWJUOAhjKQYpi34Gzl78Z3/yo6uueM3rXt4cSg8evmv6+CHntNEwzkGjXktTJ5GAodIVbgVjo1IpESCyiEsSjMKD2h1Sl5jxsdE0daqcJC5iUoQUaVzleSpkK+NCKet0ldlYBQGy3OW0yFHEMpr+HgGFEGqIwgElCbmNMhKWqIhVaLtsZKgUjEkA7eDQyPU33/GVL3/jjDPODiyGDILGBCIBLC3N3eec0x/y4Pt3WiuoAUQiLQS2Uj3s5v7iY0eLmiRJmqax5Vi3ywd0uykBomcPCNYlR45O/8t3vjs4MhpYRVBVmJkIOp2Wc/SiF/2pauBuCTr0wn8UiRVqjKrGGB+kOTj8sU/+w113HxkcHFPFxCXW2XqtAQKGcHF+5plPe9Kznv6UuRPT9dSJsDHGGoMlrlLZD/Whk2WrO3eMvfkNr/72N778kQ+99/6Xnbs0d/jQPbdmnQVUBuaBRt0RcQhIZJNECYOgEqXOWWNiMBJR07jP0jTJOu1Gs+6c0d5AxwaDCBgLX4rp3yCMM8dyqEqHtmJVFbu50j1po9Z4c6i/CXIsHWflzIm1tivMVfp8WW8uZ603R5aWV//qr96d1Aadq+e5aNeAMrNX8Z3W6jP++A9rFoSzWNJpyCHYQmyqUje3oQ9UURbuknW6T4YsIUhwSeK9HxoZ+d7ll991z8HBwZFYScTCgEKES0uLD/mdBz/sIQ9aXV12iYk0iRg7RCEtFhZhVWm3WhMTk7/45fVf/NI/bdu+0weJlRiGSDk4QyuLC2ecuuetb37D6tqStcgS0JhY5bOlqCoAGkNZ3uaQLy7M1B08+ncf8tmPfehrX/7cc//4CXUMx48eXJidCb5DAAQEiGQTJeeBkIwiKKJLkq5mompU0BQVANm2bZIIRbwPWeTtxL1eEeDaJNyxuQ4zcvXLAt4V4bAC4ylkHaLHWWSF+yUT4vtJksT14b0HBecc9nwS772WPLNabTAE/eu3/936ehgdnsxzBowir+wc1epu5sTRBz/ofo942INWl+cNCkW0CzbsaFm0aiNNVIZN41lbYEJxKI01GphDHoGetdb6t/7l35KkJqoAyMoMoMyGoFGrPfc5z+xkmbGgyqAq0nUTemEnAEIIea1W8z586EMfBjDG1vLAIsqBI+jXbq2iyrv/5q8TQ+tZbhEYgINYZ4L3RfyyueuUspdGrZF1fFqrqfcr7Tlj7Gk7tr/37X91fObET39547/9+3f333kXGEcuFYEgSDYlYEEBZUAw1qgoM+fBG2OMsxy4Vq/v3LlDoYsK5iLGOFGNp+GW/YoLn0ZVQ2BVttYmSSo9ndQi7K1IB3cHv0u1wwo+VGER9Xf+jmkd6l1NRLjrhEVv177lr95366137d51mqrDqOFPACAh5N77gWb9ZS97YaezZg2QqgKpACBFAZayskcZ06Ki03PhQRdSGJEraK0hQg7qc99sDv3ql9fdfNMtY2PjIhKrCw1qkiTra6sXXXTB/e93WdZpFcqVqhIC93IJZIwjJAUaHBr5+je/9Zvrfzs8PJJ736N3ibFOOCzMzrzyFS+936UXLq8sIgYljT3FQk9XW0stI0pcdxu8JEmqQTiwUSDVvNOanzmWOveEP/j9r3zuo5dcfPHq2qpzTlRCYDLWGMesziXOJsGHuInTJCU0HAQARoYGx8fHA0sXJRWJALT21Mr7myAV8mrWknOkKt7nLJ4IXeJc4owxUZCoHL5tNOoSjiCCAnDU+o/yM711WaDelY6qwhJCrspk0DrjnFOA9VYb0AC6N73lXT//+fXbt+9RMD74KNca9UINwtzssT978fN37pwM3lPP+RBBLlXFl1VvCiCKyoa0oCNaayMSCsAh5AbRWadCxqaXX/FD74FMoqCAAsgGFDjPO+3HPvqR1qhgB0lAIMu8dTZJLBF2XWlWDYh2YGax/YUvfQ2NSWtWJDOgQKSYpLWBldljl11w9rOf+eSFxXmbIiUkJJ5z46iYnC5MVeJnFc4dc2AQIPASGJiMKoU8bzmCT33uSz/5yU+mpqby4MlgYo2GgCq1tO4Z0KZJUid0lhIOUEvqiamph2aSNNK6CAV0HsA65JAjApkE0MR1BKIEGB1vZQFRAhD1LF6BkcQ4QIMBOOMMHIJFjFEJowoqgzKgIgFZskTWi+aeBbr6yZ6FRQFJEEPsPRYPXUAAjEVzqkCgFtUQsOSAIqieYXRs24m5tVe/9h2//s0du/eeCeRyzYQ8pcqSaQgJNWaPn3jUQy76oz94WGdt2VoD5ISsGlKrQp4hCKgiCCirRD4nEKIhNGQrhKaNBnIAXQ1u0qgH71wye2LhR1ddPTE5ySyIqsJpmmStDijv2L7tYQ97aB6Cz0PirLGmZhwHTRKXZZm1Pc1XlpGJsf/7T9+45dbbzjzz7DzPiawIW5sguVZr3Vl929veaC16H4ylbp81axAIUMkaES07B1HDsOg7HJiR0BiDhshQ8IFFR8fHr/zRzz7ysc/sPu1URqrVkywLQdiSo1jDS04FECxZaLc7zkamNlprx0ZHhwYHolaaKgtH7SFjonfMeWwt09f4sSs+RIhApIDd7Cyg+KjpEyXeFItmRt3dIaBiCAgRVJhj0bGAgBKgiIu0OAndxpiipmtFjKrEjCiiVUjSNGkM1L//vR9+7h+/urLS2r3n1E7OCmwtsYhTbTZqADh74vjU5OjL//xF7daaqiBFHx8RgWIjNtlArQAglGhxiGgrpIJYINZDtzROEwAK0NDAwPeu+O7hQ0d2n3p6Jw8GwBjKOrlLkqXF+d/73Yfv2L5rcWm20WgONgfarTaqZpp5H6wxEWwkMoy6urryhc//39HR0biTfAiJs1mnNTo6fvTI4T959h9ddPH58wsnXELeZ6ISV7l2yQZQUYHcAHlZAMBZi4TY1U1CAWoOjBw8cvwtb3/32NR2ASNIEtS6FMmggrPOOCsqPs8BTZDQGBhgDgpgHGYdHhwacNZ4nyMCAnVbbTCr5l1KOGg5G7pBb0WHXQxfRVSFUQkA1CtRBGy6xd+lFkcACKYn74+AzsXgX4iiAJAyRzZDV1NNI4ykKMyKxtiaQWw0m5715htv/adv/MtPf/rL0dHJ0YmpzHsABCURU7M1DV6Ic98KYe2d7/jrkdGRVmut27AUIgLYbVRXaJ5WmEDdZGpFiKraLEK7OUMAtEnth1ddXavX8zwnNCxsjOuKnbM88lGPCsyDgyNA/PVv/svx6ek/fcGfGGND8KIaAqdp2u60d+065R+/9M933L7/9NPPFBFRTF0tsE8Tl3XWJyeG/+QFz15ZWSBSjXkmURZFEMT4XRseYhEzd5OXoEho0MTdjki5V+Pq6Op/+/6/WlxZ2z064RWdrYXcJy5VFQJVDYcOHJqYmBweHunkIWQsiGSdD7mqeA67dm6rpa7TzlUiU8UhmiAqcV5BtvRqARTJMCuCkkEEJcTYcFKYgSxAN1GtoITUfSQQjHKZiioKqCk5UQnMRhGQBJRcSr0wjYisNcxinQVQH3C9zcdPzNx5569+dNXVt+7bz4w7dp6iYPJcXQLGkjACo4AYorXVlYWlY3/7nredccauzvoKETqXRPNBXclELRr99Pdt7XKi+6U3N9J+oJG3yqIuqR89PvPr63/bGBh0zmZZcM5JYADN8uzU00675LLLPOvPr/nZF77whR/+8AfPe84zB4aG1ldXnHNZ1rHWMLNLkuWV5X/6p6+Ojk2IqDGJeGb2iXNp6g4dPvjKV/z5KafsnJudBoyN4kgxhgvdNpP9aaButbL3JnEQcbaoxuPqLH50ZOQb3/73n1z7m1POPMezkHGd3NdrjcBBORsaHJidOf6kJz7mJz+5prVONqk1B5tZlrvEKWoI3jkbhclBWEFRo6yWQQUVxahf3+c+dwUYlYHEe+/IFXLsqhJ7RLFiTJgSkaKJ3S8MGecckENKiCh0u2woGVHQTuBO1ok9zr0PeZ7leR5CyHOfZZ3p6enjJ+bnZpcPHzm6tLQsAiOj24iSdjs3xlmLCsIh+FxqSeqcXVmen5099J73vuXhv3P/ucVZR2itzbIsKmCFEGKvz43KqBLgvgmhKFp9F8rIZWqiZ2+NYx+a9fqNv7huYWF5fGpbd8krqGq9ni4uLzzhgU+Ym5t90xvfdNNNNwLgzp179p5yaqQkEJAzBgA6PgyPTVxzzbW33rZ/585TLdncB0MWSRNrWusrY2NDT3/aHy2vLETRwhh/EJGIEhlQYGZCLbeE7S4mUCIjIlFTJmpIhCADQ0N3Hzr64U98dmrnXkEjAMZYR+C9J5DJibEDd935uMc88m/f8sr/uPKy17zhrbtPO2OgXveBPDOhadSS1bw1MTYCkjPnqbWgIgLKrIAxOMceb7NPjAFEM9aQpM7nGRlMXJLnAohkKA8M1hlnG/UmoREVDuxDWF/vLM3MLa605pfX1lbXV1dXO53O6tpaCCHPsnank2e5KIbAnXaLRb3Pe3qrweeZIVNLaoim0RgVVRGb5SzQtZKA4pwlECI5evSeTmvpPe9+26N/78En5qcbqeMg3udEBeGwW8bunOstI6gI/3a7iUf5n7K4f68cCQggcc6HAEpk08uvuNI4F0EyZnE2EYQsy6Ymp6699prLL//e+nprZHgU0bRaqxPbJpTAszdo08S1O1mapojuG9/+DhnnkrTTzglM9BB81llbWXrOc5++c/vEielDtdTGbRxnwiBxCM45a2wcskoD7Ehd6nYkhm6j3xB4IEk+8MFPrHdkaHKYhZGQVQ2StZQYWpmfO+PUXW95zctOLCw97lG/886/fsPb3vm3p519Xn1gWBXzLFeVZq0+OTUGGkFkkhCdGlLtisDpZu23Qi+BJRinRqHTaaVpjQVbnSytNYmsNabh6kur2aGDR2dmbjly+NjMzPH5+cXZubn2eqfT6WRqMgYOwVpLxtRrtajfQGQMGe85TdJYC2vIBQ6EDjBJak3QEDggSLRn1kHkKRJhlndiVwFj+J67909ODH/w/e+77LILpo8fGRlqxuYCoBr1CGJhZAnc0k3qoqUMMQDYIkVXEOq6MwSoqCCKSC5NlpYXf/bznw8MDkULQNjFzQKzdW5hYcEYNzw8yoooaKyb2DapIADK7JXB2QRc7a67D/zwRz+dmNzGgQ0ZS86zt4QqPDTYfMbTn7q2vpw4B0qFlwgAiizqQ1BEKkDOSvVMl9EGgKCgkAUeHR//3pVXX37lVWff99Kc2RhIEodohRVVEmOW1lfe8f53EAppZ3F++ll//MS5hcUPf+Ifzr/osrTWIAXO/cjo6MT4WO47wiEgKAshaSRYR8JQCY8u5dVj7xkUQWdrWaZpvTE4PLTeCSfm52/dd8cNv7153+13z87Or66sEhlrklqtltbqBmv15nCC0NQuLSJ470MwxpjURLXMlND7nIAMRkE/ElGVoIAAoV4z1qbr6x1DVkWjfhT7TiN1CrC8tHDPPbc/8ncf/M53/OXYSH15ZWawWcuzjjWuF5pIT11ErbUqwCIAsomutLkCyRY4WOGTdpE6YWuQEPPAQ8PNa395/dzc/Pjkdh+CRVIWsICISdfFcWRsHoIhx6xJWhsaHshDBwliSkVYGgONX/7yN8vLrdHR7ZHmxCLM4oxtt9uPfdwj9+zd1V5bjhDUhlMBkalNiCIqsT9VwTXeSB10S1E1qk+kadJutT772c+NTUxlQU2SsM+sJWPAIA02GgfvvP3lL/mTM0/bu7gwM5Ci9/nc3PQr/uz5q+3sC1/+xvnnX+Ssyddb48Pbh0aGQmgDELNY6ooPm55YdiX4KiSYYqV8apO03syD3HXgyK9+c+XPf3ndrfv2tzoZYTIwOJwkjR27p+L+qCUNYcjyHNUZFIIguUcEVEiQNGa1RQnBIGqXMhAQMTEmD7kwAyKDeC/dzCOzilqToLKzZn1tZWZ2rlZP3vTm1z73OU8KfjXLlxFY2aIgC7u6YdYYLG8k+bXbDiUGZYAY1UikaP9DZCu1RRsOtoAKAqEI1NP6jTff7AN3iR6AQhbBiLIqGGNFRRUMUUTrG/WB4UZDfQ7CgC4EFSRVvPzyHw4ODpExeZ4hGiJnjQUVInz84x9rUBCkWzDd6wYY/XtjDKJi7Cde6iFULlizZAFFlDOfjU9OfuvfLr/ljiOnnXmuEHXa6wONuoDJgg416otzxy8574xnP/UJq0sLaVLvZGuJIwe4uLz4lle9eGF+/vIfXHWf+1zg2TeHBhsu9ZyjJVBQQJZAxohwULEa0XMT2KMCEgUf0jQNgYlsUm9mQX/209/8x3997xe//G07l8Hh0dHx3dtqNQWyZDpZpmiCSGAxCkHVJKkAgAohiSpFzkmXrIzoUJhDkCRtimqeta21kckD2m17wKrM4KxFQGtIIXQ6q4sLs2nqnvzE33ve855x+t6pxdVFlrZFTFwavPSU42ORpUSJmZ54I3CQqCgSHQPRGOpihDO6FqhIcJRr4yHqLzLU00ae8a0377NEqIAaOakkcTPGmnPsFgqKMBJYkuF63QkKmBCABRsDzYNHjt6yb9/w6AgQKwoSIigBe5+ffdYZl158YXttlbqgAxSCX1FKQAWQTO8wxuK03VT+EgJFjpqh5cx/8ztXTGw706bDnbDSaDhQApMSYVKrrWRrL/3TlyfcysQHTQRdYAYDKGG9tfp3f/PmpaW5G27eN7lt9+BwE5FAURGiFi7YrkI/CsY+G7nPWUJiLbMHotwHZ2tk0h9e85uvfO1f9t9xF9l0ctfZjcZAdE4B1Af2rC6pdbLMGFt3KQtnPjPGJs4hWWYWFCIrqAjIwatCkjhQC4YCkoKYWlNB1ABZp6abewfvA+ftdtZureV5K/hs795dz3j6E/7wiX9w1ul7svbK0uIJg0SQCIsXQDAa8V3PEDt3Apo4+DFGQQWFIvFHiMEHY4xBEmYFsVGlKzIZir4ZXX0CZQ3i0vrs3Nxvr79heHi0S+vRWNjFRUulGLjGopjc5/V6w7lERGJDLs45SZLLL79idn7+1NNHs6wdk/x5yGrW+Zzvd7/7jY4Mz86uRYkT1U1tz3tORuSib+r/ULhB1jmMzqvA4NDIj376q1tvu33vaecraJqmAoGDInGz2ZiZPvIHj3nU/e93WWt5wSYJqzrrSIBFbGp9yKW1/rfv+utXvOoNN9x083Of/mSEWG3SzT4BYrTzxhjhEBMKtUbT+wBkkJIkadx0022f+sznfnXTzTt2n3r6meckaTMEyDMf+04ZYwGMKhiTIIoyxG5dqXEAKD5Yh6mjWHztiGIrZxFBYAFhlizLVcWHPM8z7zNm38naKqLAot4QDQ8Pnn32GRddcN8HP+gB55x95vBAvZ3nJ2anHWFP1xGLvh8xp1ZUC1VqlPtLecos7Ojp24LJWlTwRKETjB1UUPfvv316+tjEtt0qXcFmVJAteCAcU3oDzUEi61lBBLB7xz/4wY9qtVpEn8lEHzmeqnzZ/S5utdpxJbJAubdVn29BFei8wCQMoYLNc1+n5Bvf+peRsTEkzH2eJFZ8SNMkiBKHlOC5z3r66uoaiJrEUoi1oRIjb0PQXl8ZGR77yAfe9/wXvNBKXkuSVrdzOauKc057SisWScUDEbO0OvnoxLb1jD/1+S9/9Z++mdSaF1zyQGNTZ5L19YzIGpeqKPteoTsgs9aTGqKw9xGrbrdarfa6SAfAs2fmECmzKoJEptuqHJr1unU2dTQ8UCPTGBhojIwODQ0Njww39uzZfsppp0xNTU6MTzhDCuLzbGFplcjUa2mx4QC0YPKUQ8hyQX4/Y6lcTlS8Y8vKbXmeF9QTAiBjBdgm7jfXX5/70FO8j8EZI0qUD455H+dsbMqkQo1mM1IIcu8NUqPROHj4yP479zebTWZFY0UCghBhlmd7T9lz4YUXZHlHmMmStRhZAJuICpv10SoFNBzdP1VWHRgavfX2u3913Y3b95wVNBhLzOxcCkg1o0tz03/0uEfu2j7ZWl6IRUVRbSke8HmeO2frzq4szW8fm/g/n/hwp5Ott1aj58ccRCT2lDXGKCioEKBnQYTxbbv27T/wrvd+4LY7D5x51vkjoxOdzHsWUQWyrGiAXEoImvsOAgwPDXLwc7MnlpcWW2sredZOra3X07HR0dGxidGxganJyeGhkdHRkcGBwUat1mg06o1GmqRJQrXUJWmSJM5a45IkTRLb21as7SzrcODO2sI6MxEZY53BEDyYqNXUtdkhcLkSsEzFr3Sn6+e1FRRbE1uax4xSWWozntbS+5o79t9JxhGRz9kSiQZCtYlbb63brmhStBCmW+shoIpBWAE5SDJY33/nr+cXl7bt3JNzMIZiqj91ttXKLrnkwmazsbI8Zyjyr7FcKVyuXyn3oCwD6L26fcqzfLgxePWPr81yTev1dp4bMgZIhdBSkuBwwz358b+ftdZYgrPWe2+ds9ZaYwLn3nsEZclrzq4tze/eMcGBW+1W9JorJckIqEqIJs/96Nj4N7/zX+//4MeGJ7b/ziMes7LaagdUtHnoWAPGOoNWfKZMzgKRBfaHDt26MD83NNC473lnXXDf8/bu2rltanTb5OTwyFiaGCJIU2cppjgACYTVewblwLkIF520s3Yrb3dRZgAlihKImtiE0KgqcBdJFol9tDc6WZUJbuX+zkVPp6KKuTzsUTSi6CtiyzWzBTrU6+CckXXtdn7w4JFaWvO5GDIiodFMlxbmF5dzmyTOuR7UDQhGVIyxChChYbJGggDAnXfeFZidtXnGBo21LoRcUVj8ZZdd7BJDhM654HPVjZ1RAT37KXkl+p/kvpOmzdW1/JqfXzc2vk2JjCVCstYBYK2ethZnHv97Dzt9z8752WMuSXxgMiYma4LEMjVlDgYANBgy7fU17cKGWhA1RaRWq0mvkYxAMrZ922c+/6UPfuxT5190v/HJnettD5QSojWIZIRZQog1ksp5u7WytLh46PD+c87Z++qX/8nv/d7v7t4xCYAWIEiedTrsOxyknYfWGiZJIiyxcCIKISDGDh9BQZ211rrYuJ6Q0JIhE+FAi9ptshvFEgSEOTKnyy0vy+5OYXgqhPxyp5TCP46k58im3WhhFIkcJX4dIxEZ18l5fm6RyNXTGktYXFk+Pr1w2ml7XvPCV37nP753xx13Dg8P5blXMCCgChETAuqKBQIaQLz11lutc0GUjGVhDF2sYni4ed7557Za60hRddCjYr8685avcgcQ6FpUe/fBIwcPzwxNbe94j6QQdRnIkKHxsaFHPfx38tZiYlBUAQlADahnEVRDvX6xIAQoqMZYVSXbZXLFBZ0kiTBneV6r1VodHZ4c/thnvvCPX/rq/R78iKQx1M4CIqYuMYiBMyJNrGWQ1tpSa21lfXlhYX4msfTWN77iGU994vDg0Ep7dW1tUb1XlSiWSIjGuMRGTUEfuRtESoAQmcEU64RFVGLJhGr3GJLQ7U8AEpmoBDGBC4AGAaTSAM70qTQV7SjKnlDZFJVl4+M7tkzALmsHRbnQWjJ4+NiJrBPStDk/P7+6trxnz/aXv/QFT336k0/Zfcp/XX6ldklzPRknQGMss+Q+TxPHQYxxq2tr99xzoFFrxtxhlNJQ0Nznp51x6sjIUAi5IQocCA0ZKnpWxPCwn0WwVWgAIeTNgfS639yUZcGldSAG9IRIQDZJ21l233NOO23PDm0vJ4YyQAEUUFAmMoqGCIicKkskpEGskolugxS1FgDQybJ6vd5utyYm93z4H77y+S9/64EP/31Gu7zaqqU1A5Str9WT1DgkQ5zlS4tzx48esqit1cXtkyMf/Pv3PeDS85eWZufmj7vEWQCI9L3ewa0KFHujxEAjot69huPMasgZghBC8OqcBVVQpVj0BaoAgorKLAwY2U6AEazuq/Up1lARlJXfL8QON3wGgFh9ENXWRWRTj6OiEUS3/zdr4tz62trMiRNk0/PPP/9JT378U5/0+G3bRpeX5xdXV7vFXVEtx1gEE4IEn7fWW8xqre34TrNeO3Tk+JHp6Vq9hoie2RECKIsE73fv3p3WUvbtkHOUWd6yqUflsSsM9p5nJ2TN9TfdUKs3jU0EcwVGQJFuf/Dzzz/PGgzIsX06K4AoKwMQoMReCBqrz5EAkIVEBH3oFQXEg0wajcb6emtq+47Pfelrn/nHrzzooQ8Paj1jkjZCYBVvrYkt81bX1g4dOLi6vJRazDrtseHBz3/uU3t271hcXAARR8aR7XQ61lkOorE5GmAIIVahi6gAIyCS0S6KB4oYhdjRGCJgiZyQWAKQayysZ40ChLFSLALHzjhUWzAagvfG2qKWqJBtKLT6y2Jk1KN3RC3b6AaFEAyZjV67xRiVyldz5+i2fdddcuHpr3zVqx7+sIc3GrWFhfm5E8esodRBzZIEALUAnHlvTEBCIu2026qMKiC+VnMn5ucX1tZGJ3d0QjAEiiBgDJBn3LVjZ83SSqsTNW4VSQsB5VKEWZETLB67vLBcMrS85u+4+4BtpEFyAE6stcZ2Mg6hM9w055x9uhfJWB2BApAxhIDBKijEPmPd/n5FMRIjKVkLZDwjSKgBo+Q+4Ojkzv+85ob3fPKLlzzgwdQY7GQ+Lv40teq5hgiSzR0/fvjgUVQzVBsA7njffu+7/+a0U7fPzc44Z4FAQHKfk6EQPHVLdwVQiKLmOBT9blh6nV2VY7rPGEuE3odoEkAUkI0zIQQNAogSGACNJdIodE0siijdBp8AghB8jkSKEDggIftu+xhFCNEhBmAVIPQcDBEZEhEvwRijEXZTtlFDtJiSWF7Y64dFnWztYQ998B/94R+MjY0vLiwszC8BgIs1U4kdGGgoA6EVBABWYFBS1TzLsyw3o0OGwBDOzMywIiUphKAhjzUaKuisO+O00xBEOIvwGmAE8bVoNlXuvFQWOCpnoOICSlzt0Mz84spKbWRKhA12y4qscwRyyq7tY0NDrXa7ltbyEESDolhQiwQqHM/4Uu0VFGcHg2hXAMUHdqhprXF4duHtf/eRMy64dHB8PA9sUieBY38il1jptA/etX9pca5Rb0gw9SSZPT7z5Kc8/mEPfeDC/EySbLgK1hIiEppuT7So5VPK8XXDTxQCQCIVLCaoK4IelYGxq1mWJEkcNFLqEtRiYiiywqDbia6Q/1bQ+PmCHiO6ucUzIcYJI1IAY20o6fmpgi2ah8f1Xi65FdUsy7Zv357n/sSJE0UlQNGtfnh4xPsMEAIHUVYVVDDG5N4vLCyeundnRobIHjl21FhLXZIYcRA0rKxJkuzauTPPvYgSaRRUCj628YqdG7FQyiligcK6VliUxpkjx452Ou2RWs04RxhVh9hYBwq7d+0cHGjma22JGTRBLyIQyZZQYUsVYSAzoyEEcmQFEKzNgjaS5oc/8YGkVt+9Z3e73VZQSw5RU2cxeGI5fPjw3OxsvZ4YYwAwz9uDQ41nP+sZWd5WYGawttu3m3t1JmUFwjJa0XV4caPZW9zt5ebL5WCiXCJijEHCjbZfqBXMsOIbbKq0L0ZbNHYEj6ORpqktSdWoKsW4tOCUlUvjDFFgbrVaUcq/rM0ZjcT2bdti6V1XAJAIQJC01Vo/Oj2NaBQIABYWFq2xRCSBLRHF+SasNxoDg0M9TmohWBRDRF8+lYvRKauilLUEFTStpcsry2gMIgQf+XEaRATBOTc5Pooo1mKe5VFK3BhDG63suu8U9ZdxBBJnrVHUgMCG0LM0Rya/9R+X/+K6m866z3lBQQhs4liCSiCVmkuOHjq0MDM71GjWa0nuM0PgQ3b+fc/de+puH7JaLSVC1Q3r4pwrSHyVBtuV5pIlfcEufBp/W8iAFLLRG5cq1OVKr+JqcfGVy+zLrSkrahBxtOOfFKtfRLpRWJIkZeXHHv8+UC+zUe65GmFGVR0aHhRhDhyhxNh+zRrrg5+dW4yq/izaaXcA0LnEUxt7atmBOU3TWpoUKifxaVUkSZJiGMvkw4I+Uc6CdcEJVQGYX1wy1qZpba3VCahIAKhAkNbTqW0TBMIsqUsiOQJ7yCxoN44sFwT2vppAmEOGAIwWbe3gzMIXvv4vp55zXs7CEExiQiczSI4odXTnvltX5uZHRwY76y1CajTqwYtIOOOM04zBLPe9DtFSqScsegWVK+rL/bYriYVCiaEIVONeighNWUx+y0C9y8To5UCjEsimNnKIUYgjTdNyg5Vy8+GuBQoh5HnunIvfXezyWP1fUVMvvjtJXAh+bGzUGqPQwzQRRBlQA4fFpeXAUTdUVlbWiIzPPfYE7SKtZ3BgYGBwMIpYi2jxDOW9GEt0C3xiM3iosZ4/qnqxSKvTimBEjAkI0VoXmJNaMjTQQGFCiAJfRKawQcbZQtSn3MAaAPPcA0K3gEdC0hy4/MfXLHWkOToRpT9jt1QDYAmPHDp44tixuCUajUaUvEyTmnNucmocELK8HeWeimr2oo6q3BWpKBEu04yKQuYyky7agCIUj8d9nPgiLKdSOWJ5ScVelIVWWnnkTe9VRFQbvd5L3xX/2RUqKIqaKzK/hX0rNG96qVbO82znzp1pLYmgTvxGQyYC6gcPHe7kHskQmnarHYlhAIDQlWpT1SRNC0y9p6WFxXFfVm4r5PjKOHq1baW1mc97LCIo+pSzgrUmcQZV2OdRLDwEKVQsFMA6VygyFxNDhMY6z0DWZFknrdeXW53/+tFPd595n3XPCkIq2f/r6z3DLLuqM+G11t7nnHtv5ercLXVL6lZOrYgaEWVJBAUMtvEHDDZ+PJ7xOCEUkBMe7LHNMMY2Dp8/PNjCEXDEgIQIMiiTlFpqZXUOpU5VXVU3nXP2Xuv7sc/dtWuf26ofPKK66tYJa6/4rvftdNNEN1Jd5m0xxfp1q8UYFGHhiuCxiowaRBKdWsPGUe0PjoEfY4fUZuHgL4QeOBR9iMKOiIIicYFlj7fmC+p+IVQjrCgZiiI07qhJ7QAeywRml1QKra10MAZQhqXGjICw9Pv9DRvWT0xMdHs9IkAUQXaM+YBq3779nW6PlGaRoixFGEUcvaBzPy5uIgASVWkHVOt2oacNDcVRnESbttXlaS0A3V7fsHWVOFuLSFgRa7O1BWlIlNJKaaUdwZmxloHLwnGUScjXvNQ81Gm/sCpJs6zx0KM/mDk+Pza9ujCskZC5oRMFkBAdOTTzgff9hIghjahJCBrNVpo0FOkkSfO8qFYNBQkT4WUMGyHJqdfB8DIJjo3QP4dQPTlMvWX5V+QFIie3RASF5EOeJ7MWkTzP/dJLeJGR0EJlQH4s4pNHRHQMOkselbz2R7UTXhT51NTU5s2be91elXkJKAfdBjx2bHb37n1pkjmEt+MIrpYUEZ2gjmMN8d8RWDp//iFGDygktw+fpgMJoKoW/8AKG+tKZEGwwnm/h67k4kp8zt1LkmhP6eWZdX1KUVpjAUgnzGxFvvXt76zZsLFkIKWZS+Cy3+220sbB/fvP3Hz6NW99Q1kaQS7ZolZFbkSUNZCm2ezsbJEXSmkkjZhYO9ClW45XYWaAZa0v99A8hNSdtLCYCFhaQWpJj3+tAvEk0VprmQ0bF0MrTp/gV+pRbwnOUS37DDzQMr6ggbHj4LKstdaYsiittQ5pW9H8FmWr0Thzy5ayyN1LRFBESmnSCS4utl988SUgbQXYGg2MbAlRhITdVIcsMyMYNsZaY63bGfTO3GdtkRBnWIl4zhERUYATI6MgUKVTiAyWDStBRMqNLUouDZvB1NrtebGFhHSVMwVnccB3CWItM7TGpna8uGv/4aOjY+PWmEwrLgsEBZR22+2FY6/+5I/eMNVU69esVIStkREGdNTDbsxwaOZIt1emaUtEmHMktqYKmG57HATYWLGMLNZY1+InIq20I9lgy07uWtid30GneCCxTW77RgZTKB+GrGXLWumlbw7wDlXjVKriyFGKEbo8ZOk4uSQVBkR6FboPwE0tyfsrT3TnnmNRFMIMLAmpNEmBRZOyxhKgQgKBVGlke9nWCwk50QlbJawNsxGDigHsK7t2dosSAMdarQSZuNSKLGrLbrxH/SLv5n1RSIl2Mh/aLXgP2Gg8BYeP+v4gRsAgEIGCV01MgbEijJpAobVGgSQiRT+fLUqTNIAyAAViLfeQrEalTMIllMaEucVSxQeYWkMsVrd+uOOlds5posH0wZSEumCtktbc8eOXnHP6FeecnhjetG5VmZcsiJRprXSCSZYg6cOHT+zde8RyqpVW1E9VSaDZIogSSySUUKJRpUohWxQmRGFxJkWAipQiAgGxrEkjgGPnd/8ELCigSbn3opCEGZxSKyAhWWNQwFkSsAulyMaiAIoTzHHNd3DaDeg60KXl0oplthYFEFAcsB+oYpJgFssUiuX4VMNHBw/BD2f9jiSViIp+/8ILzpuanCz6fWaHcEURLopSKb39mWdOzJ3QiR4dHTWmdJUhKQIkEVZKk1KmNBIkjKTRG34oUBXy5ZZl6RWAl1XdwiumV5RlUZalw4kr50HKotftHp+dE1IW3IKwWyPmJT3i5Y21pY4IWwAWEGPtjmefz7LMstFKufWXNNG2LIte+7q3vFUTsjXnnXvOifkFlXiePBaxqKjb6z3x1FPMwoKkUpepK4IKIiuWga3nlEeqK/qE1Olh08jlN2VZloPubqTf5TEYOkk8771rPrkHGz1hN+d361GypCe8JMcjsCxhp4in2CVNSinHehHy0IaixgCotLbWbNq08ayzN3e77SzVLhlBIAfqOLDv4AsvvJhppZNEGLROsJLeZACwxrTb7fZiJ9FpFZ6wqudDXkH3UFz56nMg5zUdONC31Ioi33TqKa1mI+/1qiVea8GysJjSHp452u3mlKSUJKSIKlJ2BFoGWnPvw9PHWGutgFLZ3NyJnbt3T0xNs3V6Oai11ihoeqeuXXXBBefkea80+UUXXZykqautBMAdEkWkEv3U008fOHAwa4wApgwKwAJYQCtgXVtIUGRAZxFlxJE9hcLIA+KlJf7NKAcIR6H+tToVdqdx49MdPPlXSKkTsuosGZD7/agl6tavwvaol0lzWUOv12tmyTVveUtZlq6tK8aCY85DykvznfsfQIC169aTTgSEBYDQmBIRWHhudu747HEkqijMKlyBqgu2+9vwrcUsyzyXpXtGea+7Yf3qtatXmSJnWwKzGLbGCDNY3rf/0MGZVxlVzmIFCJX7G5atcfSfyyckA3ZcDajSrLF33/5ev99sNt1FFkXR7/XYlEXnxIXnnbV21QpTdIu82Lz59CuvuPzw4ZlGlgpXKm2CYqw9Pjv31a99s18Yw6STplbaEcxpBaRE0AqAYy0XJwocgJRD0syYonCQtnoCwxDsWzFfM3sC0LCejdYWvPHVs2bvlcO5ZGVAUVkf2V1YUnrbGli6aWTJ/ML8ddde02wmnW5b2CKAMBMQgErT9Imnts/3ilNO3eiCpqOnhMFWUafbPXz4CDC6e9Q6cVmy334PKYjDkt4zEocjDhE7MT5y5uYzyryXJQmKMBhhFmv6vf7hmSO79x4UnZaIItUGL4sYqFL68LAuqREAsKBOs30HDuq0IQIlW6202xFRyIniSy86n8CASJn3k4Ruuunt3cV5a/pKoVRNWxFEY3jH8y9+9Z77kmSkKKS0xnXqjTWAYrl0xJ1uZQqDejCSrpIl2JD4Gtk1lKN+j6/aQkywtyfP+Dy0sbQ0zhqcUvc5oWhT9TPuW6F1xwwvg157qN3sZBkc9djmMzZdeMF53c5i4vAlqBDQWJumjWPHZh/97g/Xb1ifNTI33heWNE3ciCbPyz279zlWP2OMtWUlRllh9SUUYPB9VU+GGp1FtoYQXr/tirLosy3ZlsjibN8YU+T2ie07jswvYJoxEljQgppIpYkr/r3nDwtSEDdNo5nDRxqtFpCWarCjUMQUeStL1q1bbYo80SrN1InZE9e+edvrrtg6c2BvI8vcS1BakVKkk163uP+BR7/2jQd1NiqQWqfBqNwMERCFyC+rYOgeQqEWn2b4uWk4QPV+IqDsxCjI+OAV5iphu9nnxEtN2kFL2l+Jy6IqDxTOxqKpnvc3Yccz5Jg1piDCt11/Xa+7iApMUYIgMxJpy4BE93zt3lUrp7NGsyhLRSSERVkggAgL885du5hB6wQQ86LvnDez+L3BkJw7aoMGX0SEWarb87OXX3bx5MRYmfdRmK0py0IsK1FlLq/s2vvEMzswyUBpx70GIlacTtYy3+MbiaQUqSQvzcyrR5IkEwACB7BHROj1uuNjIyumJ4uiTwSp1mxyZPszH3wfmZ4tckJK0ywvSwFgwJLl+OzC17/5na/cfV9hFaoWUCJARWmV0sDA1rqrCh+4hxrXl/BDEVLnJMJjH/oV/1p94uxjli9sQ1Vv3xEMJ0thDuT/iaJRbb1j7ZNzZ7YuEDEzojDbouh32u23vvUtmzZt6rbbOkkGm1+aGRpZc/tTTy8s9teuXcPCpSmYTWkKR1yXJMnevfsW5heTJCNEnWhjjGPQrYNWwxsIE0bHoMPMiaaiKE49Zd3rXnf5saNHE624eoJAiP3CLHZ7DzzyyM69exVpESB3HyCRPYb5n2uBdnv9Y8eOK6VMYTzTqlLEYqempgIWXNNspHNz86+/YuvP/NT7DhzYn6RpXuQ60caaoiwFsN3Lj88t3P/gI/9x9zf6BnQ2UlpBqKAWYpgskGDY0vRxyj8BVzH570RnPsqyQ+ftE6O6wqmnu/f/fbIvVwjnee5yYnXH7bf6IOezClfpLa05A7hmpWsBu1GOWJskKRD283zl6jWvHj76wAMPTU2tYAtKJYJIgISw2F5csWql1vr5F19EpVxWQIjWgFZJd3Hhyisv3bRpQ1nmipZhn73Mb31qE3NEuCzBlqg1U2Ptho1f/uo9SisChxpA0gkpZcUUZd+W/YvOPrPpuM9IrCIQBite6pBFyA8KkFSSdcvyK/fep5qjujnCQIRgi0IhmCLfeuF555+9WdlcYaUxhYj9bvcN27bt3Dvz0iu7Vq5elZclOlwqpQqUWGm3u8eOHzt46OCqVatWrZxGYEWYkCJBTRqg4uyPEOyR3/WOJJwyhXJ3oZuJcE7hhDWUZYnkE8MP9AHBKyVWfQSfaoRR0BmKs2tna36+7xFxjGSYCZCAuei+68a3j4w0EDDJWiUzCAMxC5NWjz3+eFlaW9pUa4UAQpaRkRlt3xY7d+8hysQqMJhUpOQ0VI/dj4hDLeOl1r5KgaVz4ujFZ218+5u3zc4cIJTSWCNYlIbEalRlLo89/tx9Dz9mRybyJGEANH0RLlGMiGWwlkncNgMggBAgSi/PCyOGsShK5FIjaE0uxRhpZYqACLVWOlGWjdM8KfLOx3/zI5s3bTiwd1eWKFNarRMBFoSskQjKiW7x9LM77/rbf37ku8/0y1SlEywJasVUMtpQwiHi1w1Hy/72vXfxvjmSpgu5zP202PuwcEWzHotCn+SbT96I1a/eeUc4GYjMyFuf16Xz+Zc4Nj9gnVDR72/cuHH//kOPP/l0c2RCUBRZlqo3VZZlv99fWFhQpND1LaESsrNsV61Y+fpt21CYhBVAOVjyCHvQ9QFypBaglHJ40EShWL74wnO/evdXrRBlLUFlTKnBKsS8MEh6/4EZ3WxsPnOzcKHACCjSqePjrnQPB8yQpFAn6Xw7//p3HtbNCQFEYA2ABAxIzBedvfm8M07jopu47+hkwLNjdZq+4fVXPPTQIzOvHh4dHTeW834fxIoYnaWWEYEWFzovvbzzyJFjrWZrampa0BamDziguFy+VuB9SSSlPSwpjCsp75Ci1b/IvdXz6Gg+H9kxEalbP/Jhb4Phoffln/+P0DEYYyqebJRBwZ+cuvGMr9x9bwXIgKX+ZL/f73Q6lQy0MaSVpydF4X6/+8arX79iaqLs9yr96fqwPYitofL0sizN2iRJBLBfFqtXr9VZ9rVvfGtqehpQEaJCERBEMtbkeX//vj3jY6MbN57KTgPQ2krMO2zBISChUslcu3vvfz6YtEZRaQRgUxprBFABX3TOli2bNpS9DjILAqB2eJ9Eq5Kl1Wpue/3rHnz40YMHD05OThKRIl0UVQ9GrHF7cAcPHnzuhefyMl+1anWSZVppDBoo9Xp+KDYjfMehGcW1xvKQVBd699P7KE8KPyRM7dWdH709EncJm0AuY/KCMe4KHCxXKoI3x3dNeV6esXnL/v0Hf/DYY9PTU9aWHkjrDC7ccocBBVCiVb/XO+OM0889++yi6BOhBCVrOGr2UTz0i86TVwmBgrwsSWkAyAtzyWWXvvDSK8++8OLE5IQ1JnFWTYoFOr1eWZaHDh1sjYxt3HRakfcVCLkNSAAUQXIS0JWbnGv3vnn/o0lrjAG1JhRGAVKahM/bctpZp2/kopcpKi2XPNhXRHHtutZI69prr3lq+1MvvvTSypWrk7RhLCMgiFEKWUTrFBB7/fzlXTuff+mV5tjYujWrUJYK73BCF8KDhqa3Q7/CkOTzofqHhAgTvwcXVVTeKrx5qVtv/bD/5WrZZ+DxQqKhCDxbMcFW+BUEcZartmw586v33O23O8IY7DZUtNYMHqsAQFQUhUK8+uptIpaQrFhFypcDIalsCIKOKCMcpyk6qcDSMjMQXXnl5d++//7Z2dnx0dEizx3tmmXWKs2Lst8v9uzdB5ScvWUz2EIpIgCFIMxICEgOm5Qm+uiJxXvve6AxOgnKyfZZYQuIaM35Z55x1ukbOe+hMAugShBA2AJbUtDPuwTQaLbe+c53zM2e+MH3H2s1mlmWCYjWyFYIlbWWSDMikDo+N79334Etp526ZnoypmAbvMswDYqCzlB7Cv2KZ4GqI+rDsOV3GULPF6I7QnxYhRjy47SwUPRiZsuG+4Ns3MmJgRNsB1BKLSycOHfLaf/Pe99z9MghB/INUZJLE9MKI1Ft0iDSiy+/sm/fAVJJySK81D8M1WsjOEcAoKnAjCpJtE7L0mhNSmFn4cSqFdO/eedtYPK8u5BqDSJirEIyZZkkaadXvHpk7st3f+vbDzyikiaDsgIGmBLXVQPLDCxlWTayVGvFbIEFrCUUrZUIs3BRFCBVweE5+UgBKWIuG42EiLnooCl+884P33n7LywsHD9+/LDDzjFLkqSGodPP89L0Cyuoj80u9vqFc9ARzD7ESIWooCUMYFBMRf/kX2uoDxRmQh4xHG53hMyZNtjmsYMvEVG33/aREMvo8Xhhbzsq/wazT2QQJ+ycaF0ao5Xqm/LSS7d+45vfnJ9v6wHE2C+auYqbCFGRADpoS5bo+fm5NNGXX365WOuY1upUQKEDj0RrXSpmLYuDwSO6YWme52efffbY2Og993xtbGzK9SdNadI0cbzkbJkFdr3yCiFsOv2MJEnKsnCyyFopEGRrEq36lr923wOsUp0kRADWkiJrhIty0/p1F5y1xeadLFEMyOCIw1GBMDicOBIi27Ioyssv23rZpRdt3/7UwQP7xiemAKDfz11e6G6mKAql1Q3Xv2ViJFu2+R8k0ZHzCKcI4bp79OuR1wl7ht4zLROoWx7XwrMa7QSr2269JcQ++4GZz8B9hzrMoRwgDRG00lqRsNNRR2OLVStWjo5N/PuX7p6amnZwfW+aAxbYYL/dwU/Zzhw6+Ppt2yYnp5gLDBfblmdmUf4YpEdOmIjA6Qm4ZWax/bx36eWXGGPuf+C7ExMTxhjtFsaMEctEZEtjrHll7568KE/ZeOrY6KgtC7aM4uiMRVBKwW8+8GjOqJOMKlouEhAx5boV01vPP1dxoQkZHEMCIAgBCznBIEABpVET9nq90zZtvO6aNx89duzp515sNBpJoh0rSKWbAnZsdOTmt12TKglXvMOzFIXvoe7Z/0BIn+B7x+FwLUyPwj5qmHeGWxzuDYYwjaUUJ5RfrItVu//rcm9rrWVblrm1xgEcy7IUR/ApPHP4wHvec/Nb3vqWffv2NZvNwcX5IIjM4obk7r6NtUonR44c/bd//5KTTgZYhuoNR4D1zLG6q8qzEQoyi7UlgigEseXi/Oxtv/wLH/rQT+3ds4cAbFlIWWgEEgZrhLnTt7Pt8p5v3f/5f/7XmWPHUCVEFUUkIRBhopNEKxFOk8SyxYF4liJaWFgwxpDSTmOiMnGnwydoQTmKDASLXGoyJ47PtBrqv/3sBxtp6hhDrTWJJu0uXez61ataIy27nNfGhy03twqrdI+Zj7TDI3Pxqxe+QPEDfF9l1+FQvnsU4lvC4OAY+ZeAxrbitFJu/8Gr4ETof3DwZ6Xc1qMarBY4dQutaWF+7uMf+41VK1fMz5+w1rIICwS8Y0u1gTUCAmVRNluj37rvP3c899zo6Ji1HFJcDwLu0k5cOHYoy9KJtDnKE0AgQk3a3a9WBNYePzF3+y0/+6Gf/sDBgwcIFQra0mqtCQnBCmCv4MVO/sj3fviZv7xr594DlGQ8kCIoS9NsNcfGRtmYvN8DgUrBNC+tkRPzi3lhKkG2atUY3OSrSvlQIaJYa01BwpZLBLNnz+6FhXmltLWilSpLKyxKpNdub1i3eqSZ8SCBDUkOwnFmFNY98KYewgLyiSVRZT9t9WYUJsghEMM7Hv+03T6QS/uqJZp6zhFCJsK8rCqFXCoHSqECJ05LJG5JRSVKdNntbd6w9rZf+u/Hj8woRaS1FRQiu6R4rRAJWUisJkIiK9gr5Qv/8uVCALUDultCVsIOaI0qcRrT0ZbqkmWzZVO4ZQxBsgaAERkTQGX6c0f2f+yOn//F//rBg3v2adVSasSKKsRYxWz7TWAwdn6hePbFA3/1t/+6/YV9mE2UoEXr0ppEwSlrV5S9+USjZclLQdFKAFF1LbTLEpTigWqTIoWohIkYwdUKAEga0yy3ALqVNsYff/K5vFcSqrxgI0Q6YyIjhpA3bTplIFCBPoMMv/zMwGe1Pn2OirIQBuOns0v9G6W8QYTLQCHGIyx+QwVg/wkAoO64/Vb/D6ENem9U1/JZytqQvLaSl10CEa10v9/btu2qXbv3PPbEk5OT06TIWOsood0xXRYiwTW7k127d28+fdNZZ23pdXqJ1pUsIxKSAiKH4A1NuVaLLpOMqbIuyyCMBHmeX/OmN01Nr/zWfd92n2bZGFNmWot1+tTQ7ebz84u7du6cGB/feOpGYw0SN0fGnnn2hRde2TU6OVUYQ6hBAKx10J1LLzxnerSJXIAAS6Xs6SgJAITQYdm5LFnpTOmGFfrsX/9dwZgkWWEYUbFwqrHI+1mqfvInf3xyrMWmCKdUUSURaal6nxFW+6EvqS//+1Gjj1OhAYRIyIiPoF7YVyBZY0ye594ew+TcB7/6trYTZ5RgXDdIpKy1Rae7+Inf/51zz96yMD/byDJbmiTJrOUBC2K4zS+KqNvtEtHnPvd3h4/MtUbGS8NWkIGAAKgSzIukYqI2q8/sli2Qi7AAMBHgkaNHP/SBd33qk7+loJN3T2SImqHIi8IYV4iTVu1+b/e+fX/z9//w4KPfS7JWWQKRnpiY7PX7Iuz6XtYYNxksi2JxfsFDicMimnz4EGDLRGhZ0qyx/elnd+/eOz42zsJaE5KIGBFmU5566oYN69eVJqdBJIpqrjCoRRwBS5QYwTArVB8PZ2ohZCXg+lhSex1Mq5Z1I8NqzlrrthxjKFn4uSFOIDJPn5r58LkEnWZLhGmqe73FViP58z//dJpQd3F+YnzMGqsocb7KpcXumrTWpbXNZost79q9///7zF+zaJ00kRJmqLbXxYQHrq5iHEIWo7aYUjqhzOSlVnz46OFr3/q6uz7zR9Nj2dGZ/RlpLo0Ty+n3C8sCqHqFPTa38Pdf+OK3H3y4OTrR75fr12/o93MuSzGmkiYZYFsXO+1KZLkSN/X6bFytalXEbUlpuJEl9z/wcFGYSiHPyVMoNCbP8+55556bJQoCl+MTlCjPHbr/5U+RS2HD5CTMopalkwNDDMGsEf61rusdLpFRoE+I7m+Hfy+MXCHuOkyrXQY3MER2DKyGc6Wgvbhw3lmbP/Nnn27Pz/bai41EW2PTNIsgz0VRJFrneV9EgPR37n/4n/71S0ljtDCIKmEAYy0pELHW2LCLFQFwQ8SMl2132LUyLxOVAJtEm6NH9p+xad3f/PVfXH7xhft3vtLKMmYLwlqRYRZA0mmvMMfnFr74z//2la/e22g2W63RRCf9Xs+UxuQ5COtEK6XK0nQ7XURAGqzUQgAiGLDtC1A/L5sjYy/tOvSt+76zYvUatzpgytItzZiiGB1pvu6KS5ENu7bQcjHeCHQbHiSfD0W9RO8qPIFY+O5C6HQEJ3IeyDmhkFo5TI/821cfveO2kC84jHk+GfITmdBuop3RoD1DiEwEbnmv2+mcf+55a9au/dKXv0yo0jSz7Fb7yC26u7lH1eVEdHHg+Rde3LJly6ZNm0rjjjsLc5pkjsTeW0xU6/pmWohkqv4btQA70i1AWxTFaHPknW+/ftfLrzz59NPTq1YQUr/fS1SiiIxxPBDGWj544ADq7PQzz777a1/PGs00y9iwtRaYk7TBYjetX3HBWZtJSmAQIABEAkK0zJVGIYgAAajWyNQf/OGfPvfCzhUrV5VlaYWryWuCea9z/jlnvvfHb7amj+L2YJeR63pnEPHPhQGoDkWto8wi5uQBCwDVJWPCTlLtFS8Zt7r11g+HZCLhL4d4pSgGR/09P+JwS5YC4mgbmJmAur3ulVdcMTE1+R9f+UqSpkqRVpqFvcjLsjCEBIRFWTy5/enzL7hg48ZNeb+XJalj9RaolAbCRxNdWNhSH+RDWpwAIzAgIChHnQSMN954w/G52QcffnhsdJR9GocIiLY0RZEz87PPvzC9YvW+gwfbnU6z0RQQBLHWAmlT5htWT190zhYNhpAcoww4YSaRgYQZFKWZml79/R8++ek/+YsVq9YbJhbjZm0CVisSW/6X97/33LM2d9vzWlGdEWHZ3GZ5TzUyoLCRU98v889tKF9CHTQc9pPCqZw3GHXbbbd4SE29Fova4SFGpO4tB/tH6NRSCFAMu6C20G5f/YY3jI6NfeXur4yOjod0RJE+AxJYZkFcaHeefe65K6+8cnpqsr240ExTtmysCW8j6sme1IC0cgpeUpkooZNUJjRlft07rpufX3zwgfunJqe0VsAiIGItEZCidrvT7faPzc318qLf62dZxuCJLbW1ZsOqqcsvPo/YOAlYGFRhSikWtra0ltNGKy/sR3/tY4ZV0hgzzEoBVTo1UPS755295ac/8F5go8ASoiNo8737yGIiSEKYhkZD1vpGTsTcGwXK+jQjzND93lz46tWdd94e9a1DBK6Po9UANSCkqYutVl6R3Yq1JiSxlsWSQlTU6/be8KY3Tq9c8bV7vq5UkjUaKuApCnn2WRiIEq1PnJh/bsezF194wcZTNizMzTk1BQiWFtzrijpVQ9j5ESr9ZFTCCoSEQWnK816S0uJC97rrru/n+UMPPthqtkiRMJuyJCK2pbVSGNvp9hqNBhAKodsIRiDSqiyK1VOjV11+UVqxS1ClrgVOpMnNkmBqcsVnP3vXN/7z/rXrN1pWIihSuuOfpokp8g/91AcuvmDL3InZTC/bxPDBIWzED5DpS1lzKHZb30GIYAvuV+qsgfVdsPCfIo4vb6nqllt+2cdLlz2FBPfR364H1HB4G/zhSiC3EuskYsvM3O923nD1trVr13772/9piqLZbDlyMGZEcpN5t4SrHZ+QJpo9fnzHjh2bz9i8cdPpA8AoenJxJEDEiksbFTgQdIVVQ1DkJkzVcMxxn1YHA5iNqqZ4Yk3xtuuuWVxcfPChB1ZMTxtbOHwiWyYkhdTv9wFh9ZrVeZFrpRFJAASBkFeMtq646MJUEQxUTNyDRwRjLaJqjEw89uSzv/9//nh8eo2gMixJmlhgIkLg7uL8JRee83M/8/724mKiRNj1HZaKo3A1JaQn840+Wr7MWq8q6sXU8n26ZRTjEVgxjHoRVqzyf3fcfqvfN60np369I0TnREwzUU7n5EXdd5VSSMQCidIIgsJFr7PtqisvOP/ce+65u9ftj4+Nl4aRtACVpswaKaIurVVImtDJrc3Nzj7zzI6R8YnTTztNpGArpKr2olvjRAIgQnFUGNWtMwg5FgC3zChOyM1xr1pH205EQARsNDFb8+Y3v/Ho0aPf/d6jk1NT1tp+XugkQbYErJRaXFwcabWmJqbysnAOSMRa21szOXnVJZeMZJkAo3YRUlVacYpU1jrRLm+782OlJKOT0wLomFLJDfa51FDc8kv/fcPaaZN3EYGQIMhd6ivGoYMZ6n3rcE3/nQhNFS2eRql6OKCN8pmQ6I48m64Lk463IFzyiDiLwlogzNFCfvwqnHneJMQBhZlWSh09cviaN73xn7/w+Ymx5p7duxpZpglZbCPLirIUEUXaLVQQKmZRKtm9Z++n/+TPPnvX5xbafd1s9vKSGRzJCTOIdeyKJYAlYsJBxuzOs600Tr308DIqLgCtFCH1er2in//2xz/2pjdeffzIUWabJqosC664jThLk0OHDgFClqZsrC1Kdh/vTNjpUzq6FBREUElqRem08bu/978Pzrw6PjnV6+cgmKSpm0WD2BNzx6+/7trLL7us0+mQKzsCiMVrNLoct59v94Wj+9eAMEe1WMh76ZjIXAMp7LGFbzkcuvsmgvrVO+8IN4XDmX44k4tA0zIMtBu20sPuVtQU15oW24unbTr1xhtufGbHc889/3yWpTpN8tIQKWQnkeVIbpztkzWc94sdO5594aWX1q3fcOrG0wDJWgPiyAiQfGhDcZjBgXCm40ChCJ4XkoIBorGWlDLGplnzdVdd9YV/+qK1jOhOGGut3Mi9KEsBWDG9YrHbTpMENQHKqvHxqy65aCTTzKXj2QAAsWApGZ9e+ck//PR99z+0as16ZoWoWByDG5CSot9Zv2bFnXfcClIiG0I4Wfc5QkCHe/IRNj7MMaICra5QM5TrrU6DF+kfRImNuuP2W31j0fcGovFK2DP0c5No7SYUaokk4gIUnHUUZyTS6bTXrllzwzvfmefF977/A2YZHRt1jSB0XDgsWidO8VonqTWWEv3q4cM/eOzxxU5nwymnTE5OOpMhQhBgYaSBMiOII7wRZmKnF4F17LBHXidJggDM0u92Vq9ZMzIyeu/Xvj42Ng6AmtAIk1JsBRCNMSOjo4RoylKUMmzWrZi++srLWg1lbQHEgACMLNAYXfG5f/inv/27z0+vWmtEiYAx7LoHiCwmL/udO277lbM3n1702kq5VXGKOj11bcawz+Ln82GfJcLhxyQ4tcgY4g9P1q/xdXo4Ia2s6rbbbnE/FHYYw9y+jskdKmThwSL+Dv29BdshICBgrSIgonank6b6bddff/rppz/y3UePHz8+2hpRSMJOi8q1fEgpVRqjk0QQDGNRmu3bt7/w/IsssHr16qnJaaf+LGJt9YeoillO7hmAgR1maPhKg7d+EUDptDuXbN36ve//YPeevaPjY2wrmIQj7S7KUifJ2Nh4e3GREZDorE2brr78EhQDxIU1SIm1MjGx4l+/fO+nPv3/rl57SmFBUWItKK0RJUsTEdOZP/pj777pfT/xnu7iQqoBWNBxhVWp+JKcwzIU6HLOgyivqFeg9Q2taO/Hxxk32ovQ03V617Ct4IKMuuOOW6N+TNgYqLMshN+MWg6+p+mBB9HhcEyIrnJy32DhTqe79eKL3/2j79q3Z9/2J59sNLLR1khR9EtTcqV3DaQcEzSSTpyu9cJCe/v27S++9FKRF9MrVo1NTGidEClbDZgqOMSSJmhtq3XpfxHJUTUCIIApizRrZI3G3fd8rdUaIQfVAAFHnSFoLY+2RoVFaSXCZ5++adslF9uyjwoYyYIam1jxxS9+6Q//9C8nplYqnQhUVK0ArAhNWXQX5666Yuuv3/6RXqdDaAgEhRmc50EKXkF9W3notk2dzLCOXaxHnwhDHTaB6hl65MmWIKy33XrL0Aga8uZHTjXKbMLOZkT04TmzlsdjAHS0rhaBEaAsimaj8aM337B+7ZodO3bs3r1rbHSU3BKrIhGLRADCVXWOgGiMNWxmDs08veO5Hc8+Nze/mKTZytWrE53luREA6zv0BMYYOEk2MBCeJkJAYRQGYaX1hlM23vv1byy221mz4ZgMnV0qpcsin5iYJARruSiKi84588qtF4opSmsZVWt8xb/8692f/IM/WbFmHZA2hpVy1MQmIdSEvc7CyumJT/7ub400MkImB/kQBqo20dwxi5rswf7ksnrlZENWbx/h/LyufhTmgvVd+npK5P/6EnP0rR/5cGhZfoQWmmHo+sKMOKzuItB1uAoYbSGxACBBVXRzNcUsczHl66684keuv67T7T79zPZOZ7HRbKpEC7BhFgQihaBAgEgRkQBYltLy0WNzTzz51Pd+8MM9e/aRSianVoyMjOnEBUFWym0cq7oHGtwRiohzA8CGiKzh6RUr9x049MPHn5qYGDPWklt3HiDsRltjaZJ2+z1kfutVrzvvrM2m7Btrx6amP/s3//inf/5XU1PrnHKj0hoQjDFZqlDYlF1k+6n/8/unbVzbXpxvpIpNqZGQnGcmJOWKx/qCXghVjii8w/2nehITTkIiNEg9dw5bTd4eotQ+TKHUbbfeEhpQPbnx4dabZBSP/dWETDNh+yveoxABl4ULo+OPduqMhjvtTmt8/J3vfPvWrRcfOHjg+Ree7/V7Y2OjiFiaUpFSQqRogLtxdJFUGmsFer3+rp27n3xq+47ndpiySLJ0fHycyO15kZOcWZb9gAwUbxABFQIBgzAK9PKiNTpRGP7Gfd/KGo2lgy7IDMZYpfTExES31yWQt//INZvWr7VlMTY5cdfff/6v7vr7sYlVqBoIoLSylhEVCCRa5d12WfQ/8bu/fdnWCxbmZ9OETFkmmqwtHRbObTUKCy/XDPTYpmhqVJeVrdOFRfop9YXooc3oOkleWBgtk0z56B23hfVX9Pt1w4pApVEm5HrZQ1KfMPxVBbb7EA1IIsAWBIE0sZSL8/PnnXvWzTfdeO7Z5xw9evTZHc+xlVZrJEubhqEsLSlCQBCrtWJrSQABjTXC0Gl39+7b//gTTz32+JMzrx4dn5gen1rRaIwwW8tWANiRmiKjQiAxXCKg4mofHZBAaUy0EdZZeu+99xS5TZOmiLAAgUJCa1kpNTY+lvfbzYzeecP1ExOTOs0+89l/+MfP//vY+CrLirSmRIoy1zoBViklebuzMHfsf/7G7ddfe/WJuVczRWytgwpxZTcoMuBJXT6RCB9yHS4RxZq6xGy96InSDD/CqpML+rlWuA3t0xIiUrff/pEQ+RBh7n1gClvPkdJbyLsWxcvoNjwbSwCYQSI9ICF3MN5ypNWcP3HCluaCCy684R3vPOP0M44eO7Jn9x5T2majlSWJlVIhCrNvgQKIteLGPETKCswvLDz33PM/fOzJA4deTXQyNTk5MjLquoJI6IhIrTASKnSCbdVVlsxASEmSJMk3vnXf7OxCmjXAjc5dmS2CCGOjo+32/NTU6Lvf/e4kzX7v9//oG9/4dqM5jqRJJ4aZ0SaJMqVNdZJ3O+2Fud/41Vvf8+53zM8dJmKx4AfPsDRwiUeboYP3b91PTyMLqIOXw/SjvklY572vY4XDiwm3qZaq9Y9+9LawR3SypkLYDQolWOuAijAHijxk1BIdHB1e7mPRlBaJdJJ0Ox0AuOSSi9/znnefftrGY0eP7tu758Tc8ZFWM0s1EooAKXT6Ea5HgMptJXNpbZKm7U53587djz/+xJ49+4j0qjXrxscnjGG39qdJEZKwQHX2rRuVAZJlaI2M3v/gQ3v3Hmw0m86ABKhSeTZmpDXS6bS3bt26bdu2T/7vP7r//ocaI6OlFVCKEQ1bTSiWsyzpduZfndn7m79++3t/4qYTs0e1GrSsh33VkQVRPyXKY4bqMtWTlXpcC+uk+kuJAk44JAnBP9VufMgTXS/HwoDlP85POYZCCKLpcdQFiD7Wrfss/RODUopcyEcBsd32IoK9dOuF737Xu6668koCPrBv78yhQwBAGiupIpBGlrJwaawIsLBONANaFkFqt7t79u5/avszL7+8k1QyPbWiNTKaJpoNu70+x62NFYMHimBpuNEc/frXv7Vnz4FWs+V0/GAwxLXWNhqNvMjPv/CiL//HPQ8/+v2x8SlGAiIWsSKkqqx74cTx+ROv/s/f+uh733tzZ3FWkbA1A23N4QVRiFAI44V/oxFdYfiOI8Lek5X0EUFHxN0ZWlWdWSFiCao2UyPGgvrwqz6xqzc0l4TylqO4I18a9QVCTBkzO7roakGYSBFpjdYWvW6b2Ww5Y/MN73jbj7z1raPjY0eOvHrg4IFut9NsNolcD45dZ5qtBSCtE0EUFiINQkVpDxw89MMfPrF71y5b2tUrVzeyFltwKlVICAJAwCxAilSSZSNf+o+vHpqZaTaajkjPKTUJAwFmaaqTdNeevfv3z7Rao8YKCxEpIHAYMWToLi7mefuPPvV7N91wzdzsjEKLwooUinKNpZM5oXCpPGS69ACgMIqFi2Oh2UUvsd4Ai6BqEZw8Yo72n+85qasgc+TwAY+K9TVXSGRUr+JCwY4Q+RoWC16QMWyTh50xj9UNzwEzk2uqkWcZR9TKmEJEEDWKFoSR0fFGozlz5PiDDz/yL//2708+tX1hfqHVGh0dHVWJBkeN5iZpDrFfGGCo+GPFEthmllxw/rk333TjZZduTZtauGRbAFgCYUEBpXWLIfngh3725Vd2T0+vcEoISEoEjAAhTk9PWYF+YZTWSqXCKCBaOXSJ0YrmjpxoZsknPvmxKy69YH7xSCMBsEKgEVRVFwbn0PdQIuRhBHPwT7Jeo4TQZp+4nCwZrQv8RH4hHH5FbGURiFTdeeftUfbu3UO45ODR/OHedajnVQ/GYYsiOgRRVrQcRItE5PapHF8Pi5OmR01aIbLYfq+3uLiYJurCiy64+aYbt1115fj4yOL8/KGDB4p+r9HItFZEilnYsqu63XGyxopYEe7n5eHDRx5/4qlXDx+dnFoxOTWFqCyXLh8HUEnaOn78xD9+/gvCqEh5Bw0IJAgCWmtwZNGgkBS6Jg4BSKmJjx4+uGnDuj/99B9ccN5ZiwuzBJZAlOMdYnLeZyghS+S5I6BVNB8NJ6YREqieKkXhrK6kGX5OeNTrvZ9l9uSqsDoRR3QpIWVHBMl2uxyhMYUzjTp2MUq948EIiAyUrACAQYQdypTASVtWmzrI1nQ7bWvMaRtPefMbr37bddeec/ZZ/X535yuvLCwsZmmaKK0TrZBsWSIyAohYB3UjUqhUp9vbuXPX448/labNTRs3jrQazFYARGB0dPKJJ5/553/6t7Gx8aV34PIjJADQSjGAVkkV1wAIIdGUoD10cM+2bZf/wSf+16mnrp07fnxibIStJVAkCoEGMPuTkvpE6Pfosdcdz1DsaT2bDul5h6ICow+PNDDqjERVBnLbbbdEAThkI6/zqoQHwsOGQsSZZ6PyyFfPrxgemijiLi3kCrscz82fNCXC4hqzvh3sCO+JMEtTU/Z7nUU25fjYyEUXXnjTjTdete0qQjp29NjRo8d7vbzZaAKKNXmlH4JALtVlQFKWod3On93x3MzMzLp1a1etmnaKb43m6Of/8Z+2P/3M6Pi4dVL2DoUoDv8IWZa5oYpjnBUArVW/2z50cPcHP/AT/+vjv9lIqd9dyFJd5EaBBiEEVWHuQRg43NANZVCjkXidT2NovyfaDqunU6FMVj1/jVa46gf+ZIma+uhHb4voicL1+nBZP8T6149CaGRhxjNUMLGuubck4SHsdqUdZYzW2qlgDfwTC4hzUAgAwiiiqRKZz/O+KYuzzzrz2mvf+sY3vKHZTI/MHDpwYG+WqjRNFJE1JSIxi1aalBZmQDcql4MH9r388stjE+Pr1q8T0N1+8Ud//KfdXj9rNDxbvgs7IoyK0kYmDmsNiIRaSXtxrrM4+xu/dtsv/o//VvTaZdFzDlOTroZ4Uu3PCwiz1NkwozZKVD0NLWzroj51zYaAVI7qC6LL9MWDl1vXV6jDPKqtjHDwESbUUQ80ipc+1/apVhj+IoasyC37Beo6ZxsiKKw0M0AYhBFEESIKIbitQa00gOOIRVIaHJAPgAhRpNtdLPLeiqnxt7zxqptvuH60Qc8/9/Sho8cYoNUaQaXEAjm+VQUgpSJlGYyY43NzL7z0cmlp62WXffv+B7/wxX+Zml5ZGuMk2UhEYQXBTluZSjVQCpgpjSD50cP7J8fSP/7U79349mvnZ48RggYaCLQJICOydYpYVGltRREhSniHrt7WuVBDzriI0iV6ZeE3IwqOCA4bCUOHskD+bS6hzBweqB5NTlar15FNJ9uwqU/gvBeN2P+WJYZOww8ofHphPhj+euirB5DVCjlfFHme541GdvW2be+44Z1Za+SF51+YmzuRqCTLMmNKAHArjkpnwkKEpSk7nc7zzz8/Nzf/wAMPHTw4k6YNIL9qDALIgqRUkjVAabaoCYzpzxzce+nWC/7s0586a8sZ7fkTBDhA8RIMllMHnsAN/+OzPnSS9RpFfp2BNaIki7i5oo+N8u6IAzNCPEa7sHEi9erMvjDnGiqT6QclUYMnzLOiNewIaeCTJFe6+4tzFLDhafN3MnSAHKWWJ+vkLlurBUibraQ5+vwLL332/951773fFKGJqSnLrBINCGXfgqgkcXBYKyDGGELXhyJGrjD5gIQKkEirbKRFKiGE3uL8qzMH3v++9370tg9nCRV5DwUQUdgmWrn2Y4iXqpdOryEqMPRnohfkH5fXwfFVc9QTjjQeQ8SfK5brjPd+yB8m4GFFRUR45PCBMMSGNhvJagyd8EUcnyE5bQRoDPej/a+49CKc+0SAt2hWHJFwhZYaVa3RXjaQHp+YQqUfeeT7f/Znf/HkU08njeb4+EQ/z9OkIYzWGiRgNljx84CI2+wSr1VNmABSs9VoNEcBYebgnolm8pGP/PJ7f/zHFuaPAztpSODSpklWcIG4rFyPDCgMEEP1U0LB5bphhY/IY3NDh1QfpkZLpSGQ0I/6Q98WyteHA9Nlp3SoAQ1l/YjMMLz0qEFZ34MMG1D+ikMiolDoOhmouA/dUAlVq0P0U0iI5C7DXyQRWWOBEFCNj012C/PvX/rKX3zms8eOz01NTYmQKa1SulKQESGiPM/TJGVh1SBjLQBqpcvSNBqNkeaIAO7bu+/qqy751dt/6YLzzjlxYlYRiGVFmKrUFFwai5qtcLRrUKcGj4ZCIY2B3wCse/0ovwwl4uubznV4VhTOwvQ8TEmjVxB6oKXc5vCr+0MzD/nPPLgsYkoLT38YiesA6tfogYbHKHQ5xhgH8g9hdfUbjsRs6pvbEY54EKSRRXTWGJ+Y3rlr769/7OOPPvzdyRUrR0fH2u1uojPjmTEArDAhogbUhIAuHo2MjPS73fbC4vvf9/5f/sWfG0ltt9t2yGsUdjvNYNFYBmJBOVlCU4c51GufqHwJE9uhNVGoQud6MeFR9/usQwWZhgbKKK+q/wcA4OFX90dsOuEbqruiaBfMDSscvUY4VK9vk0XYRUdg471aOCM7Gc46OhlhO2qoYN6ScQNozz7rOAwFRsemjJW/+Zu//4u//KwolSUNRC3sijtAcmorQETGWlIIKCOjI4vzc2tWr/ylX/iFd930jrnZWS67SilEcExkCERAIiQWGI3Dp4budiidSIhfqBvW0PF7aED18XvE7h2hmCMZVM8xHxlTuIsYucBlNf/hV/eHyVS9tRVG7pB2OiocIooPbzGeBTJMBbx7iwq68FaNMQKiaBn/fhRtIzce+tFo125Q6MugFYnM2GqNZ2njPx96+I5f+/V2uzM6OskWEDQSsFgRCwIklCQpg2Hkxfbcm9/0hl+78/bTTjnl2NEjjTR15Izu7h2NhCJFpKudMoJ6cllfO48YuusGNJSguY4kDts/Pt2MSp/6cY2wPpEBRcE3lF6ovmYO7fUERI56M6QojzZQHSmiC9GAy3TRwkleaCih+unJTlIdqx99VPiwQunXof5y6OquMVYrBSQgViFaKzpJy4KzJE3HJx/bsePWW27ftWvv+nWnGMtOCUVQUERxIgCd3mI2kv78//i5n/7g+23ZtXlPrCFKGBQAu4UcEeeDCdHRAw/hewjJ3SJG5ZOFsCjXjKJ/dE78IwofhW/vRYw8IU/Z0O5lfQw1hIkhNKBQiaNiAfcfCl4gmyrRQhvPaJaFTN9fF3aBwGkcMAu8pnSI20O2ngdUoPotEE/HUT+R0ckO2wqD1I0rBLQDPqM7XpoQ+pbHplbs2bP/53/+F3fv2b96zbq8XyZpVhqjiMD050/MnnnWmb/9O7/1uisvn507imKRjVOuYqaljcVqnRb90nQY06NBRJT61NFh/ndDKHRU8w4ob5cwHr5RElKuRrIpdTHDug5QyBgcqUpEPonqQr0VAwi5NRN09JYswgAsYsUGFAY0tOHNzMaaaknFC3ANCDKcQuVQCIBTDHTqfo4pZoAQRq+tHN1zfXs/yq8HbwLF4daBBJUAASkWNswKYeH4kU0b1nzur//yvLM3z80ea7YaeZ4DaGt5YeH4j/34zXd97jNXXL71+NEZcpm102IWtwIL/joc1y9WJFPLqBqHKhAOpXiKxHUiYHxdYieCWNWbSfUCsM7QFZlRZGHhNcfymodf3R+dgyV2JgCkJaLWKEchwLoRLMm0ggylnyEitgzLN1R8mqmUsmxx0P8Ik+XKx7CEE9wITRfhDXwVGpbKQ8SOEPp5kaTp2Njknv0zv/hLv3Lg0OGxsYm5uYWJibFfveNXbr7phm630+t1RpsNY0us+D0cIx/Wg050MeHTqyNehq6T1vtw4RSojt2JmmERq2EELK63m6OLjyJvuBlSB/BQ1F+qn4aoIF/6k8Na7Evvm7BOxjt4FjA0Max+vTamCIsp/3frt10nA6g7yGEXDsw8MtJga3q99inr13ziE7+TJbB3z0vnnb/lrrv+78033zA/P2tNnmpVmrLiw3dIpZM0weuowshz+Kb8UJW46I6iix86WYpAOBFg/mQSCENDZ1QODxXNWNa6dH0gj+wJS0rLzMIRHceAy5e1i3HLk9zq+sTtFw+RVmRmtozLFwOWPXfCoixdTua7MtXPuJQq4A2N6JXC1kjUgYyy8mUeiITFaJUaa5VOm63Rb37zvj179//UT30oy5LO4rw1ZZqmAGJNWenlVQkygsTuJFouiGrpyMGE6+j1nRvvbF5DcM47fucbQnE339oNJ9ZhZIySrXoKXzeyeiNwWR+otkLKDKCWw5oGNuTsAL00nefTr6okGH5o0PV6lwvRL2sw+upluXkNCF9kaJocFaUh5jwCZQ5Z8kdmMaSIQJfGaJ01W800bc4vzJuydFS91lqF5LhjCJAUICEwWCMOXjJ0DOcr3rA7H93vUNzW0L5LvSE51F7roNV6oXeycniIgETtz7n78lAfHU4GvNUvhcPlbIzBKyd04IoBuDpUiKpnJGFE90uiYV8hCNJDdt7CiOfL4IjIsb5JGV2597rLB40IBIQkFiwYRWhN3l4oARcJCcUCIQGSVixOdRmdUCwJVavZtaQqkhmMOvh17ePX0A8M2TBDj+uPRESsGzHX1N1V1EuMKC7raVm9MRt1ibX3aU7YaxmsSdCJOEXBtcJEE1rBaH7pOc4EYy5p/4ccFqyeuAzcjJx8Ok2kwB/rMIrVxR/90/dH3xl6yBAKld4iVWT4IEQoDEjuxpgQAAeiBcYyCDk6DyBwShnEwnKy8xr2Y0IYQn1TIiqU/HNz53kodJOXe/Gh0NjXGFbUQ+rQH4u+E/rLSkA+HBp4e693TqNguTy1XcqQKgkZdAzacTE5+GF2fLvhwwrx1EP9VpV9C/j8ICyGo/VedyX15lBElL7EegcKEUFYGBQpQEEQR7LHbMX9cXLENEBBekBIjDx0qzzKKuoAlTBGD5FECubn0ewiGvnVM5iTmcJQhd56A3NomKvXCu5ndERyHq+xKaLhOZD4xnSYl1U3TCRLdKUxsRwMCJR8y2BZeF7OdLY06HB5ouU6jU1dbq3ekXMiwBHBY/DrLuVEZltVAcIu4xIEYEuAbm/aY6L9mvbJEpG66GR92BdNrMK+kQcpRDmQf0cRbcFrDMheA5hW72TWp28nc13uQ/5/iT2n0Qx70V0AAAAASUVORK5CYII=";
var WEB={store:{n:"SISO",e:"",bg:"#f2f2ee url("+LOGO+") center/cover no-repeat"}};
function loadLayout(){try{layout=JSON.parse(A.getLayout())}catch(e){layout=[]}if(!Array.isArray(layout))layout=[]}
/* ô trống {t:"blank"} giữ chỗ để đặt icon tự do và có nhiều trang trống; cuối bố cục tự cắt bỏ khi lưu */
function trimBlank(a){var b=a.slice();while(b.length&&b[b.length-1].t==="blank")b.pop();return b}
function saveLayout(){try{A.saveLayout(JSON.stringify(trimBlank(layout)))}catch(e){}}
function eachEntry(fn){layout.forEach(function(x){if(x.t==="folder")x.items.forEach(fn);else fn(x)})}
function entryKey(x){return x.t+":"+(x.id||x.k)}
function appInfo(id){for(var i=0;i<home.length;i++)if(home[i].id===id)return home[i];return null}
function pkgOf(id){return String(id).split("/")[0]}
/* thư mục chỉ còn 1 mục -> trả mục đó ra màn hình chính; 0 mục -> xóa */
function normalize(){
  var out=[];
  layout.forEach(function(x){
    if(x.t!=="folder"){out.push(x);return}
    if(x.items.length>1)out.push(x); else if(x.items.length===1)out.push(x.items[0]);
  });
  layout=out;
}
/* đồng bộ với danh sách app đã thêm (gỡ cài đặt -> biến mất; thêm mới -> cuối cùng) */
function reconcile(){
  var ids={};home.forEach(function(p){ids[p.id]=1});
  function keep(x){return x.t!=="app"||ids[x.id]}
  layout=layout.filter(keep);
  layout.forEach(function(x){if(x.t==="folder")x.items=x.items.filter(keep)});
  normalize();
  var have={};eachEntry(function(x){have[entryKey(x)]=1});
  /* SISO luôn được cài sẵn, đứng đầu tiên */
  var base=[{t:"web",k:"store"}].concat(TOOLS.map(function(k){return{t:"tool",k:k}}));
  layout=base.filter(function(x){return !have[entryKey(x)]}).concat(layout);
  layout=trimBlank(layout);
  home.forEach(function(p){if(!have["app:"+p.id])layout.push({t:"app",id:p.id})});
  saveLayout();
}
function nOf(x){
  if(x.t==="app")return badges[pkgOf(x.id)]||0;
  if(x.t==="folder")return x.items.reduce(function(s,c){return s+nOf(c)},0);
  return 0;
}
function setN(el,x){var n=x?nOf(x):0;if(n>0)el.setAttribute("data-n",n>99?"99+":n);else el.removeAttribute("data-n")}
function miniOf(c){
  if(c.t==="app"){var p=appInfo(c.id);return p?"<img alt=\"\" src=\"data:image/png;base64,"+p.icon+"\">":"<b></b>"}
  if(c.t==="web")return "<b style=\"background:"+WEB[c.k].bg+"\">"+WEB[c.k].e+"</b>";
  var g=(typeof ICO!=="undefined"&&ICO[c.k])||["#38a3ff","#6d5cff"];
  return "<b style=\"background:linear-gradient(135deg,"+g[0]+","+g[1]+")\"></b>";
}
function icHTML(x,idx,fo){
  if(x.t==="blank")return "<button class=\"ic blank\" data-i=\""+idx+"\" tabindex=\"-1\"><span class=\"tile\"></span><span class=\"lb\">&nbsp;</span></button>";
  var n=nOf(x),at=(fo?"data-fi=\"":"data-i=\"")+idx+"\""+(n>0?" data-n=\""+(n>99?"99+":n)+"\"":""),tl,lb;
  if(x.t==="tool"){tl=tile(x.k);lb=APPS[x.k].n.replace("SISO ","")}
  else if(x.t==="web"){var w=WEB[x.k];tl="<span class=\"tile\" style=\"background:"+w.bg+";font-size:calc(var(--isz,48)*.5px)\">"+w.e+"</span>";lb=w.n}
  else if(x.t==="folder"){tl="<span class=\"tile fld\">"+x.items.slice(0,4).map(miniOf).join("")+"</span>";lb=x.name}
  else{var p=appInfo(x.id);if(!p)return "";tl="<span class=\"tile\" style=\"background:none;box-shadow:none\"><img alt=\"\" src=\"data:image/png;base64,"+p.icon+"\" style=\"width:100%;height:100%;border-radius:22%\"></span>";lb=p.label}
  return "<button class=\"ic\" "+at+">"+tl+"<span class=\"lb\">"+esc(lb)+"</span></button>";
}
function homeItems(){return layout.map(function(x,i){return icHTML(x,i,false)})}
window.__badges=function(o){
  badges=o||{};
  document.querySelectorAll("#icons .ic[data-i]").forEach(function(el){setN(el,layout[+el.dataset.i])});
  if(foOpen)document.querySelectorAll("#fo .ic[data-fi]").forEach(function(el){setN(el,foOpen.items[+el.dataset.fi])});
};

/* ---- thư mục (cửa sổ nổi) ---- */
var foEl=null, foOpen=null;
function closeFolder(){if(foEl){foEl.remove();foEl=null}foOpen=null}
window.__closeFo=function(){closeFolder();if(window.closeFeed)closeFeed()};
function drawFolder(){
  if(!foEl||!foOpen)return;
  foEl.innerHTML="<div class=\"fob\"><div class=\"fot\">"+esc(foOpen.name)+"</div><div class=\"fog\">"+
    foOpen.items.map(function(x,i){return icHTML(x,i,true)}).join("")+"</div></div>";
}
function openFolder(f){
  closeFolder();foOpen=f;
  foEl=document.createElement("div");foEl.id="fo";
  drawFolder();
  document.getElementById("os").appendChild(foEl);
}
window.__folderName=function(id,name){
  layout.forEach(function(x){if(x.t==="folder"&&x.id===id)x.name=name});
  saveLayout();buildPages();drawFolder();
};
window.__folderAct=function(id,act){
  if(act!=="dissolve")return;
  var out=[];
  layout.forEach(function(x){if(x.t==="folder"&&x.id===id)x.items.forEach(function(c){out.push(c)});else out.push(x)});
  layout=out;closeFolder();saveLayout();buildPages();
};
function activate(x,fo){
  if(x.t==="folder"){openFolder(x);return}
  if(fo)closeFolder();
  if(x.t==="app")A.launch(x.id); else if(x.t==="tool")open(x.k); else if(x.t==="web")A.openWeb(x.k);
}
function icMenu(x){
  if(x.t==="app")A.askHomeRemove(x.id);
  else if(x.t==="folder")A.folderMenu(x.id,x.name);
}

/* ---- kéo thả: sắp xếp, gộp vào thư mục, kéo ra mép để chuyển trang ---- */
function removeEntry(e){
  var i=layout.indexOf(e);if(i>=0){layout.splice(i,1);return}
  layout.forEach(function(f){if(f.t==="folder"){var j=f.items.indexOf(e);if(j>=0)f.items.splice(j,1)}});
  normalize();
}
function moveTo(ent,tg,after){
  if(tg.t==="blank"){   /* thả vào ô trống: đổi chỗ, giữ nguyên vị trí các icon khác */
    var ie=layout.indexOf(ent),it=layout.indexOf(tg);
    if(it<0)return;
    if(ie>=0){layout[ie]={t:"blank"};layout[it]=ent;return}
    removeEntry(ent);it=layout.indexOf(tg);if(it>=0)layout[it]=ent;else layout.push(ent);
    return;
  }
  var pre=layout.indexOf(tg);
  removeEntry(ent);
  var i=layout.indexOf(tg);if(i<0)i=pre<0?layout.length:Math.min(pre,layout.length);
  layout.splice(after?i+1:i,0,ent);
}
function mergeInto(ent,tg){
  var pre=layout.indexOf(tg);
  removeEntry(ent);
  var i=layout.indexOf(tg);
  if(i<0){layout.splice(Math.min(Math.max(pre,0),layout.length),0,ent);return}
  if(tg.t==="folder")tg.items.push(ent);
  else{lastNew={t:"folder",id:"f"+Date.now().toString(36),name:"Thư mục",items:[tg,ent]};layout[i]=lastNew}
}
function clearMg(){document.querySelectorAll(".ic.mg").forEach(function(n){n.classList.remove("mg")})}
function pickTarget(x,y,inFo,self){
  var sel=inFo?"#fo .ic[data-fi]":"#icons .ic[data-i]",best=null,bd=1e12;
  document.querySelectorAll(sel).forEach(function(el){
    if(el===self)return;
    var r=el.getBoundingClientRect();if(r.right<0||r.left>innerWidth)return;
    var dx=x-(r.left+r.width/2),dy=y-(r.top+r.height/2),dd=dx*dx+dy*dy;
    if(dd<bd){bd=dd;best={el:el,r:r}}
  });
  if(best)best.ent=inFo?(foOpen&&foOpen.items[+best.el.dataset.fi]):layout[+best.el.dataset.i];
  return best&&best.ent?best:null;
}
function startDrag(ent,el,x,y){
  var r=el.getBoundingClientRect(),cl=el.cloneNode(true);
  cl.style.cssText="position:fixed;left:"+r.left+"px;top:"+r.top+"px;width:"+r.width+"px;margin:0;pointer-events:none;z-index:99999;transform:scale(1.12);opacity:.92;filter:drop-shadow(0 8px 14px #0008)";
  document.body.appendChild(cl);
  el.style.opacity=".25";
  drag={e:ent,el:el,cl:cl,dx:x-r.left,dy:y-r.top,x0:x,y0:y,lx:x,ly:y,moved:false,hov:null,ready:null,ht:0,et:0,side:0,inFo:!!el.closest("#fo")};
  try{A.haptic()}catch(e){}
}
function moveDrag(x,y){
  var d=drag;d.lx=x;d.ly=y;
  d.cl.style.left=(x-d.dx)+"px";d.cl.style.top=(y-d.dy)+"px";
  if(Math.abs(x-d.x0)>10||Math.abs(y-d.y0)>10)d.moved=true;
  if(!d.moved)return;
  var inFo=false;
  if(foEl){
    var fb=foEl.querySelector(".fob").getBoundingClientRect();
    inFo=x>=fb.left&&x<=fb.right&&y>=fb.top&&y<=fb.bottom;
    foEl.style.opacity=inFo?"1":"0";   /* kéo ra ngoài thư mục -> ẩn cửa sổ để thấy màn hình chính */
  }
  d.inFo=inFo;
  /* giữ ngón tay trên một biểu tượng ~0,4 giây -> gộp / thêm vào thư mục */
  var tg=pickTarget(x,y,inFo,d.el),cand=null;
  if(tg&&!inFo&&d.e.t!=="folder"&&tg.ent.t!=="blank"){
    var r=tg.r,cx=r.left+r.width/2,cy=r.top+r.height*0.4;
    if(Math.abs(x-cx)<r.width*0.3&&Math.abs(y-cy)<r.height*0.3)cand=tg;
  }
  if(!(cand&&cand.el===d.hov)){
    clearTimeout(d.ht);clearMg();d.ready=null;d.hov=cand?cand.el:null;
    if(cand)d.ht=setTimeout(function(){if(!drag)return;d.ready=cand.ent;cand.el.classList.add("mg");try{A.haptic()}catch(e){}},380);
  }
  /* kề mép trái/phải ~0,45 giây -> sang trang */
  var side=inFo?0:(x<34?-1:(x>innerWidth-34?1:0));
  if(side!==d.side){
    clearTimeout(d.et);d.side=side;
    if(side){
      var tick=function(){
        if(!drag)return;
        var n=pgCur+side;
        if(n>=0&&n<pgN)goPage(n);
        else if(side>0&&n===pgN&&pgN<20){   /* giữ ở mép phải trang cuối: tạo trang trống mới */
          pgMin=pgN+1;buildPages();
          var ne=document.querySelector("#icons .ic[data-i=\""+layout.indexOf(d.e)+"\"]");
          if(ne){ne.style.opacity=".25";d.el=ne}
          goPage(n);
        }
        d.et=setTimeout(tick,750);
      };
      d.et=setTimeout(tick,450);
    }
  }
}
function endDrag(){
  var d=drag;drag=null;
  clearTimeout(d.ht);clearTimeout(d.et);
  d.cl.remove();d.el.style.opacity="";clearMg();
  if(foEl)foEl.style.opacity="";
  if(!d.moved){icMenu(d.e);return}   /* giữ rồi thả không di chuyển = mở menu */
  var ent=d.e,tg=pickTarget(d.lx,d.ly,d.inFo,d.el),keepFo=false;
  lastNew=null;
  if(d.inFo&&foOpen){
    keepFo=true;
    if(tg&&tg.ent!==ent&&foOpen.items.indexOf(ent)>=0){
      var f=foOpen;f.items.splice(f.items.indexOf(ent),1);
      var i=f.items.indexOf(tg.ent);
      f.items.splice(d.lx>tg.r.left+tg.r.width/2?i+1:i,0,ent);
    }
  }else if(tg){
    if(d.ready&&d.ready===tg.ent&&ent.t!=="folder"&&tg.ent!==ent)mergeInto(ent,tg.ent);
    else moveTo(ent,tg.ent,d.lx>tg.r.left+tg.r.width/2||d.ly>tg.r.bottom);
  }
  normalize();pgMin=0;saveLayout();
  if(!keepFo)closeFolder();
  buildPages();
  if(keepFo)drawFolder();
  if(lastNew)openFolder(lastNew);
}

/* nhiều trang: tự chia theo sức chứa của một trang, vuốt ngang để chuyển (scroll-snap) */
var pgCur=0, pgCap=0, pgN=1, pgMin=0;
function pageGeom(){
  var L=st.lay, v=os.classList.contains("tb-left")||os.classList.contains("tb-right"), p=L.pad?12:0;
  return fit(os.clientWidth-(v?56:0)-2*p, os.clientHeight-(v?0:48)-2*p-24, SZ[L.s], FSZ[L.f], L.nm, 0, L);
}
function pgDots(){
  var c=document.getElementById("icons"), d=document.getElementById("pgd");
  if(!d){d=document.createElement("div");d.id="pgd";c.parentNode.insertBefore(d,c.nextSibling)}
  var h="";
  if(pgN>1)for(var i=0;i<pgN;i++)h+="<i"+(i===pgCur?" class=\"on\"":"")+"></i>";
  d.innerHTML=h;
}
function buildPages(){
  var c=document.getElementById("icons"); if(!c)return;
  var g=pageGeom(); pgCap=Math.max(1,g[0]*g[1]);
  root.style.setProperty("--lc",g[0]); root.style.setProperty("--lr",g[1]);
  layout=trimBlank(layout);
  pgN=Math.max(1,Math.ceil(layout.length/pgCap),pgMin);
  while(layout.length<pgN*pgCap)layout.push({t:"blank"});
  var items=homeItems();
  var html="";
  for(var i=0;i<pgN;i++)html+="<div class=\"pg\">"+items.slice(i*pgCap,(i+1)*pgCap).join("")+"</div>";
  c.innerHTML=html;
  pgCur=Math.min(pgCur,pgN-1);
  c.scrollLeft=pgCur*c.clientWidth;
  pgDots();
}
function goPage(i){
  var c=document.getElementById("icons"); if(!c)return;
  c.scrollTo({left:i*c.clientWidth,behavior:"smooth"});
}
/* cầu nối cho màn Cài đặt native: đọc / ghi bố cục màn hình chính */
window.__layGet=function(){var g=pageGeom();return JSON.stringify(Object.assign({},st.lay,{ec:g[0],er:g[1]}))};
window.__laySet=function(j){try{var o=JSON.parse(j);delete o.ec;delete o.er;Object.assign(st.lay,o)}catch(e){return}
  try{applyLay()}catch(e){} buildPages(); try{save()}catch(e){}};
var origApply=window.applyLay;
window.applyLay=function(){
  origApply.apply(this,arguments);
  var g=pageGeom(); root.style.setProperty("--lc",g[0]); root.style.setProperty("--lr",g[1]);
  if(g[0]*g[1]!==pgCap)buildPages();
};
window.drawIcons=function(){origApply.call(window);buildPages()};
window.__homeApps=function(){loadHome();reconcile();drawIcons()};
addEventListener("resize",function(){window.applyLay()});
document.getElementById("icons").addEventListener("scroll",function(){
  var c=this,n=Math.round(c.scrollLeft/(c.clientWidth||1));
  if(n!==pgCur){pgCur=n;pgDots()}
},{passive:true});

/* ====== hiệu ứng lướt trang (tùy chỉnh được) ====== */
var PGFX=[["slide","Trượt"],["cube","Khối lập phương"],["stack","Xếp chồng"],["flip","Lật"],["zoom","Thu phóng"],["fade","Mờ dần"],["carousel","Xoay vòng"]];
var PGK=[["Nhẹ",0.6],["Vừa",1],["Mạnh",1.4]];
var pgfx={k:"slide",i:1};
try{var _pf=JSON.parse(A.getData("pgfx"));if(_pf&&_pf[0])pgfx={k:_pf[0].k||"slide",i:_pf[0].i==null?1:_pf[0].i}}catch(e){}
function pgSave(){try{A.setData("pgfx",JSON.stringify([pgfx]))}catch(e){}}
function pgApply(){
  var c=document.getElementById("icons"); if(!c)return;
  var W=c.clientWidth||1, ks=(PGK[pgfx.i]||PGK[1])[1], k=pgfx.k, pgs=c.children;
  for(var n=0;n<pgs.length;n++){
    var el=pgs[n]; if(!el.classList||!el.classList.contains("pg"))continue;
    var t=(el.offsetLeft-c.scrollLeft)/W, a=Math.min(1,Math.abs(t));
    var tr="",op="",org="",vis="",pe="",z="";
    if(k==="fade"){op=1-Math.min(1,a*ks*0.9)}
    else if(k==="zoom"){tr="scale("+(1-0.28*ks*a)+")";op=1-Math.min(1,a*ks*0.7)}
    else if(k==="cube"){tr="perspective(1000px) rotateY("+(t*Math.min(90,70*ks))+"deg)";org=t>0?"left center":"right center"}
    else if(k==="carousel"){tr="perspective(1000px) translateZ("+(-220*ks*a)+"px) rotateY("+(t*35*ks)+"deg)";op=1-0.5*a}
    else if(k==="stack"){
      if(t<0){tr="translateX("+(-t*100)+"%) scale("+(1-0.12*a*ks)+")";op=1-Math.min(1,a*0.7*ks);z="1";if(t<=-1){vis="hidden";pe="none"}}
      else z="2";
    }else if(k==="flip"){
      tr="translateX("+(-t*100)+"%) perspective(1200px) rotateY("+(-t*180)+"deg)";
      if(a>=1){vis="hidden";pe="none"}else if(a>0.5)pe="none";
    }
    var s2=el.style;
    s2.transform=tr;s2.transformOrigin=org;s2.opacity=op===""?"":String(op);
    s2.visibility=vis;s2.pointerEvents=pe;s2.zIndex=z;s2.backfaceVisibility=k==="flip"?"hidden":"";
  }
}
var pgRaf=0;
document.getElementById("icons").addEventListener("scroll",function(){
  if(pgRaf)return; pgRaf=requestAnimationFrame(function(){pgRaf=0;pgApply()});
},{passive:true});
addEventListener("resize",function(){pgApply()});
var _bp=buildPages;
buildPages=function(){_bp.apply(this,arguments);pgApply()};
/* cầu nối cho màn Cài đặt native: hiệu ứng và màu nền */
window.__fxGet=function(){var f={};try{f=JSON.parse(window.__feedFx(null))}catch(e){}return JSON.stringify({f:f,p:pgfx})};
window.__fxSet=function(j){try{var o=JSON.parse(j);
  if(o.f&&window.__feedFx)window.__feedFx(o.f);
  if(o.p){Object.assign(pgfx,o.p);pgSave();pgApply()}}catch(e){}};
window.__bgSet=function(c,a){
  if(!c){root.style.removeProperty("--feedbg");root.style.removeProperty("--glass");return}
  root.style.setProperty("--feedbg","rgba("+c+","+Math.min(1,(a+30)/100)+")");
  root.style.setProperty("--glass","rgba("+c+","+(a/100)+")");
};
function pgPreview(){
  if(pgN<2){toast("Cần ít nhất 2 trang để thấy hiệu ứng lướt.");return}
  var from=pgCur,to=from+1<pgN?from+1:from-1;
  goPage(to);setTimeout(function(){goPage(from)},950);
}
function pgBlock(b){
  var d=document.createElement("div"); d.className="set";
  d.innerHTML='<p>Hiệu ứng lướt trang</p><div>'+PGFX.map(function(x){
    return '<button class="btn '+(pgfx.k===x[0]?'sel':'')+'" data-pk="'+x[0]+'">'+x[1]+'</button>';
  }).join("")+'</div><p>Cường độ</p><div>'+PGK.map(function(x,i){
    return '<button class="btn '+(pgfx.i===i?'sel':'')+'" data-pi="'+i+'">'+x[0]+'</button>';
  }).join("")+'<button class="btn" data-pp="1">Xem thử</button></div>';
  d.onclick=function(e){
    var t=e.target.closest("button"); if(!t)return; e.stopPropagation();
    if(t.dataset.pk){pgfx.k=t.dataset.pk;pgSave();pgApply();UI.set(b);pgPreview();return}
    if(t.dataset.pi!==undefined){pgfx.i=+t.dataset.pi;pgSave();pgApply();UI.set(b);pgPreview();return}
    if(t.dataset.pp)pgPreview();
  };
  return d;
}

/* chạm, giữ (kéo thả / menu), vuốt trên màn hình chính và trong thư mục */
(function(){
  var c=document.getElementById("icons"),t=null,hl=false,sw=false,x0=0,y0=0,t0=0,pid=null,fromFo=false;
  c.onclick=null; c.ondblclick=null;
  document.addEventListener("pointerdown",function(e){
    if(drag)return;
    var inFo=!!e.target.closest("#fo"),inC=!inFo&&!!e.target.closest("#icons");
    pid=null;clearTimeout(t);t=null;
    if(!inFo&&!inC)return;
    hl=false;sw=false;x0=e.clientX;y0=e.clientY;t0=Date.now();pid=e.pointerId;fromFo=inFo;
    var b=e.target.closest(".ic");if(!b)return;
    var ent=inFo?(foOpen&&foOpen.items[+b.dataset.fi]):layout[+b.dataset.i];if(!ent)return;
    t=setTimeout(function(){t=null;hl=true;startDrag(ent,b,x0,y0)},420);
  },true);
  addEventListener("pointermove",function(e){
    if(drag){moveDrag(e.clientX,e.clientY);return}
    if(t&&(Math.abs(e.clientX-x0)>12||Math.abs(e.clientY-y0)>12)){clearTimeout(t);t=null}
  },true);
  addEventListener("pointerup",function(e){
    clearTimeout(t);t=null;
    if(drag){endDrag();pid=null;return}
    if(e.pointerId!==pid)return; pid=null;
    if(fromFo)return;
    var dx=e.clientX-x0,dy=e.clientY-y0;
    /* vuốt dọc: lên = ngăn ứng dụng, xuống = thông báo */
    if(Math.abs(dy)>=64&&Math.abs(dy)>Math.abs(dx)*1.5&&Date.now()-t0<800){
      sw=true; if(dy<0)A.openDrawer(); else A.openShade();
    }
  },true);
  addEventListener("pointercancel",function(){clearTimeout(t);t=null;pid=null;if(drag)endDrag()},true);
  /* đang kéo thì không cho trang cuộn */
  document.addEventListener("touchmove",function(e){if(drag&&e.cancelable)e.preventDefault()},{passive:false});
  document.addEventListener("contextmenu",function(e){if(e.target.closest("#icons,#fo"))e.preventDefault()});
  document.addEventListener("click",function(e){
    if(e.target.closest("#fo")){
      if(hl){hl=false;return}
      var b=e.target.closest(".ic[data-fi]");
      if(b){var x=foOpen&&foOpen.items[+b.dataset.fi];if(x)activate(x,true);return}
      if(e.target.closest(".fot")){if(foOpen)A.renameFolder(foOpen.id,foOpen.name);return}
      if(!e.target.closest(".fob"))closeFolder();
      return;
    }
    if(!e.target.closest("#icons"))return;
    if(sw){sw=false;return}
    var b2=e.target.closest(".ic[data-i]");if(!b2)return;
    if(hl){hl=false;return}
    var x2=layout[+b2.dataset.i];if(x2)activate(x2,false);
  },true);
})();

/* thanh tác vụ + Start: bỏ mục giả, thêm lối vào thật */
function cleanBar(){
  var tb=document.getElementById("tb");
  if(tb){
    HIDE.forEach(function(k){tb.querySelectorAll("[data-o="+k+"]").forEach(function(n){n.remove()})});
    var dd=tb.querySelector("[data-tr=dev] .dd"); if(dd)dd.remove();
  }
  var st=document.getElementById("start"); if(!st)return;
  HIDE.forEach(function(k){st.querySelectorAll(".app[data-o="+k+"]").forEach(function(n){n.remove()})});
  var rec=st.querySelector(".rec");
  if(rec){var ph=rec.previousElementSibling;if(ph&&ph.tagName=="H3")ph.remove();rec.remove()}
  var h3=st.querySelector("h3"); if(h3)h3.textContent="Công cụ SISO";
  var ss=st.querySelector("#ss");
  if(ss){var sb=document.createElement("button");sb.className="btn";sb.style.cssText="width:100%;margin-bottom:10px;text-align:left";sb.textContent="Tìm ứng dụng…";sb.onclick=function(){st.classList.remove("open");A.openDrawer()};ss.replaceWith(sb)}
  ["pk","lkb","rs","sd"].forEach(function(id){var n=st.querySelector("#"+id);if(n)n.remove()});
  var foot=st.querySelector(".sfoot > span:last-child");
  if(foot&&!foot.querySelector("#andAll")){
    var a=document.createElement("button");a.className="btn";a.id="andAll";a.textContent="Tất cả ứng dụng";
    a.onclick=function(){st.classList.remove("open");A.openDrawer()};
    var b=document.createElement("button");b.className="btn";b.id="andSet";b.textContent="Cài đặt";
    b.onclick=function(){st.classList.remove("open");A.openSettings()};
    foot.append(a," ",b);
  }
}
var orig2=window.renderBar;
window.renderBar=function(){orig2.apply(this,arguments);cleanBar()};

/* tìm kiếm, thiết bị kết nối, Bluetooth -> mở thật */
(function(){
  var tb=document.getElementById("tb");
  tb.addEventListener("click",function(e){
    if(e.target.closest("#sq")){e.stopPropagation();A.openDrawer();return}
    if(e.target.closest("[data-tr=dev]")){e.stopPropagation();A.openBluetoothSettings()}
  },true);
  document.getElementById("qp").addEventListener("click",function(e){
    if(e.target.closest("[data-q=bt]")){e.stopPropagation();A.openBluetoothSettings()}
  },true);
  /* menu chuột phải: bỏ mục giả */
  document.getElementById("os").addEventListener("contextmenu",function(){
    setTimeout(function(){document.querySelectorAll("#ctx [data-x=trash],#ctx [data-x=disp]").forEach(function(n){n.remove()})},0);
  });
})();

/* bảng nhanh: bỏ thanh độ sáng giả, đổi chữ Bluetooth; bảng âm thanh: chỉ giữ âm lượng thật */
var oq2=window.qp;
window.qp=function(){
  oq2.apply(this,arguments);
  var br=document.querySelector("#qp #brt"); if(br&&br.parentElement)br.parentElement.remove();
  var bt=document.querySelector("#qp [data-q=bt] small"); if(bt)bt.textContent="Mở cài đặt";
};
var ov=window.qpVol;
window.qpVol=function(){
  ov.apply(this,arguments);
  var q=document.getElementById("qp"); while(q.children.length>2)q.removeChild(q.lastChild);
};

/* bấm Home -> về màn hình chính */
window.__home=function(){
  closeFolder();if(window.closeFeed)closeFeed();
  Object.keys(wins).forEach(function(k){wins[k].classList.add("hide")});
  ["#start","#qp","#wg"].forEach(function(s){var n=document.querySelector(s);if(n)n.classList.remove("open")});
  if(pgCur>0)goPage(0);
  renderBar();
};

/* Tiện ích: dữ liệu thật */
window.wg=function(){
  var d=new Date(), w=document.getElementById("wg");
  w.innerHTML="<h3 style=\"margin:0 0 10px;font-size:13px;color:var(--mut);font-weight:500\">Tiện ích</h3>"+
    "<div class=\"card\">"+(wx?"<b style=\"font-size:22px\">"+wx.t+"°C</b> "+wmo(wx.c):"Chưa có dữ liệu thời tiết")+"</div>"+
    "<div class=\"card\" style=\"margin-top:8px\">"+d.toLocaleDateString("vi-VN",{weekday:"long"})+"<br><b style=\"font-size:26px\">"+d.getDate()+"</b> tháng "+(d.getMonth()+1)+"</div>"+
    "<button class=\"btn sel\" id=\"andW\" style=\"width:100%;margin-top:8px\">Widget Android</button>";
  w.querySelector("#andW").onclick=function(){w.classList.remove("open");A.openWidgets()};
};

/* Thời gian dùng máy hôm nay */
function usageHtml(){
  var u; try{u=JSON.parse(A.getUsage())}catch(e){return ""}
  if(!u.access)return "<div class=\"card\" style=\"margin-top:8px\"><b>Thời gian dùng hôm nay</b><p style=\"color:var(--mut)\">Cấp quyền truy cập dữ liệu sử dụng để xem bạn dùng máy và từng ứng dụng bao lâu.</p><button class=\"btn sel\" id=\"usg\">Cấp quyền</button></div>";
  var top=u.apps.length?u.apps[0].ms:1;
  return "<div class=\"card\" style=\"margin-top:8px\"><b>Thời gian dùng hôm nay · "+dur(u.total)+"</b>"+
    u.apps.map(function(a){return "<div style=\"margin-top:8px\">"+esc(a.label)+" · "+dur(a.ms)+"<div class=\"bar\"><i style=\"width:"+Math.max(3,Math.round(a.ms*100/top))+"%\"></i></div></div>"}).join("")+"</div>";
}

/* Máy này: thông tin thiết bị thật */
UI.pc=function(b){
  var t=null;
  function bar(l,u,tot){var p=Math.round(u*100/tot);return "<div class=\"card\" style=\"margin-top:8px\">"+l+" · "+fmt(u)+" / "+fmt(tot)+"<div class=\"bar\"><i style=\"width:"+p+"%\"></i></div></div>"}
  function draw(){
    if(!b.isConnected){clearInterval(t);return}
    var d; try{d=JSON.parse(A.getDeviceInfo())}catch(e){return}
    var m=Math.floor(d.uptime/60000);
    var rows=[["Thiết bị",d.model],["Hệ điều hành",d.android],["Bộ xử lý",d.cpu],["Màn hình",d.screen],["Pin",d.bat>=0?d.bat+"%":"—"],["Nhiệt độ pin",d.batTemp!=null?d.batTemp.toFixed(1)+"°C":"—"],["Nhiệt độ CPU",d.cpuTemp!=null?d.cpuTemp.toFixed(1)+"°C":"Máy không cho đọc"],["Thời gian bật máy",Math.floor(m/60)+" giờ "+(m%60)+" phút"]];
    b.innerHTML=rows.map(function(r){return "<div class=\"row\"><div class=\"grow\"><b>"+esc(r[0])+"</b></div><span style=\"text-align:right\">"+esc(r[1])+"</span></div>"}).join("")+
      bar("RAM",d.ramTotal-d.ramFree,d.ramTotal)+bar("Bộ nhớ",d.stTotal-d.stFree,d.stTotal)+usageHtml();
    var g=b.querySelector("#usg"); if(g)g.onclick=function(){A.requestUsage()};
  }
  t=setInterval(draw,2000); draw();
};

/* ====================== HÌNH NỀN HỆ THỐNG ====================== */
var sysw=false;
function applySys(on){
  sysw=!!on;
  document.documentElement.classList.toggle("sysw",sysw);
  if(sysw){
    try{wAnim(0)}catch(e){}
    var v=document.getElementById("wvid"); if(v&&v.pause)v.pause();
    if(st.wa){st.wa=false;try{wAuto()}catch(e){}}
  }
}
var origSetWall=window.setWall;
window.setWall=function(){
  /* chọn hình nền trong SISO -> tắt chế độ hình nền hệ thống */
  if(sysw){applySys(false);A.setSysWall(false)}
  return origSetWall.apply(this,arguments);
};
var origSet=UI.set;
UI.set=function(b){
  origSet.apply(this,arguments);
  var f=b.querySelector("#wf"), blk=f&&f.closest(".set");
  var d=document.createElement("div"); d.className="set";
  d.innerHTML="<p>Hình nền hệ thống Android</p><div><button class=\"btn "+(sysw?"sel":"")+"\" data-sw=\"on\">Dùng hình nền hệ thống</button><button class=\"btn\" data-sw=\"pick\">Đổi hình nền hệ thống…</button></div>";
  d.onclick=function(e){
    var t=e.target.closest("[data-sw]"); if(!t)return;
    e.stopPropagation();
    if(t.dataset.sw==="pick"){A.pickSystemWallpaper();return}
    A.setSysWall(true);applySys(true);UI.set(b);
  };
  if(blk&&blk.parentNode)blk.parentNode.insertBefore(d,blk); else b.insertBefore(d,b.firstChild);
  var pb=pgBlock(b);
  if(blk&&blk.parentNode)blk.parentNode.insertBefore(pb,blk); else b.insertBefore(pb,b.firstChild);
};
applySys(A.getSysWall());


/* ====== TRANG "HÔM NAY": lịch, nhiệm vụ, ghi chú, app thường dùng ====== */
(function(){
  var fe=null, tasks=[], notes=[], editing=null, habits=[], cds=[], water=[], shop=[], fx={k:"spring",s:1,stag:1,press:1};
  function ld(k){try{var v=JSON.parse(A.getData(k));return Array.isArray(v)?v:[]}catch(e){return[]}}
  function sv(k,v){try{A.setData(k,JSON.stringify(v))}catch(e){}}
  function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
  var DOW=["Chủ nhật","Thứ hai","Thứ ba","Thứ tư","Thứ năm","Thứ sáu","Thứ bảy"];
  function p2(n){return (n<10?"0":"")+n}
  function dk(d){d=d||new Date();return d.getFullYear()+"-"+p2(d.getMonth()+1)+"-"+p2(d.getDate())}
  function streak(days){var n=0,d=new Date();if(days.indexOf(dk(d))<0)d.setDate(d.getDate()-1);while(days.indexOf(dk(d))>=0){n++;d.setDate(d.getDate()-1)}return n}
  function daysLeft(s){var a=s.split("-"),t=new Date();t.setHours(0,0,0,0);return Math.round((new Date(+a[0],+a[1]-1,+a[2])-t)/86400000)}
  var WGOAL=8;
  function hm(ms){var d=new Date(ms);return p2(d.getHours())+":"+p2(d.getMinutes())}
  function greet(){var h=new Date().getHours();return h<11?"Chào buổi sáng,":h<13?"Chào buổi trưa,":h<18?"Chào buổi chiều,":"Chào buổi tối,"}
  function dayLabel(ms,ad){
    var d=ad?new Date(new Date(ms).getUTCFullYear(),new Date(ms).getUTCMonth(),new Date(ms).getUTCDate()):new Date(ms);
    var t=new Date();t.setHours(0,0,0,0);var dd=new Date(d);dd.setHours(0,0,0,0);
    var diff=Math.round((dd-t)/86400000);
    if(diff===0)return "Hôm nay";if(diff===1)return "Ngày mai";
    return DOW[d.getDay()]+", "+d.getDate()+"/"+(d.getMonth()+1);
  }
  function build(){
    fe=document.createElement("div");fe.id="feed";
    fe.innerHTML="<div class=\"fh\"><div style=\"flex:1\"><small style=\"color:#93a3b8\" id=\"fgr\"></small><b id=\"fdt\" style=\"display:block\"></b></div>"+
      "<button class=\"fb\" id=\"ffxb\">Hiệu ứng</button><button class=\"fb\" id=\"fsr\">Tìm kiếm</button><button class=\"fb\" id=\"fcl\">Đóng</button></div>"+
      '<div class="fc" id="ffx" style="display:none"></div>'+
      "<div class=\"fc\" id=\"fcal\"></div>"+
      "<div class=\"fc\"><h4>Nhiệm vụ</h4><input class=\"fin\" id=\"ftin\" placeholder=\"Thêm nhiệm vụ\"><div id=\"ftl\" style=\"margin-top:8px\"></div></div>"+
      "<div class=\"fc\"><h4>Ghi chú</h4><textarea class=\"fin\" id=\"fnin\" rows=\"2\" placeholder=\"Tạo ghi chú\"></textarea>"+
      "<div id=\"fnsv\" style=\"display:none;margin-top:8px\"><button class=\"fb\" id=\"fnok\">Lưu ghi chú</button></div><div id=\"fnl\" style=\"margin-top:8px\"></div></div>"+
      '<div class="fc" id="fwx"></div>'+
      '<div class="fc"><h4>Thói quen</h4><input class="fin" id="fhin" placeholder="Thêm thói quen mới"><div id="fhl" style="margin-top:8px"></div></div>'+
      '<div class="fc"><h4>Uống nước</h4><div id="fwt"></div></div>'+
      '<div class="fc"><h4>Đếm ngược</h4><input class="fin" id="fcin" placeholder="Tên sự kiện"><div style="display:flex;gap:8px;margin-top:8px"><input class="fin" id="fcdt" type="date" style="color:#8fd0ff"><button class="fb" id="fcok">Thêm</button></div><div id="fcl" style="margin-top:8px"></div></div>'+
      '<div class="fc"><h4>Danh sách mua sắm<button class="fb" id="fshclr" style="padding:4px 10px">Xóa mục đã mua</button></h4><input class="fin" id="fsin" placeholder="Thêm món cần mua"><div id="fsl" style="margin-top:8px"></div></div>'+
      "<div class=\"fc\"><h4>Ứng dụng thường xuyên sử dụng</h4><div id=\"ffq\"></div></div>";
    document.getElementById("os").appendChild(fe);
    fe.querySelector("#fcl").onclick=closeFeed;
    /* vuốt sang trái (hoặc vuốt xuống từ đầu trang) để đóng trang Hôm nay */
    (function(){var x=0,y=0,on=false,top=false;
      fe.addEventListener("touchstart",function(e){var t=e.touches[0];x=t.clientX;y=t.clientY;top=fe.scrollTop<4;on=e.touches.length===1&&!e.target.closest("input,textarea,select,[contenteditable]")},{passive:true});
      fe.addEventListener("touchend",function(e){if(!on)return;on=false;var t=e.changedTouches[0],dx=t.clientX-x,dy=t.clientY-y;
        if(dx<-60&&Math.abs(dy)<-dx*0.9)closeFeed()},{passive:true});
    })();
    fe.querySelector("#ffxb").onclick=function(){var b=fe.querySelector("#ffx");b.style.display=b.style.display==="none"?"block":"none";drawFx()};
    fe.querySelector("#fsr").onclick=function(){closeFeed();A.openDrawer()};
    var ti=fe.querySelector("#ftin");
    ti.onkeydown=function(e){if(e.key==="Enter"&&ti.value.trim()){tasks.unshift({id:uid(),t:ti.value.trim(),d:0});ti.value="";sv("tasks",tasks);drawTasks()}};
    var hi=fe.querySelector("#fhin");
    hi.onkeydown=function(e){if(e.key==="Enter"&&hi.value.trim()){habits.unshift({id:uid(),t:hi.value.trim(),days:[]});hi.value="";sv("habits",habits);drawHabits()}};
    var si=fe.querySelector("#fsin");
    si.onkeydown=function(e){if(e.key==="Enter"&&si.value.trim()){shop.unshift({id:uid(),t:si.value.trim(),d:0});si.value="";sv("shop",shop);drawShop()}};
    fe.querySelector("#fcok").onclick=function(){
      var ci=fe.querySelector("#fcin"),cd=fe.querySelector("#fcdt");
      if(!ci.value.trim()||!cd.value)return;
      cds.push({id:uid(),t:ci.value.trim(),at:cd.value});cds.sort(function(a,b){return a.at<b.at?-1:1});
      ci.value="";cd.value="";sv("cds",cds);drawCds();
    };
    fe.querySelector("#fshclr").onclick=function(){shop=shop.filter(function(x){return !x.d});sv("shop",shop);drawShop()};
    var ni=fe.querySelector("#fnin"),sb=fe.querySelector("#fnsv");
    ni.oninput=function(){sb.style.display=ni.value.trim()?"block":"none"};
    fe.querySelector("#fnok").onclick=function(){
      if(!ni.value.trim())return;
      notes.unshift({id:uid(),t:ni.value.trim(),m:Date.now()});ni.value="";sb.style.display="none";sv("notes",notes);drawNotes();
    };
    fe.addEventListener("click",function(e){
      var fk=e.target.closest("[data-fxk]");
      if(fk){fx.k=fk.dataset.fxk;saveFx();replay();return}
      var fs=e.target.closest("[data-fxs]");
      if(fs){fx.s=+fs.dataset.fxs;saveFx();replay();return}
      var ft=e.target.closest("[data-fxt]");
      if(ft){fx[ft.dataset.fxt]=fx[ft.dataset.fxt]?0:1;saveFx();replay();return}
      if(e.target.closest("[data-fxp]")){replay();return}
      if(e.target.closest("[data-fxr]")){fx={k:"spring",s:1,stag:1,press:1};saveFx();replay();return}
      var hk=e.target.closest("[data-hk]");
      if(hk){habits.forEach(function(h){if(h.id===hk.dataset.hk){var i=h.days.indexOf(dk());if(i<0)h.days.push(dk());else h.days.splice(i,1);h.days=h.days.slice(-400)}});sv("habits",habits);drawHabits();return}
      var hd=e.target.closest("[data-hd]");
      if(hd){habits=habits.filter(function(h){return h.id!==hd.dataset.hd});sv("habits",habits);drawHabits();return}
      var wb=e.target.closest("[data-wd]");
      if(wb){var k=dk(),r=water.filter(function(x){return x.d===k})[0];if(!r){r={d:k,n:0};water.push(r)}
        r.n=Math.max(0,Math.min(30,r.n+(+wb.dataset.wd)));water=water.slice(-60);sv("water",water);drawWater();return}
      var cx=e.target.closest("[data-cdd]");
      if(cx){cds=cds.filter(function(x){return x.id!==cx.dataset.cdd});sv("cds",cds);drawCds();return}
      var sk=e.target.closest("[data-sk]");
      if(sk){shop.forEach(function(x){if(x.id===sk.dataset.sk)x.d=x.d?0:1});sv("shop",shop);drawShop();return}
      var sd=e.target.closest("[data-sdel]");
      if(sd){shop=shop.filter(function(x){return x.id!==sd.dataset.sdel});sv("shop",shop);drawShop();return}
      var c=e.target.closest("[data-tk]");
      if(c){tasks.forEach(function(t){if(t.id===c.dataset.tk)t.d=t.d?0:1});sv("tasks",tasks);drawTasks();return}
      var x=e.target.closest("[data-td]");
      if(x){tasks=tasks.filter(function(t){return t.id!==x.dataset.td});sv("tasks",tasks);drawTasks();return}
      var a=e.target.closest("[data-fa]");if(a){closeFeed();A.launch(a.dataset.fa);return}
      if(e.target.closest("#fcalo")){A.openCalendar();return}
      if(e.target.closest("#fcalp")){A.requestCalendar();return}
      var n=e.target.closest("[data-nt]");
      if(n&&!e.target.closest("textarea,button")){editing=n.dataset.nt;drawNotes();return}
      var sv2=e.target.closest("[data-nsave]");
      if(sv2){var ta=fe.querySelector("#fned");notes.forEach(function(m){if(m.id===sv2.dataset.nsave&&ta.value.trim()){m.t=ta.value.trim();m.m=Date.now()}});editing=null;sv("notes",notes);drawNotes();return}
      var dl=e.target.closest("[data-ndel]");
      if(dl){notes=notes.filter(function(m){return m.id!==dl.dataset.ndel});editing=null;sv("notes",notes);drawNotes();return}
    });
  }
  function drawTasks(){
    var l=fe.querySelector("#ftl");
    l.innerHTML=tasks.length?tasks.map(function(t){
      return "<div class=\"fr"+(t.d?" done":"")+"\"><span class=\"ck"+(t.d?" on":"")+"\" data-tk=\""+t.id+"\"></span><div class=\"g\">"+esc(t.t)+"</div><button class=\"fb\" data-td=\""+t.id+"\">Xóa</button></div>";
    }).join(""):"<div class=\"em\">Chưa có nhiệm vụ nào.</div>";
  }
  function drawNotes(){
    var l=fe.querySelector("#fnl");
    l.innerHTML=notes.length?notes.slice(0,12).map(function(m){
      var dt=new Date(m.m),when=dt.getDate()+"/"+(dt.getMonth()+1)+" "+hm(m.m);
      if(editing===m.id)return "<div class=\"nt\"><textarea class=\"fin\" id=\"fned\" rows=\"4\">"+esc(m.t)+"</textarea><div style=\"margin-top:8px;display:flex;gap:8px\"><button class=\"fb\" data-nsave=\""+m.id+"\">Lưu</button><button class=\"fb\" data-ndel=\""+m.id+"\">Xóa ghi chú</button></div></div>";
      return "<div class=\"nt\" data-nt=\""+m.id+"\">"+esc(m.t.length>220?m.t.slice(0,220)+"…":m.t)+"<small>"+when+"</small></div>";
    }).join(""):"<div class=\"em\">Chưa có ghi chú nào.</div>";
  }
  function drawCal(){
    var box=fe.querySelector("#fcal"),h="<h4>Lịch</h4>";
    if(!A.hasCalendar()){
      box.innerHTML=h+"<div class=\"em\">Cho phép SISO OS đọc lịch để luôn thấy các cuộc hẹn sắp tới.</div><button class=\"fb\" id=\"fcalp\">Cấp quyền lịch</button>";return;
    }
    var ev=[];try{ev=JSON.parse(A.getEvents())}catch(e){}
    h+=ev.length?ev.map(function(e){
      return "<div class=\"fr\"><div class=\"g\">"+esc(e.t)+"<small>"+dayLabel(e.b,e.ad)+" · "+(e.ad?"Cả ngày":hm(e.b)+" - "+hm(e.e))+(e.loc?" · "+esc(e.loc):"")+"</small></div></div>";
    }).join(""):"<div class=\"em\">Không có cuộc hẹn nào trong 7 ngày tới.</div>";
    box.innerHTML=h+"<div style=\"margin-top:8px\"><button class=\"fb\" id=\"fcalo\">Mở Lịch</button></div>";
  }
  var FXK=[["spring","Nảy"],["slide","Trượt"],["blur","Mờ nhòe"],["rise","Trồi lên"],["fade","Mờ dần"],["zoom","Phóng to"],["none","Không"]],FXS=[["Nhanh","0.14s"],["Vừa","0.22s"],["Chậm","0.4s"]];
  function saveFx(){sv("fx",[fx]);applyFx();drawFx()}
  function applyFx(){
    if(!fe)return;
    fe.dataset.fx=fx.k;fe.dataset.stag=fx.stag?"1":"0";fe.dataset.press=fx.press?"1":"0";
    fe.style.setProperty("--fxs",(FXS[fx.s]||FXS[1])[1]);
    var cs=fe.querySelectorAll(".fc");for(var i=0;i<cs.length;i++)cs[i].style.setProperty("--i",i);
  }
  function replay(){
    if(!fe)return;fe.classList.remove("open");
    setTimeout(function(){fe.classList.add("open")},fx.k==="none"?30:(parseFloat((FXS[fx.s]||FXS[1])[1])*1000+60));
  }
  function drawFx(){
    var b=fe.querySelector("#ffx");if(b.style.display==="none")return;
    function bt(on,att,v,l){return '<button class="fb'+(on?' fxon':'')+'" '+att+'="'+v+'">'+l+'</button>'}
    b.innerHTML='<h4>Tùy chỉnh hiệu ứng</h4>'+
      '<div class="fxl">Kiểu mở trang</div><div class="fxr">'+FXK.map(function(x){return bt(fx.k===x[0],"data-fxk",x[0],x[1])}).join("")+'</div>'+
      '<div class="fxl">Tốc độ</div><div class="fxr">'+FXS.map(function(x,i){return bt(fx.s===i,"data-fxs",i,x[0])}).join("")+'</div>'+
      '<div class="fxl">Khác</div><div class="fxr">'+bt(fx.stag,"data-fxt","stag","Thẻ hiện lần lượt")+bt(fx.press,"data-fxt","press","Hiệu ứng khi chạm")+'</div>'+
      '<div class="fxr" style="margin-top:12px"><button class="fb" data-fxp="1">Xem thử</button><button class="fb" data-fxr="1">Đặt lại</button></div>';
  }
  function drawWx(){
    var b=fe.querySelector("#fwx");
    b.innerHTML="<h4>Thời tiết</h4>"+(wx?"<div style=\"display:flex;align-items:baseline;gap:10px\"><b style=\"font-size:34px;font-weight:600\">"+wx.t+"°C</b><span style=\"font-size:15px\">"+wmo(wx.c)+"</span></div>":"<div class=\"em\">Chưa có dữ liệu thời tiết. Hãy cấp quyền vị trí cho SISO OS.</div>");
  }
  function drawHabits(){
    var l=fe.querySelector("#fhl"),today=dk();
    l.innerHTML=habits.length?habits.map(function(h){
      var on=h.days.indexOf(today)>=0,n=streak(h.days);
      return '<div class="fr'+(on?' done':'')+'"><span class="ck'+(on?' on':'')+'" data-hk="'+h.id+'"></span><div class="g">'+esc(h.t)+'<small>'+(n?'Chuỗi '+n+' ngày liên tiếp':'Chưa có chuỗi')+'</small></div><button class="fb" data-hd="'+h.id+'">Xóa</button></div>';
    }).join(""):'<div class="em">Chưa có thói quen nào. Thêm một thói quen để theo dõi mỗi ngày.</div>';
  }
  function drawWater(){
    var k=dk(),r=water.filter(function(x){return x.d===k})[0],n=r?r.n:0,pc=Math.min(100,Math.round(n*100/WGOAL));
    fe.querySelector("#fwt").innerHTML='<div style="display:flex;align-items:center;gap:12px"><button class="fb" data-wd="-1" style="width:44px">−</button><div style="flex:1;text-align:center"><b style="font-size:26px">'+n+'</b> / '+WGOAL+' cốc<div class="bar" style="height:8px;border-radius:8px;background:rgba(255,255,255,.12);overflow:hidden;margin-top:8px"><i style="display:block;height:100%;width:'+pc+'%;background:#8fd0ff"></i></div></div><button class="fb" data-wd="1" style="width:44px">+</button></div>';
  }
  function drawCds(){
    var l=fe.querySelector("#fcl");
    l.innerHTML=cds.length?cds.map(function(c){
      var n=daysLeft(c.at),txt=n>0?'Còn '+n+' ngày':n===0?'Hôm nay':'Đã qua '+(-n)+' ngày';
      return '<div class="fr"><div class="g">'+esc(c.t)+'<small>'+c.at.split("-").reverse().join("/")+'</small></div><b style="font-size:14px;color:#8fd0ff">'+txt+'</b><button class="fb" data-cdd="'+c.id+'">Xóa</button></div>';
    }).join(""):'<div class="em">Chưa có sự kiện nào để đếm ngược.</div>';
  }
  function drawShop(){
    var l=fe.querySelector("#fsl");
    l.innerHTML=shop.length?shop.map(function(x){
      return '<div class="fr'+(x.d?' done':'')+'"><span class="ck'+(x.d?' on':'')+'" data-sk="'+x.id+'"></span><div class="g">'+esc(x.t)+'</div><button class="fb" data-sdel="'+x.id+'">Xóa</button></div>';
    }).join(""):'<div class="em">Danh sách trống.</div>';
  }
  function drawFreq(){
    var f=[];try{f=JSON.parse(A.getFrequent())}catch(e){}
    fe.querySelector("#ffq").innerHTML=f.length?"<div class=\"fg\">"+f.map(function(p){
      return "<button class=\"fa\" data-fa=\""+esc(p.id)+"\"><img alt=\"\" src=\"data:image/png;base64,"+p.icon+"\"><span>"+esc(p.label)+"</span></button>";
    }).join("")+"</div>":"<div class=\"em\">Mở vài ứng dụng, danh sách này sẽ tự cập nhật.</div>";
  }
  function refresh(){
    if(!fe)return;
    var d=new Date();
    fe.querySelector("#fgr").textContent=greet();
    fe.querySelector("#fdt").textContent=DOW[d.getDay()]+", "+d.getDate()+" Th"+(d.getMonth()+1);
    drawFx();drawCal();drawWx();drawTasks();drawHabits();drawNotes();drawWater();drawCds();drawShop();drawFreq();
  }
  window.__feedFx=function(o){
    var f0=ld("fx")[0];if(f0&&typeof f0==="object")fx={k:f0.k||"spring",s:f0.s==null?1:f0.s,stag:f0.stag==null?1:f0.stag,press:f0.press==null?1:f0.press};
    if(o){for(var k in o)fx[k]=o[k];sv("fx",[fx]);if(fe){applyFx();if(fe.classList.contains("open"))replay()}}
    return JSON.stringify(fx);
  };
  window.openFeed=function(){
    if(!fe){build()}
    var f0=ld("fx")[0];if(f0&&typeof f0==="object")fx={k:f0.k||"spring",s:f0.s==null?1:f0.s,stag:f0.stag==null?1:f0.stag,press:f0.press==null?1:f0.press};
    applyFx();
    tasks=ld("tasks");notes=ld("notes");habits=ld("habits");cds=ld("cds");water=ld("water");shop=ld("shop");editing=null;
    refresh();window.__feedApply();
    requestAnimationFrame(function(){fe.classList.add("open")});
  };
  /* Nguồn cấp dữ liệu: ẩn/hiện từng thẻ theo Cài đặt trình khởi chạy */
  window.__feedApply=function(){
    if(!fe)return;
    var hid=(A.getFeedHidden()||"").split(",");
    var cards=fe.querySelectorAll(".fc:not(#ffx)");
    for(var i=0;i<cards.length;i++)cards[i].style.display=hid.indexOf(String(i))>=0?"none":"";
  };
  window.closeFeed=function(){if(fe){fe.classList.remove("open");var a=document.activeElement;if(a&&a.blur)a.blur()}};
  window.__feedRefresh=function(){if(fe&&fe.classList.contains("open"))refresh()};

  /* vuốt từ trái sang phải ở trang đầu tiên -> mở trang Hôm nay */
  var c=document.getElementById("icons"),sx=0,sy=0,st0=false;
  c.addEventListener("touchstart",function(e){
    var t=e.touches[0];sx=t.clientX;sy=t.clientY;st0=e.touches.length===1&&!drag&&!foEl&&c.scrollLeft<4&&sx>8;
  },{passive:true});
  c.addEventListener("touchend",function(e){
    if(!st0||drag)return;st0=false;
    var t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;
    if(dx>60&&Math.abs(dy)<dx*0.9&&c.scrollLeft<4&&A.getFlag("g_feed",true))window.openFeed();
  },{passive:true});
  /* nút ở thanh tác vụ */
  var oldBar=window.renderBar;
  window.renderBar=function(){
    oldBar.apply(this,arguments);
    var tb=document.getElementById("tb");if(!tb||tb.querySelector("[data-feed]"))return;
    var b=document.createElement("button");b.className="tbb";b.setAttribute("data-and","1");b.setAttribute("data-feed","1");
    b.title="Hôm nay";b.setAttribute("aria-label","Hôm nay");
    b.innerHTML="<span class=\"tile\" style=\"font-size:11px;background:linear-gradient(135deg,#3b82f6,#06b6d4)\">Nay</span>";
    b.onclick=function(e){e.stopPropagation();window.openFeed()};
    var tray=tb.querySelector("#tray");tb.insertBefore(b,tray||null);
  };
  renderBar();

  /* báo cho Android biết khi có cửa sổ / bảng đang mở, để cử chỉ vuốt lên mở ngăn app không giành mất thao tác cuộn */
  var lastB=null;
  setInterval(function(){
    var b=!!(fe&&fe.classList.contains("open"));
    try{Object.keys(wins).forEach(function(k){if(!wins[k].classList.contains("hide"))b=true})}catch(e){}
    ["#start","#qp","#wg"].forEach(function(s){var n=document.querySelector(s);if(n&&n.classList.contains("open"))b=true});
    if(typeof foEl!=="undefined"&&foEl)b=true;
    if(b!==lastB){lastB=b;try{A.setHomeBlocked(b)}catch(e){}}
  },300);
})();

/* giữ vào thanh tác vụ rồi kéo về một mép màn hình để đổi bên: dưới / trên / trái / phải */
(function(){
  var SIDES=["","tb-top","tb-left","tb-right"],t=null,on=false,tgt="",x0=0,y0=0,hint=null,justDragged=false;
  function cur(){return SIDES.find(function(c){return c&&os.classList.contains(c)})||""}
  function pick(x,y){
    var d=[[innerHeight-y,""],[y,"tb-top"],[x,"tb-left"],[innerWidth-x,"tb-right"]];
    d.sort(function(a,b){return a[0]-b[0]});return d[0][1];
  }
  function show(c){
    if(!hint){hint=document.createElement("div");
      hint.style.cssText="position:fixed;z-index:99998;pointer-events:none;border-radius:16px;background:rgba(56,163,255,.38);border:2px solid rgba(255,255,255,.85);box-shadow:0 0 0 9999px rgba(0,0,0,.28)";
      document.body.appendChild(hint)}
    var s=hint.style;
    s.left=s.right=s.top=s.bottom=s.width=s.height="auto";
    if(c==="tb-left"||c==="tb-right"){s.top="4px";s.bottom="4px";s.width="56px";if(c==="tb-left")s.left="4px";else s.right="4px"}
    else{s.left="4px";s.right="4px";s.height="52px";if(c==="tb-top")s.top="4px";else s.bottom="4px"}
  }
  document.addEventListener("pointerdown",function(e){
    clearTimeout(t);t=null;
    if(on||drag)return;
    var tb=e.target.closest&&e.target.closest("#tb");
    if(!tb||e.target.closest("input,select,textarea"))return;
    var b=e.target.closest(".tbb");if(b&&b.querySelector("img"))return;   /* app ghim có menu giữ riêng */
    x0=e.clientX;y0=e.clientY;
    t=setTimeout(function(){t=null;on=true;tgt=cur();show(tgt);try{A.haptic();A.setHomeBlocked(true)}catch(_){}},380);
  },true);
  addEventListener("pointermove",function(e){
    if(t&&(Math.abs(e.clientX-x0)>10||Math.abs(e.clientY-y0)>10)){clearTimeout(t);t=null}
    if(!on)return;
    var n=pick(e.clientX,e.clientY);
    if(n!==tgt){tgt=n;show(n);try{A.haptic()}catch(_){}}
  },true);
  function end(apply){
    clearTimeout(t);t=null;
    if(!on)return;on=false;
    if(hint){hint.remove();hint=null}
    try{A.setHomeBlocked(false)}catch(_){}
    justDragged=true;setTimeout(function(){justDragged=false},350);
    if(apply&&tgt!==cur()){
      os.classList.remove("tb-top","tb-left","tb-right");
      if(tgt)os.classList.add(tgt);
      try{paint()}catch(_){}
      try{applyLay()}catch(_){}
      try{buildPages()}catch(_){}
    }
  }
  addEventListener("pointerup",function(){end(true)},true);
  addEventListener("pointercancel",function(){end(false)},true);
  document.addEventListener("click",function(e){if(justDragged){e.stopPropagation();e.preventDefault()}},true);
  document.addEventListener("touchmove",function(e){if(on&&e.cancelable)e.preventDefault()},{passive:false});
})();

loadHome(); loadLayout(); reconcile(); drawIcons(); renderBar();

})();
