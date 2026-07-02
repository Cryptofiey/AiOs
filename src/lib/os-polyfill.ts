export function type() {
  return 'Browser';
}
export function release() {
  return '1.0.0';
}
export function platform() {
  return 'browser';
}
export function arch() {
  return 'x64';
}
export function homedir() {
  return '/';
}
export function tmpdir() {
  return '/tmp';
}
export function hostname() {
  return 'localhost';
}
export function networkInterfaces() {
  return {};
}
export function totalmem() {
  return 8 * 1024 * 1024 * 1024;
}
export function freemem() {
  return 4 * 1024 * 1024 * 1024;
}
export function cpus() {
  return [];
}
export function uptime() {
  return 0;
}
export function loadavg() {
  return [0, 0, 0];
}
export function endianness() {
  return 'LE';
}

const os = {
  type,
  release,
  platform,
  arch,
  homedir,
  tmpdir,
  hostname,
  networkInterfaces,
  totalmem,
  freemem,
  cpus,
  uptime,
  loadavg,
  endianness,
  default: {
    type,
    release,
    platform,
    arch,
    homedir,
    tmpdir,
    hostname,
    networkInterfaces,
    totalmem,
    freemem,
    cpus,
    uptime,
    loadavg,
    endianness
  }
};

(os.default as any).default = os.default;

export default os;
