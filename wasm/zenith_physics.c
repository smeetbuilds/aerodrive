double zenith_clamp(double value, double min, double max) {
  return value < min ? min : value > max ? max : value;
}

extern double sin(double);
extern double atan(double);

__attribute__((export_name("zenith_core_version")))
int zenith_core_version(void) {
  return 3;
}

__attribute__((export_name("zenith_pacejka")))
double zenith_pacejka(double slip, double surface_grip) {
  double x = zenith_clamp(slip, -1.4, 1.4);
  double b = 10.8;
  double c = 1.86;
  double e = 0.97;
  return surface_grip * sin(c * atan(b * x - e * (b * x - atan(b * x))));
}

__attribute__((export_name("zenith_engine_torque")))
double zenith_engine_torque(double rpm) {
  double idle = 850.0;
  double redline = 7800.0;
  double n = zenith_clamp((rpm - idle) / (redline - idle), 0.0, 1.0);
  double falloff = n > 0.72 ? 1.0 - (n - 0.72) * 0.82 : 1.0;
  double safe_falloff = falloff > 0.58 ? falloff : 0.58;
  return 365.0 * (0.48 + n * 0.52) * safe_falloff;
}
