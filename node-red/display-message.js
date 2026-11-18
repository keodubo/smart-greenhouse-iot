'use strict';
function toDisplayMessage(msg) {
  if (msg.retain === true) return null;
  let data = msg.payload;
  if (typeof data === 'string') {
    if (data.length > 1024) return null;
    try { data = JSON.parse(data); } catch (_) { return null; }
  }
  const humidity = msg.topic === "IIoT/grupo99/humedad";
  const unit = humidity ? "percent" : "C";
  const value = typeof data === 'number' ? data :
    data && data.valid === true && data.unit === unit ? data.value : null;
  if (typeof value !== 'number' || !Number.isFinite(value) ||
      value < (humidity ? 0 : -40) || value > 100) return null;
  // Only this numeric argument reaches exec; discard unrelated message fields.
  return {payload: value.toFixed(1)};
}
module.exports = {toDisplayMessage};
