'use strict';
function toDisplayMessage(msg) {
  if (msg.retain === true) return null;
  let data = msg.payload;
  if (typeof data === 'string') {
    if (data.length > 1024) return null;
    try { data = JSON.parse(data); } catch (_) { return null; }
  }
  const temperature = typeof data === 'number' ? data :
    data && data.valid === true && data.unit === 'C' ? data.value : null;
  if (typeof temperature !== 'number' || !Number.isFinite(temperature) ||
      temperature < -40 || temperature > 100) return null;
  // Only this numeric argument reaches exec; discard unrelated message fields.
  return {payload: temperature.toFixed(1)};
}
module.exports = {toDisplayMessage};
