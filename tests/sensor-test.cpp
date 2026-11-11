#include "../arduino/greenhouse-sensor/distance.h"
#include <cassert>
#include <cmath>
int main() {
  assert(std::isnan(distanceCm(0)));
  assert(std::isnan(distanceCm(50)));
  assert(std::fabs(distanceCm(1000) - 17.0f) < 0.01f);
  assert(std::fabs(distanceCm(10000) - 170.0f) < 0.01f);
  assert(std::isnan(distanceCm(30000)));
}
