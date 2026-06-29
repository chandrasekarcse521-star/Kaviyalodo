// ── 🦚 KAVIYAA LODO QUEEN 🦚 — Royal Chess-Ludo Hybrid Edition ──────────────
// Each player commands 4 royal pieces — Raja, Rani, Manthiri, Chipai — each
// with its own rank and power. Safe zones block captures EXCEPT a Raja may
// always strike down a Rani. Captures swap positions instead of sending a
// piece all the way home.
import { useState, useEffect, useRef } from "react";

// ── Palette ───────────────────────────────────────────────────────────────────
const PAL = {
  red:    { main:"#B71C1C", mid:"#E53935", light:"#FF8A80", pale:"#FFEBEE", dark:"#7F0000" },
  green:  { main:"#1B5E20", mid:"#43A047", light:"#69F0AE", pale:"#E8F5E9", dark:"#003300" },
  blue:   { main:"#0D47A1", mid:"#1E88E5", light:"#82B1FF", pale:"#E3F2FD", dark:"#002171" },
  yellow: { main:"#E65100", mid:"#FB8C00", light:"#FFD54F", pale:"#FFF8E1", dark:"#8D3900" },
};
const PKEYS = ["red","green","yellow","blue"];
const PNAMES = { red:"Red", green:"Green", yellow:"Yellow", blue:"Blue" };
const PEMOJI = { red:"🔴", green:"🟢", yellow:"🟡", blue:"🔵" };

// ── Royal piece roles (each player's 4 tokens, by index 0-3) ────────────────
// Rank decides who may capture whom: a piece can only strike pieces of equal
// or lower rank. The one royal exception: a Raja may always strike a Rani,
// even standing on a safe cell — the Raja's signature power.
const ROLE_BY_INDEX = ["raja", "rani", "manthiri", "chipai"];
const ROLE_EMOJI = { raja:"👑", rani:"👸", manthiri:"🎩", chipai:"⚔️" };
const ROLE_NAME  = { raja:"Raja", rani:"Rani", manthiri:"Manthiri", chipai:"Chipai" };
const RANK        = { raja:4, rani:3, manthiri:2, chipai:1 };

// ── Character avatars ─────────────────────────────────────────────────────────
const BOY_AVATARS  = ["👦","🧒","👨","🧑","👲","🧔","👮","🦸","🧙","🤴"];
const GIRL_AVATARS = ["👧","🧒‍♀️","👩","🧑‍🦰","👸","🧝‍♀️","👩‍🚀","🧜‍♀️","🧚‍♀️","🧙‍♀️"];

