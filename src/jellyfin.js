// MikeyFlix: a deliberate LAN-only Jellyfin launcher.
// This is a destination picker, not a Jellyfin API client or streaming proxy.
// Never store credentials or tokens; never automatically contact a media server.
const MAX_URL=220;

function privateIPv4(hostname) {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) return false;
  const octets=hostname.split(".").map(Number);
  if (octets.some(n=>n>255)) return false;
  const [a,b]=octets;
  return a===10 || (a===172 && b>=16 && b<=31) ||
    (a===192 && b===168) || a===127;
}

function localHostname(hostname) {
  if (hostname==="localhost" || privateIPv4(hostname)) return true;
  // mDNS .local names are intended for a local network, not a public provider.
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+local$/.test(hostname);
}

export function parseJellyfinServer(raw) {
  if (typeof raw!=="string" || !raw.trim()) return {ok:false,error:"Enter your Jellyfin LAN address first."};
  if (raw.length>MAX_URL) return {ok:false,error:"The address is too long."};
  let url;
  try { url=new URL(raw.trim()); }
  catch { return {ok:false,error:"Use a full address, such as http://192.168.1.50:8096."}; }
  if (!["http:","https:"].includes(url.protocol)) return {ok:false,error:"Only HTTP or HTTPS Jellyfin addresses are supported."};
  if (url.username || url.password || url.search || url.hash || url.pathname!=="/")
    return {ok:false,error:"Enter only the server origin, without logins, paths, queries or tokens."};
  if (!localHostname(url.hostname.toLowerCase()))
    return {ok:false,error:"Use a private LAN IP, localhost or a .local hostname. Public servers are not supported here."};
  // Jellyfin's usual LAN port. Explicit custom ports and HTTPS origins are preserved.
  if (!url.port && url.protocol==="http:") url.port="8096";
  return {ok:true,url:url.origin};
}
