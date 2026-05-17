import geoip from 'geoip-lite';

const geo = geoip.lookup('113.170.171.241');
console.log(geo);