// ── Board path (52 cells on 15×15 grid) ──────────────────────────────────────
const P52 = [
  [6,1],[7,1],[8,1],[8,2],[8,3],[8,4],[8,5],[8,6],
  [9,6],[10,6],[11,6],[12,6],[13,6],[14,6],[14,7],
  [13,7],[12,7],[11,7],[10,7],[9,7],[8,8],
  [8,9],[8,10],[8,11],[8,12],[8,13],[7,13],[6,13],
  [6,12],[6,11],[6,10],[6,9],[6,8],
  [5,8],[4,8],[3,8],[2,8],[1,8],[0,8],[0,7],
  [1,7],[2,7],[3,7],[4,7],[5,7],[6,7],
  [6,6],[6,5],[6,4],[6,3],[6,2],[6,1],
];
const SAFE_IDX = new Set([0, 7, 14, 20, 26, 32, 39, 45]);
const ENTER_IDX = { red:0, blue:13, yellow:26, green:39 };
const HOME_LANE = {
  red:    [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
  green:  [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
  yellow: [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
  blue:   [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]],
};
const YARD_BOUNDS = {
  red:    { r0:0,  c0:0,  r1:5,  c1:5  },
  green:  { r0:0,  c0:9,  r1:5,  c1:14 },
  blue:   { r0:9,  c0:0,  r1:14, c1:5  },
  yellow: { r0:9,  c0:9,  r1:14, c1:14 },
};

// ── Board helpers ─────────────────────────────────────────────────────────────
function getCell(color, pos) {
  if (pos < 1) return null;
  if (pos <= 52) return P52[(ENTER_IDX[color] + pos - 1) % 52];
  if (pos <= 58) return HOME_LANE[color][pos - 53];
  return null;
}
function getGlobalIdx(color, pos) {
  if (pos < 1 || pos > 52) return -1;
  return (ENTER_IDX[color] + pos - 1) % 52;
}
// Inverse of getGlobalIdx — turns a shared-track global cell index into that
// color's own relative position number. Used to swap a captured piece onto
// the attacker's previous spot instead of sending it home.
function globalIdxToPos(color, gi) {
  return ((gi - ENTER_IDX[color] + 52) % 52) + 1;
}
function getMovable(tokens, dice, color) {
  var result = [];
  for (var i = 0; i < tokens.length; i++) {
    var t = tokens[i];
    if (t.pos === 59) continue;
    if (t.pos === -1 && dice === 6) { result.push(i); continue; }
    if (t.pos >= 1 && t.pos <= 52 && t.pos + dice <= 58) { result.push(i); continue; }
    if (t.pos >= 53 && t.pos <= 58 && t.pos + dice <= 59) { result.push(i); continue; }
  }
  return result;
}

// ── localStorage helpers ──────────────────────────────────────────────────────
function lsGet(key, def) {
  try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch(e) { return def; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {}
}
function lsDel(key) {
  try { localStorage.removeItem(key); } catch(e) {}
}
function genCode() { return String(Math.floor(100000 + Math.random() * 900000)); }
function genId()   { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

// ── CSS ───────────────────────────────────────────────────────────────────────
var GCSS = `
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  input { outline: none; }
  input::placeholder { color: rgba(255,255,255,0.35); }
  input:focus { border-color: rgba(255,215,0,0.6) !important; }
  select { color: white; outline: none; }
  select option { background: #0D47A1; color: white; }
  button:active { transform: scale(0.95) !important; }
  @keyframes fadeUp  { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
  @keyframes shake   { 0%,100%{transform:translateX(0)} 25%,75%{transform:translateX(-7px)} 50%{transform:translateX(7px)} }
  @keyframes msgPop  { from { opacity:0; transform:scale(0.9); } to { opacity:1; transform:scale(1); } }
  @keyframes pinBob  { from { transform:translateY(0); } to { transform:translateY(-5px); } }
  @keyframes pulsate { from { transform:scale(1); } to { transform:scale(1.13); } }
  @keyframes rollSpin{ 0%{transform:rotate(-16deg)scale(1.07)} 50%{transform:rotate(16deg)scale(0.94)} 100%{transform:rotate(-16deg)scale(1.07)} }
  @keyframes winGlow { 0%,100%{box-shadow:0 0 8px gold} 50%{box-shadow:0 0 24px gold,0 0 48px #FFD700} }
  @keyframes avatarPop { from{transform:scale(0.7);opacity:0} to{transform:scale(1);opacity:1} }
  @keyframes diceLand { 0%{transform:scale(1.4) rotate(20deg);opacity:0.5} 100%{transform:scale(1) rotate(0deg);opacity:1} }
`;

// ── Shared styles ─────────────────────────────────────────────────────────────
var ST = {
  page: {
    width:"100%", minHeight:"100vh",
    background:"linear-gradient(180deg,#0A1628 0%,#0D47A1 50%,#1565C0 100%)",
    display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
    fontFamily:"'Segoe UI',Roboto,sans-serif", userSelect:"none", position:"relative",
  },
  card: {
    background:"rgba(255,255,255,0.07)",
    border:"1px solid rgba(255,255,255,0.13)",
    borderRadius:18, padding:22,
    backdropFilter:"blur(10px)",
    boxShadow:"0 16px 48px rgba(0,0,0,0.45)",
  },
  card2: {
    background:"rgba(255,255,255,0.07)",
    border:"1px solid rgba(255,255,255,0.1)",
    borderRadius:14, padding:14,
  },
  btn: {
    padding:"12px 22px", fontSize:14, fontWeight:700,
    color:"white", border:"none", borderRadius:22,
    cursor:"pointer", transition:"all 0.2s",
    background:"linear-gradient(135deg,#1E88E5,#0D47A1)",
    boxShadow:"0 4px 14px rgba(0,0,0,0.3)",
  },
  btnSm: {
    padding:"7px 14px", fontSize:12, fontWeight:600,
    color:"white", border:"none", borderRadius:14,
    cursor:"pointer", background:"rgba(255,255,255,0.13)",
  },
  input: {
    width:"100%", padding:"11px 13px", fontSize:14,
    color:"white", background:"rgba(255,255,255,0.08)",
    border:"1px solid rgba(255,255,255,0.18)", borderRadius:10,
  },
};

// ── initGameState ─────────────────────────────────────────────────────────────
function initGameState(players) {
  var tokens = {};
  for (var i = 0; i < players.length; i++) {
    tokens[players[i].color] = [
      { pos:-1 }, { pos:-1 }, { pos:-1 }, { pos:-1 }
    ];
  }
  return {
    tokens: tokens,
    turn: 0,
    playerOrder: players.map(function(p){ return p.color; }),
    dice: null, rolling: false, rolled: false,
    sel: [], msg: "Game started! Roll the dice!",
    winners: [], cutMsg: null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CHARACTER SELECTOR (shown during register)
// ═══════════════════════════════════════════════════════════════════════════════
function CharacterSelector(props) {
  var [gender, setGender] = useState("boy");
  var list = gender === "boy" ? BOY_AVATARS : GIRL_AVATARS;

  function pick(av) {
    props.onSelect(av);
  }

  return (
    <div style={{marginTop:14}}>
      <div style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.6)",marginBottom:8,textAlign:"center"}}>
        Choose Your Character
      </div>
      {/* Gender toggle */}
      <div style={{display:"flex",gap:6,marginBottom:10,background:"rgba(0,0,0,0.3)",borderRadius:10,padding:3}}>
        {["boy","girl"].map(function(g){
          return (
            <button key={g} onClick={function(){ setGender(g); }}
              style={{
                flex:1, padding:"8px 0", borderRadius:8, border:"none", cursor:"pointer",
                fontWeight:700, fontSize:12, transition:"all 0.2s",
                background: gender===g ? "linear-gradient(135deg,#FFD700,#FFA000)" : "transparent",
                color: gender===g ? "#000" : "rgba(255,255,255,0.55)",
              }}>
              {g === "boy" ? "👦 Boy" : "👧 Girl"}
            </button>
          );
        })}
      </div>
      {/* Avatar grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6}}>
        {list.map(function(av){
          var sel = props.selected === av;
          return (
            <div key={av} onClick={function(){ pick(av); }}
              style={{
                fontSize:24, textAlign:"center", padding:"8px 0",
                borderRadius:10, cursor:"pointer", transition:"all 0.18s",
                background: sel ? "rgba(255,215,0,0.25)" : "rgba(255,255,255,0.07)",
                border: sel ? "2px solid gold" : "2px solid transparent",
                boxShadow: sel ? "0 0 10px rgba(255,215,0,0.5)" : "none",
                animation: sel ? "avatarPop 0.25s ease" : "none",
              }}>
              {av}
            </div>
          );
        })}
      </div>
      {props.selected && (
        <div style={{textAlign:"center",marginTop:8,fontSize:12,color:"#FFD700",fontWeight:700}}>
          Selected: {props.selected}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AUTH SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function AuthScreen(props) {
  var [mode,    setMode]    = useState("login");
  var [name,    setName]    = useState("");
  var [pass,    setPass]    = useState("");
  var [avatar,  setAvatar]  = useState("👦");
  var [err,     setErr]     = useState("");
  var [shake,   setShake]   = useState(false);

  function doShake() { setShake(true); setTimeout(function(){ setShake(false); }, 420); }

  function submit() {
    setErr("");
    if (!name.trim() || !pass.trim()) { setErr("Fill all fields!"); doShake(); return; }
    var users = lsGet("ludo_users", {});
    var key = name.trim().toLowerCase();

    if (mode === "register") {
      // ── Enforce unique username across ALL registered accounts ──
      if (users[key]) {
        setErr("Username \"" + name.trim() + "\" is already taken! Choose another name.");
        doShake();
        return;
      }
      if (pass.length < 4) { setErr("Password must be 4+ chars"); doShake(); return; }
      if (!avatar) { setErr("Pick a character first!"); doShake(); return; }
      var u = {
        id: genId(), name: name.trim(), pass: pass,
        avatar: avatar,
        gender: BOY_AVATARS.includes(avatar) ? "boy" : "girl",
        coins: 1000, wins: 0,
      };
      users[key] = u;
      lsSet("ludo_users", users);
      props.onLogin(u);
    } else {
      var found = users[key];
      if (!found || found.pass !== pass) { setErr("Wrong username or password!"); doShake(); return; }
      props.onLogin(found);
    }
  }

  var totalUsers = Object.keys(lsGet("ludo_users", {})).length;

  return (
    <div style={ST.page}>
      <style>{GCSS}</style>
      <div style={{
        position:"absolute", inset:0, opacity:0.05,
        backgroundImage:"radial-gradient(circle,#fff 1px,transparent 1px)",
        backgroundSize:"30px 30px",
      }} />
      <div style={{
        ...ST.card, width:"92%", maxWidth:360,
        animation: shake ? "shake 0.4s ease" : "fadeUp 0.5s ease",
        position:"relative", maxHeight:"92vh", overflowY:"auto",
      }}>
        <div style={{textAlign:"center", marginBottom:18}}>
          <div style={{fontSize:40}}>🦚👑🦚</div>
          <div style={{fontSize:22, fontWeight:900, color:"#FFD700", letterSpacing:1.5, fontFamily:"Georgia,serif"}}>
            KAVIYAA LODO QUEEN
          </div>
          <div style={{fontSize:10, color:"rgba(255,255,255,0.4)", letterSpacing:3, marginTop:2}}>
            ROYAL CHESS-LUDO · MULTIPLAYER
          </div>
        </div>

        {/* Mode toggle */}
        <div style={{display:"flex", background:"rgba(0,0,0,0.3)", borderRadius:10, padding:3, marginBottom:16}}>
          {["login","register"].map(function(m) {
            return (
              <button key={m} onClick={function(){ setMode(m); setErr(""); }}
                style={{
                  flex:1, padding:"9px 0", borderRadius:8, border:"none", cursor:"pointer",
                  fontWeight:700, fontSize:12, letterSpacing:0.5, transition:"all 0.2s",
                  background: mode===m ? "linear-gradient(135deg,#FFD700,#FFA000)" : "transparent",
                  color: mode===m ? "#000" : "rgba(255,255,255,0.55)",
                }}>
                {m === "login" ? "🔑 Login" : "📝 Register"}
              </button>
            );
          })}
        </div>

        {/* Character selector (register only) */}
        {mode === "register" && (
          <CharacterSelector selected={avatar} onSelect={setAvatar} />
        )}

        {/* Login avatar preview */}
        {mode === "login" && (
          <div style={{textAlign:"center", marginBottom:10}}>
            <div style={{fontSize:44, lineHeight:1}}>{avatar}</div>
          </div>
        )}

        <div style={{display:"flex", flexDirection:"column", gap:10, marginTop:12}}>
          <div style={{display:"flex", alignItems:"center", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.18)", borderRadius:10, overflow:"hidden"}}>
            <span style={{padding:"0 12px", fontSize:16}}>👤</span>
            <input
              value={name} onChange={function(e){ setName(e.target.value); }}
              placeholder="Username" style={{flex:1, padding:"11px 8px 11px 0", fontSize:14, color:"white", background:"transparent", border:"none"}}
              onKeyDown={function(e){ if(e.key==="Enter") submit(); }}
            />
          </div>
          <div style={{display:"flex", alignItems:"center", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.18)", borderRadius:10, overflow:"hidden"}}>
            <span style={{padding:"0 12px", fontSize:16}}>🔒</span>
            <input
              value={pass} onChange={function(e){ setPass(e.target.value); }}
              type="password" placeholder="Password"
              style={{flex:1, padding:"11px 8px 11px 0", fontSize:14, color:"white", background:"transparent", border:"none"}}
              onKeyDown={function(e){ if(e.key==="Enter") submit(); }}
            />
          </div>
        </div>

        {err ? <div style={{color:"#FF6B6B", fontSize:12, textAlign:"center", marginTop:10, fontWeight:600, background:"rgba(255,0,0,0.1)", borderRadius:8, padding:"6px 10px"}}>{err}</div> : null}

        <button onClick={submit} style={{
          ...ST.btn, marginTop:16, width:"100%",
          background:"linear-gradient(135deg,#FFD700,#FF8F00)", color:"#000", fontSize:15, fontWeight:900,
          boxShadow:"0 6px 20px rgba(255,215,0,0.35)",
        }}>
          {mode === "login" ? "🚀 Enter Game" : "🎮 Create Account"}
        </button>

        <div style={{textAlign:"center", marginTop:12, fontSize:11, color:"rgba(255,255,255,0.35)"}}>
          {totalUsers} players registered
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  LOBBY SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function LobbyScreen(props) {
  var user = props.user;
  var [count, setCount] = useState(4);
  var [myRooms, setMyRooms] = useState([]);

  useEffect(function() {
    function load() {
      var all = lsGet("ludo_rooms", {});
      var mine = Object.values(all).filter(function(r) {
        return r.players.some(function(p){ return p.id === user.id; }) && r.status !== "done";
      });
      setMyRooms(mine);
    }
    load();
    var t = setInterval(load, 2000);
    return function(){ clearInterval(t); };
  }, [user.id]);

  function createRoom() {
    var code = genCode();
    var newRoom = {
      id: genId(), code: code, status: "waiting",
      maxPlayers: count,
      players: [{ id:user.id, name:user.name, avatar:user.avatar, gender:user.gender||"boy", color:"red", ready:false }],
      host: user.id, created: Date.now(), gameState: null, invites: [],
    };
    var all = lsGet("ludo_rooms", {});
    all[newRoom.id] = newRoom;
    lsSet("ludo_rooms", all);
    props.onJoin(newRoom);
  }

  var stats = lsGet("ludo_users", {});
  var myData = stats[user.name.toLowerCase()] || user;

  return (
    <div style={{...ST.page, justifyContent:"flex-start"}}>
      <style>{GCSS}</style>
      <div style={{width:"100%", maxWidth:400, padding:"12px 14px", display:"flex", flexDirection:"column", gap:12}}>

        {/* Profile bar */}
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", paddingTop:8}}>
          <div style={{display:"flex", alignItems:"center", gap:10}}>
            <div style={{width:46, height:46, borderRadius:12,
              background:"linear-gradient(135deg,#FFD700,#FFA000)",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:26,
              boxShadow:"0 4px 12px rgba(255,215,0,0.35)"}}>
              {user.avatar || "🎮"}
            </div>
            <div>
              <div style={{fontSize:15, fontWeight:800, color:"white"}}>{user.name}</div>
              <div style={{fontSize:11, color:"rgba(255,255,255,0.45)"}}>🏆 {myData.wins||0} wins · 🪙 {myData.coins||0}</div>
            </div>
          </div>
          <button onClick={props.onLogout} style={{...ST.btnSm, fontSize:11}}>Logout</button>
        </div>

        {/* New game */}
        <div style={ST.card2}>
          <div style={{fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.7)", marginBottom:12}}>🎮 New Game</div>
          <div style={{fontSize:11, color:"rgba(255,255,255,0.5)", marginBottom:8}}>Number of players</div>
          <div style={{display:"flex", gap:6, marginBottom:12}}>
            {[2,3,4].map(function(n){
              return (
                <button key={n} onClick={function(){ setCount(n); }}
                  style={{
                    flex:1, padding:"10px 0", borderRadius:10, border:"none", cursor:"pointer",
                    fontWeight:700, fontSize:14, transition:"all 0.2s",
                    background: count===n ? "linear-gradient(135deg,#FFD700,#FFA000)" : "rgba(255,255,255,0.09)",
                    color: count===n ? "#000" : "rgba(255,255,255,0.7)",
                    boxShadow: count===n ? "0 4px 12px rgba(255,215,0,0.3)" : "none",
                  }}>
                  {n}P
                </button>
              );
            })}
          </div>
          <button onClick={createRoom} style={{
            ...ST.btn, width:"100%",
            background:"linear-gradient(135deg,#FFD700,#FF8F00)", color:"#000", fontWeight:900,
          }}>
            ✨ Create Room
          </button>
        </div>

        {/* Invite friends */}
        <button onClick={props.onInvite} style={{
          ...ST.btn, width:"100%",
          background:"linear-gradient(135deg,#1E88E5,#0D47A1)",
        }}>
          👥 Join / Invite Friends
        </button>

        {/* Active rooms */}
        {myRooms.length > 0 && (
          <div style={ST.card2}>
            <div style={{fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.6)", marginBottom:10}}>🔄 Rejoin Active Room</div>
            {myRooms.map(function(r){
              return (
                <div key={r.id} onClick={function(){ props.onJoin(r); }}
                  style={{
                    display:"flex", alignItems:"center", justifyContent:"space-between",
                    padding:"10px 12px", borderRadius:10, cursor:"pointer",
                    background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", marginBottom:6,
                  }}>
                  <div>
                    <div style={{fontSize:13, fontWeight:700, color:"white"}}>Room #{r.code}</div>
                    <div style={{fontSize:11, color:"rgba(255,255,255,0.4)"}}>
                      {r.players.length}/{r.maxPlayers} players · {r.status}
                    </div>
                  </div>
                  <span style={{fontSize:11, color:"#FFD700", fontWeight:700}}>Rejoin →</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Tips */}
        <div style={{...ST.card2, opacity:0.7}}>
          <div style={{fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.5)", marginBottom:8}}>👑 Royal Rules</div>
          {[
            "4 royal pieces each — 👑Raja, 👸Rani, 🎩Manthiri, ⚔️Chipai — rank decides who can strike whom",
            "Safe ⭐ cells block captures — except a 👑Raja may always strike a 👸Rani",
            "Captures swap places instead of sending a piece home",
            "Roll 6 to bring a piece out of the yard · get all 4 to center to win",
          ].map(function(t,i){
            return (
              <div key={i} style={{display:"flex", gap:8, marginBottom:5, alignItems:"flex-start"}}>
                <span style={{fontSize:11, color:"#FFD700", fontWeight:900}}>{i+1}.</span>
                <span style={{fontSize:11, color:"rgba(255,255,255,0.55)", lineHeight:1.4}}>{t}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  INVITE SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function InviteScreen(props) {
  var user = props.user;
  var [code,       setCode]      = useState("");
  var [err,        setErr]       = useState("");
  var [ok,         setOk]        = useState("");
  var [myRooms,    setMyRooms]   = useState([]);
  var [pendingInv, setPendingInv]= useState([]);
  var [selRoom,    setSelRoom]   = useState("");
  var [friendName, setFriendName]= useState("");

  useEffect(function() {
    function refresh() {
      var all = lsGet("ludo_rooms", {});
      var vals = Object.values(all);
      setMyRooms(vals.filter(function(r){ return r.host===user.id && r.status==="waiting"; }));
      setPendingInv(vals.filter(function(r){
        return Array.isArray(r.invites) && r.invites.some(function(inv){ return inv.toId===user.id && inv.status==="pending"; });
      }));
    }
    refresh();
    var t = setInterval(refresh, 1500);
    return function(){ clearInterval(t); };
  }, [user.id]);

  function joinByCode() {
    setErr(""); setOk("");
    var all = lsGet("ludo_rooms", {});
    var vals = Object.values(all);
    var found = null;
    for (var i=0;i<vals.length;i++) { if(vals[i].code===code.trim()){ found=vals[i]; break; } }
    if (!found) { setErr("Room not found! Check the code."); return; }
    if (found.status !== "waiting") { setErr("Game already started."); return; }
    if (found.players.some(function(p){ return p.id===user.id; })) { props.onJoin(found); return; }
    if (found.players.length >= found.maxPlayers) { setErr("Room is full!"); return; }
    var usedColors = found.players.map(function(p){ return p.color; });
    var freeColor = PKEYS.find(function(c){ return !usedColors.includes(c); }) || "red";
    found.players.push({ id:user.id, name:user.name, avatar:user.avatar, gender:user.gender||"boy", color:freeColor, ready:false });
    all[found.id] = found;
    lsSet("ludo_rooms", all);
    props.onJoin(found);
  }

  function sendInvite() {
    setErr(""); setOk("");
    if (!selRoom) { setErr("Select a room first"); return; }
    if (!friendName.trim()) { setErr("Enter friend's username"); return; }
    var users = lsGet("ludo_users", {});
    var toUser = users[friendName.trim().toLowerCase()];
    if (!toUser) { setErr("User not found"); return; }
    var all = lsGet("ludo_rooms", {});
    var r = all[selRoom];
    if (!r) { setErr("Room not found"); return; }
    if (!Array.isArray(r.invites)) r.invites = [];
    var alreadySent = r.invites.some(function(inv){ return inv.toId===toUser.id && inv.status==="pending"; });
    if (alreadySent) { setErr("Invite already sent!"); return; }
    r.invites.push({ fromId:user.id, fromName:user.name, toId:toUser.id, toName:toUser.name, status:"pending" });
    all[selRoom] = r;
    lsSet("ludo_rooms", all);
    setOk("✅ Invite sent to " + toUser.name + "!");
    setFriendName("");
  }

  function acceptInvite(room) {
    var all = lsGet("ludo_rooms", {});
    var r = all[room.id];
    if (!r) { setErr("Room no longer exists"); return; }
    r.invites = r.invites.map(function(inv){
      return inv.toId===user.id && inv.status==="pending" ? Object.assign({},inv,{status:"accepted"}) : inv;
    });
    if (!r.players.some(function(p){ return p.id===user.id; })) {
      var usedColors = r.players.map(function(p){ return p.color; });
      var freeColor = PKEYS.find(function(c){ return !usedColors.includes(c); }) || "blue";
      r.players.push({ id:user.id, name:user.name, avatar:user.avatar, gender:user.gender||"boy", color:freeColor, ready:false });
    }
    all[r.id] = r;
    lsSet("ludo_rooms", all);
    props.onJoin(r);
  }

  var allUsers = Object.values(lsGet("ludo_users", {})).filter(function(u){ return u.id!==user.id; });

  return (
    <div style={{...ST.page, justifyContent:"flex-start"}}>
      <style>{GCSS}</style>
      <div style={{width:"100%", maxWidth:400, padding:"12px 14px", display:"flex", flexDirection:"column", gap:12}}>

        <div style={{display:"flex", alignItems:"center", gap:12, paddingTop:8}}>
          <button onClick={props.onBack} style={ST.btnSm}>← Back</button>
          <div style={{fontSize:17, fontWeight:800, color:"white"}}>👥 Friends & Rooms</div>
        </div>

        <div style={ST.card2}>
          <div style={{fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.6)", marginBottom:10}}>🔢 Join by Room Code</div>
          <div style={{display:"flex", gap:8}}>
            <input
              value={code} maxLength={6}
              onChange={function(e){ setCode(e.target.value.replace(/\D/g,"")); }}
              placeholder="6-digit code" onKeyDown={function(e){ if(e.key==="Enter") joinByCode(); }}
              style={{...ST.input, flex:1, letterSpacing:5, fontSize:20, fontWeight:900, textAlign:"center"}}
            />
            <button onClick={joinByCode} style={{...ST.btn, padding:"0 18px", fontSize:13}}>Join</button>
          </div>
          {err ? <div style={{color:"#FF6B6B", fontSize:12, marginTop:8, fontWeight:600}}>{err}</div> : null}
          {ok  ? <div style={{color:"#69F0AE", fontSize:12, marginTop:8, fontWeight:600}}>{ok}</div>  : null}
        </div>

        {pendingInv.length > 0 && (
          <div style={ST.card2}>
            <div style={{fontSize:12, fontWeight:700, color:"#FFD700", marginBottom:10}}>🔔 Incoming Invites ({pendingInv.length})</div>
            {pendingInv.map(function(room) {
              var inv = room.invites.find(function(i){ return i.toId===user.id && i.status==="pending"; });
              if (!inv) return null;
              return (
                <div key={room.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                  padding:"10px 12px",borderRadius:10,
                  background:"rgba(255,215,0,0.1)",border:"1px solid rgba(255,215,0,0.3)",marginBottom:8}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:"white"}}>From: {inv.fromName}</div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.45)"}}>Room #{room.code} · {room.players.length}/{room.maxPlayers}</div>
                  </div>
                  <button onClick={function(){ acceptInvite(room); }}
                    style={{...ST.btnSm,background:"linear-gradient(135deg,#43A047,#1B5E20)",padding:"8px 14px"}}>
                    ✅ Accept
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {myRooms.length > 0 && (
          <div style={ST.card2}>
            <div style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.6)",marginBottom:10}}>📤 Invite to Your Room</div>
            <select value={selRoom} onChange={function(e){ setSelRoom(e.target.value); }}
              style={{...ST.input, marginBottom:10}}>
              <option value="">-- Select your room --</option>
              {myRooms.map(function(r){
                return <option key={r.id} value={r.id}>Room #{r.code} ({r.players.length}/{r.maxPlayers})</option>;
              })}
            </select>
            {selRoom && (
              <div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.45)",marginBottom:8}}>
                  Code: <span style={{color:"#FFD700",fontWeight:900,fontSize:18,letterSpacing:4}}>
                    {(myRooms.find(function(r){ return r.id===selRoom; })||{}).code}
                  </span>
                </div>
                <div style={{display:"flex",gap:8,marginBottom:10}}>
                  <input value={friendName} onChange={function(e){ setFriendName(e.target.value); }}
                    placeholder="Friend's username"
                    style={{...ST.input,flex:1}}
                    onKeyDown={function(e){ if(e.key==="Enter") sendInvite(); }}
                  />
                  <button onClick={sendInvite} style={{...ST.btn,padding:"0 16px",fontSize:13}}>Send</button>
                </div>
                {allUsers.length > 0 && (
                  <div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginBottom:6}}>Tap to invite:</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                      {allUsers.map(function(u){
                        return (
                          <div key={u.id} onClick={function(){ setFriendName(u.name); }}
                            style={{padding:"5px 10px",borderRadius:18,
                              background:"rgba(255,255,255,0.09)",border:"1px solid rgba(255,255,255,0.18)",
                              fontSize:12,color:"white",cursor:"pointer",
                              display:"flex",alignItems:"center",gap:5}}>
                            {u.avatar||"🎮"} {u.name}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div style={ST.card2}>
          <div style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.6)",marginBottom:10}}>
            🌐 All Players ({allUsers.length + 1})
          </div>
          {[user].concat(allUsers).map(function(u){
            return (
              <div key={u.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:8,background:"rgba(255,255,255,0.05)",marginBottom:5}}>
                <div style={{width:34,height:34,borderRadius:8,background:"rgba(255,215,0,0.15)",
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>
                  {u.avatar||"🎮"}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:"white"}}>{u.name} {u.id===user.id?"(You)":""}</div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.4)"}}>🏆 {u.wins||0} wins</div>
                </div>
                {u.id!==user.id && <div style={{width:8,height:8,borderRadius:"50%",background:"#4CAF50"}}/>}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GAME SCREEN  (waiting room + board)
// ═══════════════════════════════════════════════════════════════════════════════
function GameScreen(props) {
  var user    = props.user;
  var [room,  setRoom]  = useState(props.initRoom);
  var [phase, setPhase] = useState("lobby");
  var [G,     setG]     = useState(null);
  var syncRef = useRef(null);
  var isHost  = room && room.host === user.id;

  useEffect(function() {
    syncRef.current = setInterval(function() {
      var all = lsGet("ludo_rooms", {});
      var r = all[room && room.id];
      if (!r) return;
      setRoom(r);
      if (r.status === "playing" && r.gameState) {
        setG(function(prev) {
          if (!prev) { setPhase("playing"); return r.gameState; }
          if (r.gameState.turn !== prev.turn) { setPhase("playing"); return r.gameState; }
          var prevStr = JSON.stringify(prev.tokens);
          var nextStr = JSON.stringify(r.gameState.tokens);
          if (prevStr !== nextStr) { setPhase("playing"); return r.gameState; }
          return prev;
        });
        setPhase("playing");
      }
    }, 700);
    return function(){ clearInterval(syncRef.current); };
  }, [room && room.id]);

  function pushG(newG) {
    var all = lsGet("ludo_rooms", {});
    var r = all[room.id];
    if (!r) return;
    r.gameState = newG;
    all[room.id] = r;
    lsSet("ludo_rooms", all);
  }

  function setReady() {
    var all = lsGet("ludo_rooms", {});
    var r = all[room.id];
    if (!r) return;
    r.players = r.players.map(function(p){ return p.id===user.id ? Object.assign({},p,{ready:true}) : p; });
    all[room.id] = r;
    lsSet("ludo_rooms", all);
    setRoom(r);
  }

  function startGame() {
    var all = lsGet("ludo_rooms", {});
    var r = all[room.id];
    if (!r) return;
    var colors = PKEYS.slice(0, r.maxPlayers);
    var filled = r.players.slice(0, r.maxPlayers).map(function(p,i){ return Object.assign({},p,{color:colors[i],ready:true}); });
    while (filled.length < r.maxPlayers) {
      var ci = filled.length;
      filled.push({ id:"bot_"+ci, name:"Bot "+(ci+1), avatar:"🤖", gender:"boy", color:colors[ci], ready:true, isBot:true });
    }
    r.players = filled;
    var gs = initGameState(filled);
    r.status = "playing"; r.gameState = gs;
    all[room.id] = r;
    lsSet("ludo_rooms", all);
    setRoom(r); setG(gs); setPhase("playing");
  }

  function handleSetG(newG) { setG(newG); pushG(newG); }

  if (phase === "playing" && G) {
    return <BoardGame G={G} setG={handleSetG} user={user} players={room.players} onExit={props.onExit} />;
  }

  var allReady = room && room.players.every(function(p){ return p.ready; });

  return (
    <div style={{...ST.page, justifyContent:"flex-start"}}>
      <style>{GCSS}</style>
      <div style={{width:"100%", maxWidth:400, padding:"12px 14px", display:"flex", flexDirection:"column", gap:12}}>

        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", paddingTop:8}}>
          <button onClick={props.onExit} style={ST.btnSm}>← Lobby</button>
          <div style={{fontSize:16, fontWeight:800, color:"white"}}>🎮 Waiting Room</div>
          <div style={{fontSize:12, color:"rgba(255,255,255,0.4)"}}>
            {room && room.players.length}/{room && room.maxPlayers}
          </div>
        </div>

        <div style={{...ST.card2, textAlign:"center"}}>
          <div style={{fontSize:11, color:"rgba(255,255,255,0.45)", marginBottom:4}}>Share this code with friends</div>
          <div style={{fontSize:42, fontWeight:900, color:"#FFD700", letterSpacing:9, textShadow:"0 0 20px rgba(255,215,0,0.4)"}}>
            {room && room.code}
          </div>
          <button onClick={function(){ if(navigator.clipboard) navigator.clipboard.writeText(room.code); }}
            style={{...ST.btnSm, marginTop:8, background:"rgba(255,215,0,0.12)", border:"1px solid rgba(255,215,0,0.35)", color:"#FFD700"}}>
            📋 Copy Code
          </button>
        </div>

        <div style={ST.card2}>
          <div style={{fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.6)", marginBottom:12}}>
            👥 Players ({room && room.players.length}/{room && room.maxPlayers})
          </div>
          {PKEYS.slice(0, room && room.maxPlayers).map(function(c, i) {
            var p = room && room.players[i];
            return (
              <div key={c} style={{display:"flex", alignItems:"center", gap:10,
                padding:"10px 12px", borderRadius:10, marginBottom:6,
                background:"linear-gradient(135deg,"+PAL[c].dark+"44,"+PAL[c].main+"22)",
                border:"1.5px solid "+(p ? PAL[c].mid : "rgba(255,255,255,0.08)"),
                transition:"all 0.3s"}}>
                <div style={{width:40, height:40, borderRadius:10,
                  background: p ? "linear-gradient(135deg,"+PAL[c].dark+","+PAL[c].main+")" : "rgba(255,255,255,0.05)",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:22,
                  border:"2px solid "+(p ? PAL[c].light : "rgba(255,255,255,0.08)")}}>
                  {p ? p.avatar : "⏳"}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14, fontWeight:700, color: p ? "white" : "rgba(255,255,255,0.3)"}}>
                    {p ? p.name : "Waiting..."}
                  </div>
                  <div style={{fontSize:11, color:PAL[c].light}}>{PEMOJI[c]} {PNAMES[c]}</div>
                </div>
                {p && (
                  <div style={{padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                    background: p.ready ? "rgba(76,175,80,0.2)" : "rgba(255,152,0,0.2)",
                    border:"1px solid "+(p.ready ? "#4CAF50" : "#FF9800"),
                    color: p.ready ? "#69F0AE" : "#FFB74D"}}>
                    {p.ready ? "✅ Ready" : "⏳ Waiting"}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!room.players.find(function(p){ return p.id===user.id&&p.ready; }) && (
          <button onClick={setReady} style={{...ST.btn, width:"100%", background:"linear-gradient(135deg,#43A047,#1B5E20)"}}>
            ✅ I'm Ready!
          </button>
        )}

        {isHost && (
          <button onClick={startGame}
            disabled={!allReady && room.players.length < 2}
            style={{
              ...ST.btn, width:"100%",
              background: allReady ? "linear-gradient(135deg,#FFD700,#FF8F00)" : "rgba(255,255,255,0.1)",
              color: allReady ? "#000" : "rgba(255,255,255,0.4)",
              cursor: allReady ? "pointer" : "not-allowed",
            }}>
            {allReady ? "🚀 Start Game!" : "⏳ Waiting for players..."}
          </button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  BOARD GAME
// ═══════════════════════════════════════════════════════════════════════════════
function BoardGame(props) {
  var G           = props.G;
  var setG        = props.setG;
  var user        = props.user;
  var players     = props.players;
  var playerOrder = G.playerOrder || PKEYS;
  var currentColor= playerOrder[G.turn];
  var myPlayer    = players.find(function(p){ return p.id===user.id; });
  var isMyTurn    = myPlayer && myPlayer.color === currentColor;

  // Build player map for avatar lookup
  var playerByColor = {};
  players.forEach(function(p){ playerByColor[p.color] = p; });

  function roll() {
    if (G.rolled || G.rolling || !isMyTurn) return;
    setG(Object.assign({}, G, { rolling:true, dice:null }));
    var count = 0;
    var iv = setInterval(function() {
      count++;
      var faceVal = Math.floor(Math.random()*6)+1;
      setG(function(prev){ return Object.assign({},prev,{dice:faceVal}); });
      if (count >= 7) {
        clearInterval(iv);
        var finalVal = Math.floor(Math.random()*6)+1;
        setG(function(prev) {
          var movable = getMovable(prev.tokens[currentColor]||[], finalVal, currentColor);
          if (movable.length === 0) {
            var nx = (prev.turn+1)%prev.playerOrder.length;
            var nc = prev.playerOrder[nx];
            return Object.assign({},prev,{
              dice:finalVal, rolling:false, rolled:false, sel:[], turn:nx,
              msg:(PEMOJI[nc]||"🎮")+" "+PNAMES[nc]+"'s turn! (No moves for "+PNAMES[currentColor]+")",
            });
          }
          return Object.assign({},prev,{
            dice:finalVal, rolling:false, rolled:true, sel:movable,
            msg:"🎯 Move a piece! (Rolled "+finalVal+")",
          });
        });
      }
    }, 60);
  }

  function doMove(ti) {
    setG(function(prev) {
      var c       = prev.playerOrder[prev.turn];
      var d       = prev.dice;
      var cut     = false;
      var nt      = Object.assign({}, prev.tokens);
      var prevPos = prev.tokens[c][ti].pos;

      nt[c] = prev.tokens[c].map(function(t, i) {
        if (i !== ti) return t;
        if (t.pos === -1 && d === 6) return { pos:1 };
        return { pos: Math.min(t.pos + d, 59) };
      });

      var moved        = nt[c][ti];
      var attackerRole = ROLE_BY_INDEX[ti];
      var captures     = [];

      if (moved.pos >= 1 && moved.pos <= 52) {
        var gi   = getGlobalIdx(c, moved.pos);
        var safe = SAFE_IDX.has(gi);
        var cell = getCell(c, moved.pos);
        // Where the attacker stood before this move — a captured piece swaps
        // onto this spot instead of being sent all the way back to its yard.
        var swapGi = (prevPos >= 1 && prevPos <= 52) ? getGlobalIdx(c, prevPos) : null;

        prev.playerOrder.forEach(function(oc) {
          if (oc === c || !nt[oc]) return;
          nt[oc] = nt[oc].map(function(t, tj) {
            if (t.pos < 1 || t.pos > 52) return t;
            var oc_cell = getCell(oc, t.pos);
            if (!(oc_cell && cell && oc_cell[0] === cell[0] && oc_cell[1] === cell[1])) return t;

            var defenderRole = ROLE_BY_INDEX[tj];
            // 👑 Royal Strike — a Raja may always capture a Rani, safe cell or not.
            var royalStrike = attackerRole === "raja" && defenderRole === "rani";
            // Otherwise: no captures on safe cells, and a piece can only
            // strike pieces of equal or lower rank.
            var allowed = royalStrike || (!safe && RANK[attackerRole] >= RANK[defenderRole]);
            if (!allowed) return t;

            cut = true;
            captures.push({ color:oc, role:defenderRole, royal:royalStrike });
            // Position-swap: the captured piece lands where the attacker came
            // from, rather than being sent home — unless the attacker itself
            // just left its yard, in which case there's nowhere to swap to.
            return swapGi !== null ? { pos: globalIdxToPos(oc, swapGi) } : { pos:-1 };
          });
        });
      }

      var won  = nt[c].every(function(t){ return t.pos===59; });
      var nw   = won && !prev.winners.includes(c) ? prev.winners.concat([c]) : prev.winners;
      var bonus= d===6 || cut;
      var nx   = bonus ? prev.turn : (prev.turn+1)%prev.playerOrder.length;
      var nc   = prev.playerOrder[nx];

      var capMsg = "";
      if (cut) {
        var first = captures[0];
        capMsg = first.royal
          ? "👑 Royal Strike! "+PNAMES[c]+"'s Raja struck down the Rani!"
          : "✂️ "+ROLE_EMOJI[attackerRole]+" "+ROLE_NAME[attackerRole]+" swapped places with "+ROLE_EMOJI[first.role]+" "+ROLE_NAME[first.role]+"!";
      }

      var msg = won     ? "🏆 "+PNAMES[c]+" WINS!"
              : cut     ? capMsg+" Bonus 🎲"
              : bonus   ? PEMOJI[c]+" "+PNAMES[c]+" rolled 6! Again!"
              : (PEMOJI[nc]||"🎮")+" "+PNAMES[nc]+"'s turn!";

      return Object.assign({},prev,{
        tokens:nt, turn:nx, dice:bonus?prev.dice:null,
        rolled:false, rolling:false, sel:[], winners:nw, cutMsg:cut?"✂️":null, msg:msg,
      });
    });
  }

  function handleClick(c, i) {
    if (c!==currentColor || !G.rolled || G.rolling || !isMyTurn) return;
    if (G.sel && G.sel.includes(i)) doMove(i);
  }

  // Build cell/yard maps
  var cellMap = {};
  var yardOf  = {};
  playerOrder.forEach(function(c){ yardOf[c]=[]; });
  playerOrder.forEach(function(c) {
    var toks = G.tokens[c];
    if (!toks) return;
    toks.forEach(function(t, i) {
      if (t.pos<=0 || t.pos===59) {
        if (t.pos===-1) yardOf[c].push(i);
        return;
      }
      var cell = getCell(c, t.pos);
      if (!cell) return;
      var k = cell[0]+","+cell[1];
      if (!cellMap[k]) cellMap[k]=[];
      cellMap[k].push({ c:c, i:i, sel: c===currentColor && G.sel && G.sel.includes(i) });
    });
  });

  function cellBg(r, cc) {
    var b;
    for (var col in YARD_BOUNDS) {
      b = YARD_BOUNDS[col];
      if (r>=b.r0 && r<=b.r1 && cc>=b.c0 && cc<=b.c1) return PAL[col].main;
    }
    for (var col2 in HOME_LANE) {
      var lane = HOME_LANE[col2];
      for (var li=0;li<lane.length;li++) {
        if (lane[li][0]===r && lane[li][1]===cc) return PAL[col2].pale;
      }
    }
    if (r>=6 && r<=8 && cc>=6 && cc<=8) return "transparent";
    var pi=-1;
    for (var pi2=0;pi2<P52.length;pi2++){ if(P52[pi2][0]===r&&P52[pi2][1]===cc){pi=pi2;break;} }
    if (pi!==-1) return SAFE_IDX.has(pi) ? "#E8F5E9" : "#FFFFFF";
    return "#D0D0D0";
  }

  function homeLaneColor(r, cc) {
    for (var col in HOME_LANE) {
      var lane = HOME_LANE[col];
      for (var li=0;li<lane.length;li++) {
        if (lane[li][0]===r && lane[li][1]===cc) return col;
      }
    }
    return null;
  }

  // ── Dice component with dot faces ────────────────────────────────────────────
  var DICE_DOTS = {
    1:[[50,50]],
    2:[[28,28],[72,72]],
    3:[[25,25],[50,50],[75,75]],
    4:[[28,28],[72,28],[28,72],[72,72]],
    5:[[25,25],[75,25],[50,50],[25,75],[75,75]],
    6:[[28,20],[72,20],[28,50],[72,50],[28,80],[72,80]],
  };

  function DiceComp(dprops) {
    var v=dprops.v; var sz=dprops.sz||52; var col=dprops.col;
    if (!v) return <div style={{fontSize:sz*0.85,lineHeight:1,filter:"drop-shadow(0 3px 6px rgba(0,0,0,0.5))"}}>🎲</div>;
    var dc = PAL[col] ? PAL[col].mid : "#333";
    return (
      <svg width={sz} height={sz} viewBox="0 0 100 100"
        style={{filter:"drop-shadow(0 4px 8px rgba(0,0,0,0.5))",animation:G.rolling?"none":"diceLand 0.25s ease"}}>
        <rect x="4" y="4" width="92" height="92" rx="20" fill="white" stroke="#ddd" strokeWidth="1.5"/>
        {(DICE_DOTS[v]||[]).map(function(dot,idx){
          return <circle key={idx} cx={dot[0]} cy={dot[1]} r="9" fill={dc}/>;
        })}
      </svg>
    );
  }

  // ── Pin Token (on board) — shows player avatar inside + dice value when selected ──
  function PinToken(tprops) {
    var col=tprops.col; var sz=tprops.sz||22; var sel=tprops.sel;
    var onClick=tprops.onClick; var playerAvatar=tprops.playerAvatar;
    var roleEmoji=tprops.roleEmoji;
    var faceEmoji=roleEmoji||playerAvatar;
    var diceVal=tprops.diceVal;
    var p = PAL[col] || PAL.red;
    var gid = "rg_"+col+"_"+sz;
    return (
      <div style={{position:"relative", display:"inline-flex", alignItems:"flex-end", justifyContent:"center",
        cursor:sel?"pointer":"default",
        filter:sel?"drop-shadow(0 0 5px gold)":"drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
        animation:sel?"pinBob 0.5s ease-in-out infinite alternate":"none",
        flexShrink:0,
      }} onClick={onClick}>
        <svg width={sz} height={sz*1.42} viewBox="0 0 40 56">
          <defs>
            <radialGradient id={gid} cx="38%" cy="28%" r="72%">
              <stop offset="0%" stopColor={p.light}/>
              <stop offset="55%" stopColor={p.mid}/>
              <stop offset="100%" stopColor={p.dark}/>
            </radialGradient>
            <clipPath id={"cp_"+gid}>
              <circle cx="20" cy="17" r="13"/>
            </clipPath>
          </defs>
          <ellipse cx="20" cy="53" rx="7" ry="2.5" fill="rgba(0,0,0,0.22)"/>
          <circle cx="20" cy="17" r="16" fill={"url(#"+gid+")"}/>
          <path d="M10,29 Q20,53 30,29" fill={"url(#"+gid+")"}/>
          {/* Role/avatar face inside pin */}
          {faceEmoji && sz >= 14 && (
            <text x="20" y="22" textAnchor="middle" fontSize={sz>=20?"12":"8"} clipPath={"url(#cp_"+gid+")"}>
              {faceEmoji}
            </text>
          )}
          {!faceEmoji && (
            <>
              <circle cx="20" cy="17" r="9" fill="rgba(0,0,0,0.18)"/>
              <circle cx="20" cy="17" r="6" fill={p.dark} opacity="0.65"/>
              <ellipse cx="14" cy="11" rx="3.5" ry="2.5" fill="rgba(255,255,255,0.5)" transform="rotate(-25 14 11)"/>
            </>
          )}
          {sel && <circle cx="20" cy="17" r="16" fill="none" stroke="gold" strokeWidth="2.5" strokeDasharray="4,3"/>}
        </svg>
        {/* Dice value bubble on selected token */}
        {sel && diceVal && (
          <div style={{
            position:"absolute", top:-10, right:-8,
            width:16, height:16, borderRadius:"50%",
            background:"linear-gradient(135deg,#FFD700,#FF8F00)",
            border:"1.5px solid white",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:9, fontWeight:900, color:"#000",
            boxShadow:"0 2px 6px rgba(0,0,0,0.4)",
            zIndex:10,
          }}>
            {diceVal}
          </div>
        )}
      </div>
    );
  }

  // ── Yard token (in home yard) ──────────────────────────────────────────────
  function YardTok(yprops) {
    var col=yprops.col; var sz=yprops.sz||28; var sel=yprops.sel;
    var fin=yprops.fin; var onClick=yprops.onClick; var playerAvatar=yprops.playerAvatar;
    var roleEmoji=yprops.roleEmoji;
    var faceEmoji=roleEmoji||playerAvatar;
    var diceVal=yprops.diceVal;
    var p = PAL[col] || PAL.red;
    return (
      <div style={{position:"relative", display:"inline-flex"}}>
        <div onClick={onClick} style={{
          width:sz, height:sz, borderRadius:"50%", flexShrink:0,
          background: fin
            ? "radial-gradient(circle at 35% 30%,#FFE57F,#FFD700,#FFA000)"
            : "radial-gradient(circle at 35% 30%,"+p.light+","+p.mid+" 55%,"+p.dark+")",
          border:(sz>25?"3":"2")+"px solid "+(sel?"gold":fin?"#DAA520":"rgba(255,255,255,0.7)"),
          boxShadow: sel
            ? "0 0 14px gold,0 0 6px rgba(255,215,0,0.6),0 4px 8px rgba(0,0,0,0.4)"
            : "0 3px 8px rgba(0,0,0,0.4),inset 0 2px 4px rgba(255,255,255,0.25)",
          cursor: sel ? "pointer" : "default",
          animation: sel ? "pulsate 0.55s ease-in-out infinite alternate" : "none",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize: fin ? sz*0.4 : sz*0.55, position:"relative", overflow:"hidden",
        }}>
          {fin ? <span>✓</span> : (
            faceEmoji
              ? <span style={{fontSize:sz*0.52, lineHeight:1}}>{faceEmoji}</span>
              : <div style={{position:"absolute",top:"14%",left:"20%",width:"26%",height:"20%",
                  background:"rgba(255,255,255,0.5)",borderRadius:"50%",transform:"rotate(-30deg)"}}/>
          )}
        </div>
        {/* Dice value bubble */}
        {sel && diceVal && (
          <div style={{
            position:"absolute", top:-8, right:-6,
            width:15, height:15, borderRadius:"50%",
            background:"linear-gradient(135deg,#FFD700,#FF8F00)",
            border:"1.5px solid white",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:8, fontWeight:900, color:"#000",
            boxShadow:"0 2px 6px rgba(0,0,0,0.4)",
            zIndex:10,
          }}>
            {diceVal}
          </div>
        )}
      </div>
    );
  }

  var SZ  = "min(96vw, 460px)";
  var CP  = (100/15)+"%";
  var pOrder = G.playerOrder || PKEYS;

  return (
    <div style={{...ST.page, justifyContent:"flex-start", paddingBottom:14}}>
      <style>{GCSS}</style>

      {/* Header bar */}
      <div style={{width:"100%", maxWidth:SZ, display:"flex", alignItems:"center",
        justifyContent:"space-between", padding:"8px 10px 4px"}}>
        <button onClick={props.onExit} style={{...ST.btnSm, fontSize:11}}>✕ Exit</button>
        <div key={G.msg} style={{
          background:"linear-gradient(135deg,"+(PAL[currentColor]||PAL.red).dark+"dd,"+(PAL[currentColor]||PAL.red).main+"99)",
          border:"1.5px solid "+(PAL[currentColor]||PAL.red).mid,
          borderRadius:14, padding:"5px 14px",
          color:"white", fontSize:12, fontWeight:700,
          animation:"msgPop 0.3s ease", textAlign:"center", maxWidth:200,
        }}>{G.msg}</div>
        <div style={{fontSize:11, color:"rgba(255,255,255,0.5)", minWidth:52, textAlign:"right"}}>
          {isMyTurn ? "Your turn!" : "Wait..."}
        </div>
      </div>

      {/* Royal piece legend */}
      <div style={{display:"flex", gap:10, justifyContent:"center", padding:"2px 0 6px",
        fontSize:10, color:"rgba(255,255,255,0.5)", flexWrap:"wrap"}}>
        {ROLE_BY_INDEX.map(function(role){
          return (
            <span key={role} style={{display:"flex", alignItems:"center", gap:3}}>
              <span style={{fontSize:13}}>{ROLE_EMOJI[role]}</span>{ROLE_NAME[role]}
            </span>
          );
        })}
      </div>

      {/* BOARD */}
      <div style={{position:"relative", width:SZ, height:SZ, maxWidth:"96vw", maxHeight:"96vw",
        borderRadius:10, border:"3px solid rgba(255,215,0,0.5)", overflow:"hidden",
        boxShadow:"0 0 0 5px rgba(255,215,0,0.1),0 12px 40px rgba(0,0,0,0.6)",
        background:"#BDBDBD", margin:"2px auto"}}>

        {Array.from({length:15}, function(_,r) {
          return Array.from({length:15}, function(_,c) {
            var bg  = cellBg(r,c);
            var k   = r+","+c;
            var tks = cellMap[k] || [];
            var pi  = -1;
            for (var x=0;x<P52.length;x++){if(P52[x][0]===r&&P52[x][1]===c){pi=x;break;}}
            var isSafe = pi!==-1 && SAFE_IDX.has(pi);
            var hlCol  = homeLaneColor(r,c);

            return (
              <div key={k} style={{position:"absolute",
                left:((c/15)*100)+"%", top:((r/15)*100)+"%",
                width:CP, height:CP, background:bg,
                border:"0.5px solid rgba(0,0,0,0.07)",
                display:"flex", alignItems:"center", justifyContent:"center",
                overflow:"visible", zIndex:1}}>
                {hlCol && <div style={{position:"absolute",inset:0,zIndex:0,
                  background:"linear-gradient("+(hlCol==="red"||hlCol==="yellow"?"90deg":"180deg")+","+(PAL[hlCol]||PAL.red).pale+","+(PAL[hlCol]||PAL.red).light+")"}}/>}
                {isSafe && tks.length===0 && <span style={{fontSize:10,opacity:0.35,zIndex:1}}>★</span>}
                <div style={{position:"absolute",zIndex:5,display:"flex",flexWrap:"wrap",
                  alignItems:"center",justifyContent:"center",gap:1,width:"90%",height:"90%"}}>
                  {tks.slice(0,4).map(function(t,x) {
                    var sz = tks.length===1?22:tks.length===2?14:11;
                    var pl = playerByColor[t.c];
                    return <PinToken key={x} col={t.c} sz={sz} sel={t.sel}
                      playerAvatar={pl?pl.avatar:null}
                      roleEmoji={ROLE_EMOJI[ROLE_BY_INDEX[t.i]]}
                      diceVal={t.sel && G.rolled ? G.dice : null}
                      onClick={function(){ handleClick(t.c,t.i); }}/>;
                  })}
                </div>
              </div>
            );
          });
        })}

        {/* Yards */}
        {pOrder.map(function(c) {
          var b = YARD_BOUNDS[c];
          if (!b) return null;
          var inY    = yardOf[c] || [];
          var active = c === currentColor;
          var pal    = PAL[c] || PAL.red;
          var pl     = playerByColor[c];
          return (
            <div key={c} style={{position:"absolute",
              top:((b.r0/15)*100)+"%", left:((b.c0/15)*100)+"%",
              width:(((b.c1-b.c0+1)/15)*100)+"%", height:(((b.r1-b.r0+1)/15)*100)+"%",
              background:"linear-gradient(135deg,"+pal.dark+","+pal.main+")",
              border:"2.5px solid "+(active?"gold":pal.dark),
              boxShadow:active?"inset 0 0 20px rgba(255,215,0,0.35),0 0 18px rgba(255,215,0,0.6)":"none",
              display:"flex",alignItems:"center",justifyContent:"center",zIndex:2,transition:"box-shadow 0.3s"}}>
              <div style={{width:"72%",height:"72%",background:"rgba(255,255,255,0.93)",
                borderRadius:10,display:"grid",gridTemplateColumns:"1fr 1fr",gridTemplateRows:"1fr 1fr",
                gap:5,padding:5,boxShadow:"0 0 0 2.5px "+pal.mid+",inset 0 2px 6px rgba(0,0,0,0.1)"}}>
                {[0,1,2,3].map(function(i) {
                  var inYard = inY.includes(i);
                  var fin    = G.tokens[c] && G.tokens[c][i] && G.tokens[c][i].pos===59;
                  var sel    = c===currentColor && G.sel && G.sel.includes(i) && inYard && isMyTurn;
                  return (
                    <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {(inYard||fin) ? (
                        <YardTok col={c} sz={28} sel={sel} fin={fin}
                          playerAvatar={pl?pl.avatar:null}
                          roleEmoji={ROLE_EMOJI[ROLE_BY_INDEX[i]]}
                          diceVal={sel && G.rolled ? G.dice : null}
                          onClick={function(){ if(sel) handleClick(c,i); }}/>
                      ) : (
                        <div style={{width:26,height:26,borderRadius:"50%",border:"2px dashed "+pal.mid+"44",opacity:0.25}}/>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Center star */}
        <div style={{position:"absolute",
          top:((6/15)*100)+"%", left:((6/15)*100)+"%",
          width:((3/15)*100)+"%", height:((3/15)*100)+"%",
          zIndex:6, pointerEvents:"none"}}>
          <svg viewBox="0 0 90 90" width="100%" height="100%">
            <polygon points="45,45 0,0 90,0"   fill={PAL.red.main}/>
            <polygon points="45,45 90,0 90,90"  fill={PAL.yellow.main}/>
            <polygon points="45,45 90,90 0,90"  fill={PAL.blue.main}/>
            <polygon points="45,45 0,90 0,0"    fill={PAL.green.main}/>
            <circle cx="45" cy="45" r="17" fill="white" opacity="0.95"/>
            <text x="45" y="51" textAnchor="middle" fontSize="18">⭐</text>
          </svg>
        </div>
      </div>

      {/* Controls */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:20,padding:"10px 0 5px"}}>
        <div style={{animation:G.rolling?"rollSpin 0.13s infinite":"none"}}>
          <DiceComp v={G.dice} sz={50} col={currentColor}/>
        </div>
        <button onClick={roll} disabled={G.rolled||G.rolling||!isMyTurn}
          style={{padding:"12px 34px",fontSize:15,fontWeight:900,letterSpacing:1.5,
            color:(G.rolled||G.rolling||!isMyTurn)?"rgba(255,255,255,0.45)":"white",
            textTransform:"uppercase",
            background:(!isMyTurn||G.rolled||G.rolling)
              ? "rgba(255,255,255,0.1)"
              : "linear-gradient(135deg,"+(PAL[currentColor]||PAL.red).mid+","+(PAL[currentColor]||PAL.red).dark+")",
            border:"2px solid "+(!isMyTurn||G.rolled?"rgba(255,255,255,0.12)":"rgba(255,255,255,0.4)"),
            borderRadius:28, cursor:(!isMyTurn||G.rolled||G.rolling)?"not-allowed":"pointer",
            boxShadow:(!isMyTurn||G.rolled)?"none":"0 6px 18px "+(PAL[currentColor]||PAL.red).dark+"99",
            transition:"all 0.2s"}}>
          {G.rolling?"Rolling…":!isMyTurn?"Waiting…":G.rolled?"Select Piece":"Roll 🎲"}
        </button>
      </div>

      {/* Player pills */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center",paddingBottom:6,paddingTop:2}}>
        {pOrder.map(function(c,i) {
          var done   = G.tokens[c] ? G.tokens[c].filter(function(t){ return t.pos===59; }).length : 0;
          var active = i===G.turn;
          var won    = G.winners && G.winners.includes(c);
          var pl     = players.find(function(p){ return p.color===c; });
          var pal    = PAL[c]||PAL.red;
          return (
            <div key={c} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",
              background:active?"linear-gradient(135deg,"+pal.dark+","+pal.main+")":"rgba(255,255,255,0.08)",
              border:"1.5px solid "+(active?"gold":pal.mid),
              borderRadius:20,fontSize:11,fontWeight:700,color:"white",
              boxShadow:won?"0 0 14px gold":active?"0 4px 12px "+pal.dark+"99":"none",
              animation:won?"winGlow 1.5s infinite":"none",transition:"all 0.3s"}}>
              {/* Avatar in pill */}
              <span style={{fontSize:14}}>{pl?pl.avatar:PEMOJI[c]}</span>
              <span style={{maxWidth:50,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {pl?pl.name:PNAMES[c]}
              </span>
              <span style={{background:"rgba(255,255,255,0.18)",borderRadius:10,padding:"1px 5px",fontSize:10}}>
                {won?"🏆":done+"/4"}
              </span>
            </div>
          );
        })}
      </div>

      {G.winners && G.winners.length>0 && (
        <div style={{padding:"8px 22px",background:"rgba(255,215,0,0.15)",
          border:"2px solid gold",borderRadius:16,color:"#FFD700",
          fontSize:13,fontWeight:800,textAlign:"center",boxShadow:"0 0 24px rgba(255,215,0,0.3)"}}>
          🏆 {G.winners.map(function(w){
            var pl = players.find(function(p){ return p.color===w; });
            return (pl?pl.avatar+" "+pl.name:PNAMES[w]);
          }).join(" → ")}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ROOT APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  var saved = lsGet("ludo_session", null);
  var [screen, setScreen] = useState(saved ? "lobby" : "auth");
  var [user,   setUser]   = useState(saved);
  var [room,   setRoom]   = useState(null);

  function doLogin(u) { lsSet("ludo_session", u); setUser(u); setScreen("lobby"); }
  function doLogout()  { lsDel("ludo_session"); setUser(null); setRoom(null); setScreen("auth"); }
  function doJoin(r)   { setRoom(r); setScreen("game"); }

  if (screen === "auth")   return <AuthScreen onLogin={doLogin} />;
  if (screen === "lobby")  return <LobbyScreen user={user} onLogout={doLogout} onJoin={doJoin} onInvite={function(){ setScreen("invite"); }} />;
  if (screen === "invite") return <InviteScreen user={user} onBack={function(){ setScreen("lobby"); }} onJoin={doJoin} />;
  if (screen === "game")   return <GameScreen user={user} initRoom={room} onExit={function(){ setScreen("lobby"); }} />;
  return null;
}
