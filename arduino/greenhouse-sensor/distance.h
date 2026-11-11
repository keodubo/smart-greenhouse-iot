#pragma once
#include <math.h>
// Approximate speed of sound: 0.034 cm/us; pulse measures the round trip.
inline float distanceCm(unsigned long durationUs) {
  const float cm = durationUs * 0.034f / 2.0f;
  return durationUs == 0 || cm < 2.0f || cm > 400.0f ? NAN : cm;
}
